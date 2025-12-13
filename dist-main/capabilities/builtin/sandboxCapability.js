"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSandboxCapability = createSandboxCapability;
const sandboxSchema = {
    type: 'object',
    properties: {
        html: { type: 'string' },
        css: { type: 'string' },
        js: { type: 'string' }
    },
    required: ['html', 'css', 'js']
};
const schemaProvider = {
    defaultData: { html: '', css: '', js: '' },
    validate(data) {
        const d = data;
        return Boolean(d && typeof d === 'object' && typeof d.html === 'string' && typeof d.css === 'string' && typeof d.js === 'string');
    },
    getJsonSchema() {
        return sandboxSchema;
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
class SandboxAgentTools {
    getTools() {
        return [
            {
                name: 'sandboxSave',
                description: 'Save sandbox renderer code (html/css/js) for a node and adopt it by default.',
                schema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'string', description: 'Optional; defaults to active project' },
                        nodeId: { type: 'string' },
                        html: { type: 'string' },
                        css: { type: 'string' },
                        js: { type: 'string' },
                        adopt: { type: 'boolean', default: true }
                    },
                    required: ['nodeId', 'html', 'css', 'js']
                }
            }
        ];
    }
    async invokeTool(toolName, args, ctx) {
        if (toolName !== 'sandboxSave')
            throw new Error('Unknown tool');
        const data = {
            html: String(args?.html ?? ''),
            css: String(args?.css ?? ''),
            js: String(args?.js ?? '')
        };
        if (!schemaProvider.validate(data))
            throw new Error('Invalid sandbox payload');
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
function createSandboxCapability() {
    return {
        id: 'sandbox',
        schema: schemaProvider,
        render: { componentName: 'SandboxPanel' },
        agent: new SandboxAgentTools(),
        operation: {
            async execute(operation, args, currentData) {
                const base = currentData && typeof currentData === 'object' ? currentData : { html: '', css: '', js: '' };
                if (operation === 'set') {
                    return {
                        html: typeof args?.html === 'string' ? args.html : '',
                        css: typeof args?.css === 'string' ? args.css : '',
                        js: typeof args?.js === 'string' ? args.js : ''
                    };
                }
                if (operation === 'merge') {
                    return {
                        html: typeof args?.html === 'string' ? args.html : String(base.html ?? ''),
                        css: typeof args?.css === 'string' ? args.css : String(base.css ?? ''),
                        js: typeof args?.js === 'string' ? args.js : String(base.js ?? '')
                    };
                }
                throw new Error('Unknown operation');
            }
        },
        onMount(_ctx) { }
    };
}
