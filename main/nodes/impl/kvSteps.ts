import type { ArtifactRepo } from '../../services/artifactRepo'
import type { NodeHandler, NodeRunContext, NodeRunInput, NodeSeedContext, NodeUiSpec } from '../contracts'

function asKvModel(input: any): { items: Array<{ k: string; v: string }> } {
    if (input && Array.isArray(input.items)) {
        return {
            items: input.items
                .map((x: any) => ({ k: String(x?.k ?? ''), v: String(x?.v ?? '') }))
                .filter((x: any) => x.k.trim() !== '')
        }
    }

    // 兼容对象形态：{ a: 'b' }
    if (input && typeof input === 'object' && !Array.isArray(input)) {
        const entries = Object.entries(input)
            .map(([k, v]) => ({ k: String(k), v: typeof v === 'string' ? v : JSON.stringify(v) }))
            .filter((x) => x.k.trim() !== '')
        return { items: entries }
    }

    return { items: [] }
}

function extractJsonBestEffort(text: string): any {
    const s = String(text ?? '').trim()
    if (!s) return null
    try {
        return JSON.parse(s)
    } catch {
        const i = s.indexOf('{')
        const j = s.lastIndexOf('}')
        if (i >= 0 && j > i) {
            const sub = s.slice(i, j + 1)
            try {
                return JSON.parse(sub)
            } catch {
                return null
            }
        }
        return null
    }
}

abstract class BaseKvStepNode implements NodeHandler {
    kind = 'kv' as const
    abstract type: string
    ui: NodeUiSpec

    constructor(protected readonly artifactRepo: ArtifactRepo, ui: NodeUiSpec) {
        this.ui = ui
    }

    seed(ctx: NodeSeedContext) {
        this.artifactRepo.ensureJsonArtifactSeeded(ctx.projectId, ctx.stepId, { items: [] })
    }

    async run(ctx: NodeRunContext, input: NodeRunInput): Promise<{ kind: 'kv'; contentJson: any }> {
        if (input?.contentJson != null) {
            return { kind: 'kv', contentJson: asKvModel(input.contentJson) }
        }

        const instruction = String(input?.instruction ?? '').trim()
        if (!instruction) {
            const adopted = ctx.memoStore.getAdopted(ctx.projectId, ctx.stepId)
            return { kind: 'kv', contentJson: asKvModel(adopted?.contentJson) }
        }

        const baseVersionId =
            typeof input?.baseVersionId === 'string'
                ? input.baseVersionId
                : typeof ctx.baseVersionId === 'string'
                    ? ctx.baseVersionId
                    : ''

        const baseline = baseVersionId
            ? ctx.memoStore.getVersionById(ctx.projectId, ctx.stepId, baseVersionId)
            : ctx.memoStore.getAdopted(ctx.projectId, ctx.stepId)

        const prev = asKvModel(baseline?.contentJson)

        const system =
            '你是一个严谨的世界观/设定编辑助手。你将把信息整理为稳定的键值词典（KV）。\n' +
            '输出要求：只输出 JSON，不要输出解释或 Markdown。JSON 结构必须是：{ "items": [{"k":"...","v":"..."}] }\n' +
            '要求：k 简短唯一；v 可用多行文本；尽量覆盖用户提到的信息与关键设定。'

        const user =
            `步骤：${ctx.title}（${ctx.stepId}）\n` +
            `现有 KV：\n${JSON.stringify(prev, null, 2)}\n\n` +
            `用户要求：\n${instruction}\n\n` +
            '请输出更新后的 JSON：'

        const text = await ctx.llm.generateText({ system, user })
        const json = extractJsonBestEffort(text)

        return { kind: 'kv', contentJson: asKvModel(json) }
    }
}

const KV_ONLY: NodeUiSpec = { blocks: [{ type: 'kv', title: '设定词典（KV）' }] }

export class WorldKvNode extends BaseKvStepNode {
    type = 'kv.world'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, KV_ONLY)
    }
}

export class WorldKvSectionNode extends BaseKvStepNode {
    type: string
    constructor(
        artifactRepo: ArtifactRepo,
        args: {
            type: string
            sectionTitle: string
        }
    ) {
        super(artifactRepo, { blocks: [{ type: 'kv', title: args.sectionTitle }] })
        this.type = args.type
    }
}

export class CharacterKvNode extends BaseKvStepNode {
    type = 'kv.character'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, KV_ONLY)
    }
}
