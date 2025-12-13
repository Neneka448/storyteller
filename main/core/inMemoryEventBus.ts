import type { EventBus, Unsubscribe } from './contracts'

export class InMemoryEventBus implements EventBus {
    private readonly handlers = new Map<string, Set<(payload: any) => void>>()

    emit<T>(event: string, payload: T): void {
        const set = this.handlers.get(event)
        if (!set || set.size === 0) return
        for (const h of set) h(payload)
    }

    on<T>(event: string, handler: (payload: T) => void): Unsubscribe {
        const set = this.handlers.get(event) ?? new Set()
        set.add(handler as any)
        this.handlers.set(event, set)

        return () => {
            const current = this.handlers.get(event)
            if (!current) return
            current.delete(handler as any)
            if (current.size === 0) this.handlers.delete(event)
        }
    }
}
