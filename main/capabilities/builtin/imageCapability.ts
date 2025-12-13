import type {
    CapabilityContext,
    JsonSchema,
    NodeCapability,
    SchemaProvider
} from '../../core'

type ImageData = string

const imageSchema: JsonSchema = {
    type: 'string',
    description: 'Image URL (http/https/data/blob/file).',
    format: 'uri'
}

const schemaProvider: SchemaProvider<ImageData> = {
    defaultData: '',
    validate(data: unknown) {
        return typeof data === 'string'
    },
    getJsonSchema() {
        return imageSchema
    }
}

export function createImageCapability(): NodeCapability<ImageData> {
    return {
        id: 'image',
        schema: schemaProvider,
        render: { componentName: 'ImagePanel' },
        operation: {
            async execute(operation: string, args: any): Promise<ImageData> {
                if (operation !== 'setUrl') throw new Error('Unknown operation')
                const url = String(args?.url ?? '').trim()
                if (!url) throw new Error('url is required')
                return url
            }
        },
        onMount(_ctx: CapabilityContext) { }
    }
}
