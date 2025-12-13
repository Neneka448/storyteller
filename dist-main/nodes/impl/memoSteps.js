"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyframesMemoNode = exports.CharacterImageMemoNode = exports.StoryboardMemoNode = exports.ScriptMemoNode = exports.OutlineMemoNode = exports.CharacterMemoNode = exports.WorldMemoNode = void 0;
class BaseMemoStepNode {
    artifactRepo;
    kind = 'memo';
    ui;
    constructor(artifactRepo, ui) {
        this.artifactRepo = artifactRepo;
        this.ui = ui;
    }
    seed(ctx) {
        this.artifactRepo.ensureTextArtifactSeeded(ctx.projectId, ctx.stepId);
    }
    async run(ctx, input) {
        const direct = typeof input?.contentText === 'string' ? input.contentText : null;
        if (direct != null) {
            return { kind: 'memo', contentText: direct };
        }
        const instruction = String(input?.instruction ?? '').trim();
        if (!instruction) {
            // 没有指令时：返回当前采纳版本（相当于 no-op）
            const adopted = ctx.memoStore.getAdopted(ctx.projectId, ctx.stepId);
            return { kind: 'memo', contentText: adopted?.contentText ?? '' };
        }
        const baseVersionId = typeof input?.baseVersionId === 'string'
            ? input.baseVersionId
            : typeof ctx.baseVersionId === 'string'
                ? ctx.baseVersionId
                : '';
        const baseline = baseVersionId
            ? ctx.memoStore.getVersionById(ctx.projectId, ctx.stepId, baseVersionId)
            : ctx.memoStore.getAdopted(ctx.projectId, ctx.stepId);
        const prev = (baseline?.contentText ?? '').trim();
        const system = '你是一个严谨的影视/图文创作助手。你将根据用户要求生成并更新某一步的完整文本产物。\n' +
            '输出要求：只输出最终的完整内容，不要输出解释。尽量结构化（标题/要点/列表），便于后续版本对比与局部改写。';
        const user = `步骤：${ctx.title}（${ctx.stepId}）\n` +
            (prev ? `已有版本：\n${prev}\n\n` : '') +
            `用户要求：\n${instruction}\n\n` +
            '请给出更新后的完整内容：';
        const contentText = await ctx.llm.generateText({ system, user });
        return { kind: 'memo', contentText: String(contentText ?? '') };
    }
}
const MEMO_ONLY = { blocks: [{ type: 'memo', title: '备忘录（版本）' }] };
const MEMO_PLUS_SANDBOX = {
    blocks: [
        { type: 'memo', title: '备忘录（版本）' },
        { type: 'sandbox', title: '节点沙箱（HTML / CSS / JS）' }
    ]
};
class WorldMemoNode extends BaseMemoStepNode {
    type = 'memo.world';
    constructor(artifactRepo) {
        super(artifactRepo, MEMO_ONLY);
    }
}
exports.WorldMemoNode = WorldMemoNode;
class CharacterMemoNode extends BaseMemoStepNode {
    type = 'memo.character';
    constructor(artifactRepo) {
        super(artifactRepo, MEMO_ONLY);
    }
}
exports.CharacterMemoNode = CharacterMemoNode;
class OutlineMemoNode extends BaseMemoStepNode {
    type = 'memo.outline';
    constructor(artifactRepo) {
        super(artifactRepo, MEMO_ONLY);
    }
}
exports.OutlineMemoNode = OutlineMemoNode;
class ScriptMemoNode extends BaseMemoStepNode {
    type = 'memo.script';
    constructor(artifactRepo) {
        super(artifactRepo, MEMO_ONLY);
    }
}
exports.ScriptMemoNode = ScriptMemoNode;
class StoryboardMemoNode extends BaseMemoStepNode {
    type = 'memo.storyboard';
    constructor(artifactRepo) {
        super(artifactRepo, MEMO_PLUS_SANDBOX);
    }
}
exports.StoryboardMemoNode = StoryboardMemoNode;
class CharacterImageMemoNode extends BaseMemoStepNode {
    type = 'memo.char_image';
    constructor(artifactRepo) {
        super(artifactRepo, MEMO_ONLY);
    }
}
exports.CharacterImageMemoNode = CharacterImageMemoNode;
class KeyframesMemoNode extends BaseMemoStepNode {
    type = 'memo.keyframes';
    constructor(artifactRepo) {
        super(artifactRepo, MEMO_ONLY);
    }
}
exports.KeyframesMemoNode = KeyframesMemoNode;
