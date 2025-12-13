import type { NodeHandler, NodeRegistry } from './contracts'

export class InMemoryNodeRegistry implements NodeRegistry {
    private readonly byType = new Map<string, NodeHandler>()

    register(h: NodeHandler) {
        this.byType.set(h.type, h)
    }

    get(type: string): NodeHandler {
        const h = this.byType.get(type)
        if (!h) throw new Error(`node handler not found: ${type}`)
        return h
    }

    list(): NodeHandler[] {
        return [...this.byType.values()]
    }
}
