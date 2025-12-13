"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoryboardCapability = createStoryboardCapability;
const storyboardSchema = {
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
};
const schemaProvider = {
    defaultData: { shots: [] },
    validate(data) {
        if (!data || typeof data !== 'object')
            return false;
        const shots = data.shots;
        if (!Array.isArray(shots))
            return false;
        return shots.every((s) => s && typeof s === 'object' && typeof s.shot === 'string');
    },
    getJsonSchema() {
        return storyboardSchema;
    }
};
function createStoryboardCapability() {
    return {
        id: 'storyboard',
        schema: schemaProvider,
        render: { componentName: 'StoryboardPanel' },
        operation: {
            async execute(operation, args) {
                if (operation !== 'setShots')
                    throw new Error('Unknown operation');
                const shots = Array.isArray(args?.shots) ? args.shots : [];
                return {
                    shots: shots
                        .map((s) => ({
                        shot: String(s?.shot ?? ''),
                        size: s?.size != null ? String(s.size) : undefined,
                        frame: s?.frame != null ? String(s.frame) : undefined
                    }))
                        .filter((s) => s.shot)
                };
            }
        },
        onMount(_ctx) { }
    };
}
