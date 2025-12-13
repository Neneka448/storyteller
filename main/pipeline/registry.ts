import type { Pipeline, PipelineRegistry } from './contracts'

export class InMemoryPipelineRegistry implements PipelineRegistry {
    private readonly byId = new Map<string, Pipeline>()

    register(p: Pipeline) {
        this.byId.set(p.definition().id, p)
    }

    get(id: string): Pipeline {
        const p = this.byId.get(id)
        if (!p) throw new Error(`pipeline not found: ${id}`)
        return p
    }

    list(): Pipeline[] {
        return [...this.byId.values()]
    }
}
