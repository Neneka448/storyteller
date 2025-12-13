import type { CapabilityContext, JsonSchema, NodeCapability, SchemaProvider } from '../../core'

type StoryboardData = {
    shots: Array<{
        shot: string
        size?: string
        frame?: string
    }>
}

const storyboardSchema: JsonSchema = {
    type: 'object',
    properties: {
        shots: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    shot: { type: 'string' },
                    size: { type: 'string' },
                    frame: { type: 'string' }
                },
                required: ['shot']
            }
        }
    },
    required: ['shots']
}

const schemaProvider: SchemaProvider<StoryboardData> = {
    defaultData: { shots: [] },
    validate(data: unknown) {
        if (!data || typeof data !== 'object') return false
        const shots = (data as any).shots
        if (!Array.isArray(shots)) return false
        return shots.every((s) => s && typeof s === 'object' && typeof (s as any).shot === 'string')
    },
    getJsonSchema() {
        return storyboardSchema
    }
}

export function createStoryboardCapability(): NodeCapability<StoryboardData> {
    return {
        id: 'storyboard',
        schema: schemaProvider,
        render: { componentName: 'StoryboardPanel' },
        operation: {
            async execute(operation: string, args: any): Promise<StoryboardData> {
                if (operation !== 'setShots') throw new Error('Unknown operation')
                const shots = Array.isArray(args?.shots) ? args.shots : []
                return {
                    shots: shots
                        .map((s: any) => ({
                            shot: String(s?.shot ?? ''),
                            size: s?.size != null ? String(s.size) : undefined,
                            frame: s?.frame != null ? String(s.frame) : undefined
                        }))
                        .filter((s: any) => s.shot)
                }
            }
        },
        onMount(_ctx: CapabilityContext) { }
    }
}
