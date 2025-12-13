import type { ArtifactRepo } from '../../services/artifactRepo'
import type { NodeHandler, NodeRunContext, NodeRunInput, NodeSeedContext, NodeUiSpec } from '../contracts'

abstract class BaseMemoStepNode implements NodeHandler {
    kind = 'memo' as const
    abstract type: string
    ui: NodeUiSpec

    constructor(protected readonly artifactRepo: ArtifactRepo, ui: NodeUiSpec) {
        this.ui = ui
    }

    seed(ctx: NodeSeedContext) {
        this.artifactRepo.ensureTextArtifactSeeded(ctx.projectId, ctx.stepId)
    }

    async run(ctx: NodeRunContext, input: NodeRunInput): Promise<{ kind: 'memo'; contentText: string }> {
        const direct = typeof input?.contentText === 'string' ? input.contentText : null
        if (direct != null) {
            return { kind: 'memo', contentText: direct }
        }

        const instruction = String(input?.instruction ?? '').trim()
        if (!instruction) {
            // 没有指令时：返回当前采纳版本（相当于 no-op）
            const adopted = ctx.memoStore.getAdopted(ctx.projectId, ctx.stepId)
            return { kind: 'memo', contentText: adopted?.contentText ?? '' }
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
        const prev = (baseline?.contentText ?? '').trim()

        const system =
            '你是一个严谨的影视/图文创作助手。你将根据用户要求生成并更新某一步的完整文本产物。\n' +
            '输出要求：只输出最终的完整内容，不要输出解释。尽量结构化（标题/要点/列表），便于后续版本对比与局部改写。'

        const user =
            `步骤：${ctx.title}（${ctx.stepId}）\n` +
            (prev ? `已有版本：\n${prev}\n\n` : '') +
            `用户要求：\n${instruction}\n\n` +
            '请给出更新后的完整内容：'

        const contentText = await ctx.llm.generateText({ system, user })
        return { kind: 'memo', contentText: String(contentText ?? '') }
    }
}

const MEMO_ONLY: NodeUiSpec = { blocks: [{ type: 'memo', title: '备忘录（版本）' }] }
const MEMO_PLUS_SANDBOX: NodeUiSpec = {
    blocks: [
        { type: 'memo', title: '备忘录（版本）' },
        { type: 'sandbox', title: '节点沙箱（HTML / CSS / JS）' }
    ]
}

export class WorldMemoNode extends BaseMemoStepNode {
    type = 'memo.world'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, MEMO_ONLY)
    }
}

export class CharacterMemoNode extends BaseMemoStepNode {
    type = 'memo.character'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, MEMO_ONLY)
    }
}

export class OutlineMemoNode extends BaseMemoStepNode {
    type = 'memo.outline'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, MEMO_ONLY)
    }
}

export class ScriptMemoNode extends BaseMemoStepNode {
    type = 'memo.script'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, MEMO_ONLY)
    }
}

export class StoryboardMemoNode extends BaseMemoStepNode {
    type = 'memo.storyboard'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, MEMO_PLUS_SANDBOX)
    }
}

export class CharacterImageMemoNode extends BaseMemoStepNode {
    type = 'memo.char_image'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, MEMO_ONLY)
    }
}

export class KeyframesMemoNode extends BaseMemoStepNode {
    type = 'memo.keyframes'
    constructor(artifactRepo: ArtifactRepo) {
        super(artifactRepo, MEMO_ONLY)
    }
}
