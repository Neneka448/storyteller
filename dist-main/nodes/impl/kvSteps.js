"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharacterKvNode = exports.WorldKvSectionNode = exports.WorldKvNode = void 0;
function asKvModel(input) {
    if (input && Array.isArray(input.items)) {
        return {
            items: input.items
                .map((x) => ({ k: String(x?.k ?? ''), v: String(x?.v ?? '') }))
                .filter((x) => x.k.trim() !== '')
        };
    }
    // 兼容对象形态：{ a: 'b' }
    if (input && typeof input === 'object' && !Array.isArray(input)) {
        const entries = Object.entries(input)
            .map(([k, v]) => ({ k: String(k), v: typeof v === 'string' ? v : JSON.stringify(v) }))
            .filter((x) => x.k.trim() !== '');
        return { items: entries };
    }
    return { items: [] };
}
function extractJsonBestEffort(text) {
    const s = String(text ?? '').trim();
    if (!s)
        return null;
    try {
        return JSON.parse(s);
    }
    catch {
        const i = s.indexOf('{');
        const j = s.lastIndexOf('}');
        if (i >= 0 && j > i) {
            const sub = s.slice(i, j + 1);
            try {
                return JSON.parse(sub);
            }
            catch {
                return null;
            }
        }
        return null;
    }
}
class BaseKvStepNode {
    artifactRepo;
    kind = 'kv';
    ui;
    constructor(artifactRepo, ui) {
        this.artifactRepo = artifactRepo;
        this.ui = ui;
    }
    seed(ctx) {
        this.artifactRepo.ensureJsonArtifactSeeded(ctx.projectId, ctx.stepId, { items: [] });
    }
    async run(ctx, input) {
        if (input?.contentJson != null) {
            return { kind: 'kv', contentJson: asKvModel(input.contentJson) };
        }
        const instruction = String(input?.instruction ?? '').trim();
        if (!instruction) {
            const adopted = ctx.memoStore.getAdopted(ctx.projectId, ctx.stepId);
            return { kind: 'kv', contentJson: asKvModel(adopted?.contentJson) };
        }
        const baseVersionId = typeof input?.baseVersionId === 'string'
            ? input.baseVersionId
            : typeof ctx.baseVersionId === 'string'
                ? ctx.baseVersionId
                : '';
        const baseline = baseVersionId
            ? ctx.memoStore.getVersionById(ctx.projectId, ctx.stepId, baseVersionId)
            : ctx.memoStore.getAdopted(ctx.projectId, ctx.stepId);
        const prev = asKvModel(baseline?.contentJson);
        const system = '你是一个严谨的世界观/设定编辑助手。你将把信息整理为稳定的键值词典（KV）。\n' +
            '输出要求：只输出 JSON，不要输出解释或 Markdown。JSON 结构必须是：{ "items": [{"k":"...","v":"..."}] }\n' +
            '要求：k 简短唯一；v 可用多行文本；尽量覆盖用户提到的信息与关键设定。';
        const user = `步骤：${ctx.title}（${ctx.stepId}）\n` +
            `现有 KV：\n${JSON.stringify(prev, null, 2)}\n\n` +
            `用户要求：\n${instruction}\n\n` +
            '请输出更新后的 JSON：';
        const text = await ctx.llm.generateText({ system, user });
        const json = extractJsonBestEffort(text);
        return { kind: 'kv', contentJson: asKvModel(json) };
    }
}
const KV_ONLY = { blocks: [{ type: 'kv', title: '设定词典（KV）' }] };
class WorldKvNode extends BaseKvStepNode {
    type = 'kv.world';
    constructor(artifactRepo) {
        super(artifactRepo, KV_ONLY);
    }
}
exports.WorldKvNode = WorldKvNode;
class WorldKvSectionNode extends BaseKvStepNode {
    type;
    constructor(artifactRepo, args) {
        super(artifactRepo, { blocks: [{ type: 'kv', title: args.sectionTitle }] });
        this.type = args.type;
    }
}
exports.WorldKvSectionNode = WorldKvSectionNode;
class CharacterKvNode extends BaseKvStepNode {
    type = 'kv.character';
    constructor(artifactRepo) {
        super(artifactRepo, KV_ONLY);
    }
}
exports.CharacterKvNode = CharacterKvNode;
