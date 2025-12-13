"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoCapability = createMemoCapability;
const memoSchema = { type: 'string', description: 'Memo text content' };
const schemaProvider = {
    defaultData: '',
    validate(data) {
        return typeof data === 'string';
    },
    getJsonSchema() {
        return memoSchema;
    }
};
function assertNodeHasCapability(ctx) {
    return ctx.nodeTree.getById({ projectId: ctx.projectId, nodeId: ctx.nodeId }).then((node) => {
        if (!node)
            throw new Error('Node not found');
        if (!Array.isArray(node.capabilities) || !node.capabilities.includes(ctx.capabilityId)) {
            throw new Error(`Node ${ctx.nodeId} does not have capability ${ctx.capabilityId}`);
        }
        return node;
    });
}
class MemoAgentTools {
    getTools() {
        return [
            {
                name: 'memoSave',
                description: 'Save memo text for a node (append new version and adopt it by default).',
                schema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'Optional; defaults to active project' },
                        nodeId: { type: 'string' },
                        contentText: { type: 'string' },
                        adopt: { type: 'boolean', default: true }
                    },
                    required: ['nodeId', 'contentText']
                }
            }
        ];
    }
    async invokeTool(toolName, args, ctx) {
        if (toolName !== 'memoSave')
            throw new Error('Unknown tool');
        const contentText = typeof args?.contentText === 'string' ? args.contentText : '';
        if (!contentText)
            throw new Error('contentText is required');
        await assertNodeHasCapability(ctx);
        const created = await ctx.artifacts.appendVersion({
            projectId: ctx.projectId,
            nodeId: ctx.nodeId,
            capabilityId: ctx.capabilityId,
            contentType: 'text',
            contentText,
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
function createMemoCapability() {
    return {
        id: 'memo',
        schema: schemaProvider,
        render: { componentName: 'MemoPanel' },
        agent: new MemoAgentTools(),
        operation: {
            async execute(operation, args, currentData) {
                if (operation === 'set') {
                    const text = typeof args?.contentText === 'string' ? args.contentText : '';
                    return text;
                }
                if (operation === 'append') {
                    const add = typeof args?.delta === 'string' ? args.delta : '';
                    const base = typeof currentData === 'string' ? currentData : '';
                    return base + add;
                }
                throw new Error('Unknown operation');
            }
        },
        onMount(_ctx) { }
    };
}
