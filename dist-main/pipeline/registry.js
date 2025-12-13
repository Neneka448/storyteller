"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPipelineRegistry = void 0;
class InMemoryPipelineRegistry {
    byId = new Map();
    register(p) {
        this.byId.set(p.definition().id, p);
    }
    get(id) {
        const p = this.byId.get(id);
        if (!p)
            throw new Error(`pipeline not found: ${id}`);
        return p;
    }
    list() {
        return [...this.byId.values()];
    }
}
exports.InMemoryPipelineRegistry = InMemoryPipelineRegistry;
