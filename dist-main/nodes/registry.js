"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryNodeRegistry = void 0;
class InMemoryNodeRegistry {
    byType = new Map();
    register(h) {
        this.byType.set(h.type, h);
    }
    get(type) {
        const h = this.byType.get(type);
        if (!h)
            throw new Error(`node handler not found: ${type}`);
        return h;
    }
    list() {
        return [...this.byType.values()];
    }
}
exports.InMemoryNodeRegistry = InMemoryNodeRegistry;
