import type { NodeRegistry } from '../nodes/contracts'
import type { PipelineRegistry } from './contracts'
import type { MemoStore } from '../memo/memoStore'
import type { ProjectService } from '../services/projectService'
import type { LlmService } from '../services/llmService'
import type { RunRepo } from '../services/runRepo'
import { getDb } from '../db/sqlite'

export class PipelineRunner {
    constructor(
        private readonly deps: {
            userDataPath: string
            projectService: ProjectService
            pipelineRegistry: PipelineRegistry
            nodeRegistry: NodeRegistry
            memoStore: MemoStore
            llm: LlmService
            runRepo: RunRepo
            defaultPipelineId: string
        }
    ) { }

    private updateStep(projectId: string, stepId: string, patch: { status?: string; artifactSummary?: string }) {
        const db = getDb({ userDataPath: this.deps.userDataPath })
        const sets: string[] = []
        const params: any[] = []
        if (patch.status != null) {
            sets.push('status = ?')
            params.push(patch.status)
        }
        if (patch.artifactSummary != null) {
            sets.push('artifact_summary = ?')
            params.push(patch.artifactSummary)
        }
        sets.push('updated_at = ?')
        params.push(Date.now())
        params.push(projectId, stepId)

        db.prepare(`UPDATE steps SET ${sets.join(', ')} WHERE project_id = ? AND step_id = ?`).run(...params)
    }

    getActiveProjectId(): string | null {
        const id = this.deps.projectService.getActiveProjectId()
        if (!id) return null
        const trimmed = String(id).trim()
        return trimmed ? trimmed : null
    }

    /**
     * 备忘录型 step：保存新版本并采纳。
     * 这是后续“LLM function call 改写某一步”的最小稳定动作。
     */
    saveMemo(args: { projectId?: string; stepId: string; contentText: string }) {
        const projectId = String(args.projectId || this.getActiveProjectId() || '')
        if (!projectId) throw new Error('missing projectId (no active project)')

        const stepId = String(args.stepId || '').trim()
        if (!stepId) throw new Error('missing stepId')

        const pipeline = this.deps.pipelineRegistry.get(this.deps.defaultPipelineId).definition()
        const step = pipeline.steps.find((s) => s.stepId === stepId)
        if (!step) throw new Error(`unknown stepId: ${stepId}`)

        if (step.node.kind !== 'memo') {
            throw new Error(`step ${stepId} is not memo node (${step.node.kind})`)
        }

        const created = this.deps.memoStore.appendTextVersion(projectId, stepId, String(args.contentText ?? ''))
        this.deps.memoStore.adoptVersion(projectId, stepId, created.id)

        this.updateStep(projectId, stepId, {
            status: 'succeeded',
            artifactSummary: `已采纳 v${created.versionIndex}`
        })

        return { ok: true as const, projectId, stepId, versionId: created.id, versionIndex: created.versionIndex }
    }

    async runStep(args: {
        projectId?: string
        stepId: string
        mode?: 'run' | 'redo'
        baseVersionId?: string
        instruction?: string
        contentText?: string
        contentJson?: any
    }) {
        const projectId = String(args.projectId || this.getActiveProjectId() || '')
        if (!projectId) throw new Error('missing projectId (no active project)')

        const stepId = String(args.stepId || '').trim()
        if (!stepId) throw new Error('missing stepId')

        const pipeline = this.deps.pipelineRegistry.get(this.deps.defaultPipelineId).definition()
        const step = pipeline.steps.find((s) => s.stepId === stepId)
        if (!step) throw new Error(`unknown stepId: ${stepId}`)

        const mode = args.mode === 'redo' ? 'redo' : 'run'
        const baseVersionId = typeof args.baseVersionId === 'string' ? String(args.baseVersionId) : undefined

        const runId = this.deps.runRepo.createRun({
            projectId,
            kind: mode === 'redo' ? 'node.redo' : 'node.run',
            inputJson: {
                stepId,
                nodeType: step.node.type,
                mode,
                baseVersionId,
                instruction: args.instruction,
                contentTextPreview: typeof args.contentText === 'string' ? args.contentText.slice(0, 120) : undefined,
                contentJsonItemsCount:
                    args.contentJson && Array.isArray(args.contentJson.items) ? Number(args.contentJson.items.length) : undefined
            }
        })

        this.deps.runRepo.addEvent({
            runId,
            type: mode === 'redo' ? 'node.redo.start' : 'node.run.start',
            payloadJson: { stepId, nodeType: step.node.type, mode, baseVersionId }
        })
        this.updateStep(projectId, stepId, { status: 'running' })

        try {
            const result = await step.node.run(
                {
                    runId,
                    projectId,
                    stepId,
                    title: step.title,
                    memoStore: this.deps.memoStore,
                    llm: this.deps.llm,
                    baseVersionId
                },
                { mode, baseVersionId, instruction: args.instruction, contentText: args.contentText, contentJson: args.contentJson },
                step.params
            )

            if (result.kind === 'memo') {
                const created = this.deps.memoStore.appendTextVersion(projectId, stepId, result.contentText)
                this.deps.memoStore.adoptVersion(projectId, stepId, created.id)
                this.updateStep(projectId, stepId, { status: 'succeeded', artifactSummary: `已采纳 v${created.versionIndex}` })
                this.deps.runRepo.addEvent({
                    runId,
                    type: mode === 'redo' ? 'node.redo.succeeded' : 'node.run.succeeded',
                    payloadJson: {
                        stepId,
                        nodeType: step.node.type,
                        mode,
                        baseVersionId,
                        versionId: created.id,
                        versionIndex: created.versionIndex
                    }
                })
                this.deps.runRepo.setRunStatus({ runId, status: 'succeeded' })
                return { ok: true as const, runId, projectId, stepId, versionId: created.id, versionIndex: created.versionIndex }
            }

            if (result.kind === 'kv') {
                const created = this.deps.memoStore.appendJsonVersion(projectId, stepId, result.contentJson)
                this.deps.memoStore.adoptVersion(projectId, stepId, created.id)

                const count = Array.isArray(created.contentJson?.items) ? created.contentJson.items.length : 0
                this.updateStep(projectId, stepId, {
                    status: 'succeeded',
                    artifactSummary: `已采纳 v${created.versionIndex}（${count} 项）`
                })

                this.deps.runRepo.addEvent({
                    runId,
                    type: mode === 'redo' ? 'node.redo.succeeded' : 'node.run.succeeded',
                    payloadJson: {
                        stepId,
                        nodeType: step.node.type,
                        mode,
                        baseVersionId,
                        versionId: created.id,
                        versionIndex: created.versionIndex,
                        kind: 'kv',
                        itemsCount: count
                    }
                })
                this.deps.runRepo.setRunStatus({ runId, status: 'succeeded' })
                return { ok: true as const, runId, projectId, stepId, versionId: created.id, versionIndex: created.versionIndex }
            }

            throw new Error(`unsupported node result kind: ${(result as any)?.kind}`)
        } catch (err) {
            const e = err as any
            const message = e?.stack ? String(e.stack) : String(e?.message || e)
            this.updateStep(projectId, stepId, { status: 'failed', artifactSummary: '失败（见日志）' })
            this.deps.runRepo.addEvent({
                runId,
                type: mode === 'redo' ? 'node.redo.failed' : 'node.run.failed',
                payloadJson: { stepId, nodeType: step.node.type, mode, baseVersionId, error: message }
            })
            this.deps.runRepo.setRunStatus({ runId, status: 'failed', error: message })
            throw err
        }
    }
}
