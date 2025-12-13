import type { CapabilityId, CapabilityRegistry, NodeCapability } from './contracts'

export class InMemoryCapabilityRegistry implements CapabilityRegistry {
    private readonly byId = new Map<CapabilityId, NodeCapability>()
    private readonly factories = new Map<CapabilityId, () => NodeCapability>()
    private readonly toolOwnerByName = new Map<string, CapabilityId>()

    register(capability: NodeCapability): void {
        this.factories.delete(capability.id)
        this.byId.set(capability.id, capability)
        this.indexAgentTools(capability)
    }

    registerFactory(id: CapabilityId, factory: () => NodeCapability): void {
        this.byId.delete(id)
        this.factories.set(id, factory)
    }

    get(id: CapabilityId): NodeCapability | null {
        const cached = this.byId.get(id)
        if (cached) return cached

        const factory = this.factories.get(id)
        if (!factory) return null

        const created = factory()
        if (!created || created.id !== id) {
            throw new Error(`Capability factory returned invalid capability for id=${String(id)}`)
        }

        this.byId.set(id, created)
        this.indexAgentTools(created)
        return created
    }

    list(): NodeCapability[] {
        // list() implies “materialize all” (acceptable for debug/inspection paths)
        for (const id of this.factories.keys()) this.get(id)
        return [...this.byId.values()]
    }

    listIds(): CapabilityId[] {
        return [...new Set([...this.byId.keys(), ...this.factories.keys()])]
    }

    private indexAgentTools(capability: NodeCapability) {
        const agent = capability.agent
        if (!agent) return

        const tools = agent.getTools?.() ?? []
        for (const t of tools) {
            const name = String((t as any)?.name ?? '').trim()
            if (!name) continue

            const existingOwner = this.toolOwnerByName.get(name)
            if (existingOwner && existingOwner !== capability.id) {
                throw new Error(`Duplicate agent tool name: ${name} (capabilities: ${existingOwner}, ${capability.id})`)
            }
            this.toolOwnerByName.set(name, capability.id)
        }
    }
}
