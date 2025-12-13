import type {
    AgentToolDefinition,
    AgentToolProvider,
    CapabilityContext,
    JsonSchema,
    NodeCapability,
    SchemaProvider,
    ToolContext
} from '../../core'

type KvItem = { k: string; v: string }

type KvData = { items: KvItem[] }

const kvSchema: JsonSchema = {
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
}

const schemaProvider: SchemaProvider<KvData> = {
    defaultData: { items: [] },
    validate(data: unknown) {
        const d: any = data
        if (!d || typeof d !== 'object') return false
        if (!Array.isArray(d.items)) return false
        for (const it of d.items) {
            if (!it || typeof it !== 'object') return false
            if (typeof it.k !== 'string') return false
            if (typeof it.v !== 'string') return false
        }
        return true
    },
    getJsonSchema() {
        return kvSchema
    }
}

async function assertNodeHasCapability(ctx: ToolContext) {
    const node = await ctx.nodeTree.getById({ projectId: ctx.projectId, nodeId: ctx.nodeId })
    if (!node) throw new Error('Node not found')
    if (!Array.isArray(node.capabilities) || !node.capabilities.includes(ctx.capabilityId)) {
        throw new Error(`Node ${ctx.nodeId} does not have capability ${ctx.capabilityId}`)
    }
}

class KvAgentTools implements AgentToolProvider {
    getTools(): AgentToolDefinition[] {
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
        ]
    }

    async invokeTool(toolName: string, args: any, ctx: ToolContext): Promise<any> {
        if (toolName !== 'kvSave') throw new Error('Unknown tool')

        const items = Array.isArray(args?.items) ? args.items : null
        if (!items) throw new Error('items is required')

        const data: KvData = {
            items: items
                .map((x: any) => ({ k: String(x?.k ?? '').trim(), v: String(x?.v ?? '') }))
                .filter((x: KvItem) => x.k)
        }

        if (!schemaProvider.validate(data)) throw new Error('Invalid kv payload')

        await assertNodeHasCapability(ctx)

        const created = await ctx.artifacts.appendVersion({
            projectId: ctx.projectId,
            nodeId: ctx.nodeId,
            capabilityId: ctx.capabilityId,
            contentType: 'json',
            contentJson: data,
            meta: { author: 'agent', extra: { toolName } },
            adopt: args?.adopt !== false
        })

        ctx.events.emit('data:changed', {
            ts: Date.now(),
            projectId: ctx.projectId,
            nodeId: ctx.nodeId,
            capabilityId: ctx.capabilityId,
            runId: ctx.runId,
            artifactId: created.artifactId,
            versionId: created.id,
            versionIndex: created.versionIndex
        })

        return { ok: true, version: created }
    }
}

export function createKvCapability(): NodeCapability<KvData> {
    return {
        id: 'kv',
        schema: schemaProvider,
        render: { componentName: 'KvPanel' },
        agent: new KvAgentTools(),
        operation: {
            async execute(operation: string, args: any, currentData: KvData): Promise<KvData> {
                const base: KvData = currentData && typeof currentData === 'object' && Array.isArray((currentData as any).items)
                    ? { items: (currentData as any).items }
                    : { items: [] }

                if (operation === 'setItems') {
                    const items = Array.isArray(args?.items) ? args.items : []
                    return {
                        items: items
                            .map((x: any) => ({ k: String(x?.k ?? '').trim(), v: String(x?.v ?? '') }))
                            .filter((x: any) => x.k)
                    }
                }

                if (operation === 'upsert') {
                    const k = String(args?.k ?? '').trim()
                    if (!k) throw new Error('k is required')
                    const v = String(args?.v ?? '')

                    const next = base.items.filter((x: any) => String(x?.k ?? '') !== k)
                    next.push({ k, v })
                    return { items: next }
                }

                throw new Error('Unknown operation')
            }
        },
        onMount(_ctx: CapabilityContext) { }
    }
}
