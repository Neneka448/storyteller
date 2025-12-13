"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageCapability = createImageCapability;
const imageSchema = {
    type: 'string',
    description: 'Image URL (http/https/data/blob/file).',
    format: 'uri'
};
const schemaProvider = {
    defaultData: '',
    validate(data) {
        return typeof data === 'string';
    },
    getJsonSchema() {
        return imageSchema;
    }
};
function createImageCapability() {
    return {
        id: 'image',
        schema: schemaProvider,
        render: { componentName: 'ImagePanel' },
        operation: {
            async execute(operation, args) {
                if (operation !== 'setUrl')
                    throw new Error('Unknown operation');
                const url = String(args?.url ?? '').trim();
                if (!url)
                    throw new Error('url is required');
                return url;
            }
        },
        onMount(_ctx) { }
    };
}
