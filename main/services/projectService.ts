import { randomUUID } from 'node:crypto'

import { getDb } from '../db/sqlite'
import type { PipelineRegistry } from '../pipeline/contracts'
import type { NodeRegistry } from '../nodes/contracts'

export type ProjectRow = {
    id: string
    name: string
    created_at: number
    updated_at: number
}

export type StepRow = {
    project_id: string
    step_id: string
    title: string
    status: string
    artifact_summary: string
    adopted_artifact_version_id?: string | null
    created_at: number
    updated_at: number
}

function now() {
    return Date.now()
}

export class ProjectService {
    constructor(
        private readonly userDataPath: string,
        private readonly pipelineRegistry: PipelineRegistry,
        private readonly nodeRegistry: NodeRegistry,
        private readonly defaultPipelineId: string
    ) { }

    private db() {
        return getDb({ userDataPath: this.userDataPath })
    }

    listProjects(): Array<{ id: string; name: string; createdAt: number; updatedAt: number }> {
        const rows: ProjectRow[] = this.db()
            .prepare('SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC')
            .all()

        return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at }))
    }

    getActiveProjectId(): string | null {
        const row = this.db().prepare('SELECT value FROM kv WHERE key = ?').get('projects.activeId')
        if (!row?.value) return null
        return String(row.value)
    }

    setActiveProjectId(projectId: string) {
        this.db()
            .prepare(
                'INSERT INTO kv(key, value, updated_at) VALUES(?, ?, ?)\n         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
            )
            .run('projects.activeId', String(projectId), now())
    }

    getProject(projectId: string) {
        const r: ProjectRow | undefined = this.db()
            .prepare('SELECT id, name, created_at, updated_at FROM projects WHERE id = ?')
            .get(projectId)
        if (!r) return null
        return { id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at }
    }

    createProject(name?: string) {
        const id = randomUUID()
        const ts = now()
        const projectName = String(name || '').trim() || `新项目 ${new Date().toLocaleDateString('zh-CN')}`

        const pipeline = this.pipelineRegistry.get(this.defaultPipelineId).definition()

        const db = this.db()
        const tx = db.transaction(() => {
            db.prepare('INSERT INTO projects(id, name, created_at, updated_at) VALUES(?, ?, ?, ?)').run(
                id,
                projectName,
                ts,
                ts
            )

            for (const s of pipeline.steps) {
                db.prepare(
                    'INSERT INTO steps(project_id, step_id, title, status, artifact_summary, adopted_artifact_version_id, created_at, updated_at)\n           VALUES(?, ?, ?, ?, ?, ?, ?, ?)'
                ).run(id, s.stepId, s.title, 'idle', s.initialArtifactSummary, null, ts, ts)

                // 由节点实现决定如何 seed（例如 memo：创建 artifact + 初始版本）
                s.node.seed?.({ projectId: id, stepId: s.stepId, title: s.title }, s.params)
            }

            this.setActiveProjectId(id)
        })

        tx()

        return this.getProject(id)
    }

    deleteProject(projectId: string) {
        const db = this.db()
        const tx = db.transaction(() => {
            db.prepare('DELETE FROM artifact_versions WHERE artifact_id IN (SELECT id FROM artifacts WHERE project_id = ?)').run(
                projectId
            )
            db.prepare('DELETE FROM artifacts WHERE project_id = ?').run(projectId)
            db.prepare('DELETE FROM events WHERE run_id IN (SELECT id FROM runs WHERE project_id = ?)').run(projectId)
            db.prepare('DELETE FROM runs WHERE project_id = ?').run(projectId)
            db.prepare('DELETE FROM steps WHERE project_id = ?').run(projectId)
            db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)

            const active = this.getActiveProjectId()
            if (active === projectId) {
                this.setActiveProjectId('')
            }
        })

        tx()
    }

    listSteps(projectId: string) {
        const pipeline = this.pipelineRegistry.get(this.defaultPipelineId).definition()

        const rows: StepRow[] = this.db()
            .prepare(
                'SELECT project_id, step_id, title, status, artifact_summary, adopted_artifact_version_id, created_at, updated_at\n         FROM steps WHERE project_id = ? ORDER BY created_at ASC'
            )
            .all(projectId)

        return rows.map((r) => ({
            nodeType: pipeline.steps.find((s) => s.stepId === r.step_id)?.node.type ?? null,
            uiBlocks: pipeline.steps.find((s) => s.stepId === r.step_id)?.node.ui.blocks ?? [],
            projectId: r.project_id,
            stepId: r.step_id,
            title: r.title,
            status: r.status,
            artifactSummary: r.artifact_summary,
            adoptedArtifactVersionId: r.adopted_artifact_version_id ?? null,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }))
    }
}
