"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKvCapability = createKvCapability;
const kvSchema = {
    type: 'object',
    properties: {
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    k: { type: 'string' },
                    v: { type: 'string' }
                },
                required: ['k', 'v']
            }
        }
    },
    required: ['items']
};
const schemaProvider = {
    defaultData: { items: [] },
    validate(data) {
        const d = data;
        if (!d || typeof d !== 'object')
            return false;
        if (!Array.isArray(d.items))
            return false;
        for (const it of d.items) {
            if (!it || typeof it !== 'object')
                return false;
            if (typeof it.k !== 'string')
                return false;
            if (typeof it.v !== 'string')
                return false;
        }
        return true;
    },
    getJsonSchema() {
        return kvSchema;
    }
};
async function assertNodeHasCapability(ctx) {
    const node = await ctx.nodeTree.getById({ projectId: ctx.projectId, nodeId: ctx.nodeId });
    if (!node)
        throw new Error('Node not found');
    if (!Array.isArray(node.capabilities) || !node.capabilities.includes(ctx.capabilityId)) {
        throw new Error(`Node ${ctx.nodeId} does not have capability ${ctx.capabilityId}`);
    }
}
class KvAgentTools {
    getTools() {
        return [
            {
                name: 'kvSave',
                description: 'Save KV items for a node (append JSON version and adopt it by default).',
                schema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'Optional; defaults to active project' },
                        nodeId: { type: 'string' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: { k: { type: 'string' }, v: { type: 'string' } },
                                required: ['k', 'v']
                            }
                        },
                        adopt: { type: 'boolean', default: true }
                    },
                    required: ['nodeId', 'items']
                }
            }
        ];
    }
    async invokeTool(toolName, args, ctx) {
        if (toolName !== 'kvSave')
            throw new Error('Unknown tool');
        const items = Array.isArray(args?.items) ? args.items : null;
        if (!items)
            throw new Error('items is required');
        const data = {
            items: items
                .map((x) => ({ k: String(x?.k ?? '').trim(), v: String(x?.v ?? '') }))
                .filter((x) => x.k)
        };
        if (!schemaProvider.validate(data))
            throw new Error('Invalid kv payload');
        await assertNodeHasCapability(ctx);
        const created = await ctx.artifacts.appendVersion({
            projectId: ctx.projectId,
            nodeId: ctx.nodeId,
            capabilityId: ctx.capabilityId,
            contentType: 'json',
            contentJson: data,
            meta: { author: 'agent', extra: { toolName } },
            adopt: args?.adopt !== false
        });
        ctx.events.emit('data:changed', {
            ts: Date.now(),
            projectId: ctx.projectId,
            nodeId: ctx.nodeId,
            capabilityId: ctx.capabilityId,
            runId: ctx.runId,
            artifactId: created.artifactId,
            versionId: created.id,
            versionIndex: created.versionIndex
        });
        return { ok: true, version: created };
    }
}
function createKvCapability() {
    return {
        id: 'kv',
        schema: schemaProvider,
        render: { componentName: 'KvPanel' },
        agent: new KvAgentTools(),
        operation: {
            async execute(operation, args, currentData) {
                const base = currentData && typeof currentData === 'object' && Array.isArray(currentData.items)
                    ? { items: currentData.items }
                    : { items: [] };
                if (operation === 'setItems') {
                    const items = Array.isArray(args?.items) ? args.items : [];
                    return {
                        items: items
                            .map((x) => ({ k: String(x?.k ?? '').trim(), v: String(x?.v ?? '') }))
                            .filter((x) => x.k)
                    };
                }
                if (operation === 'upsert') {
                    const k = String(args?.k ?? '').trim();
                    if (!k)
                        throw new Error('k is required');
                    const v = String(args?.v ?? '');
                    const next = base.items.filter((x) => String(x?.k ?? '') !== k);
                    next.push({ k, v });
                    return { items: next };
                }
                throw new Error('Unknown operation');
            }
        },
        onMount(_ctx) { }
    };
}
