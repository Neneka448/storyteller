"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEventBus = void 0;
class InMemoryEventBus {
    handlers = new Map();
    emit(event, payload) {
        const set = this.handlers.get(event);
        if (!set || set.size === 0)
            return;
        for (const h of set)
            h(payload);
    }
    on(event, handler) {
        const set = this.handlers.get(event) ?? new Set();
        set.add(handler);
        this.handlers.set(event, set);
        return () => {
            const current = this.handlers.get(event);
            if (!current)
                return;
            current.delete(handler);
            if (current.size === 0)
                this.handlers.delete(event);
        };
    }
}
exports.InMemoryEventBus = InMemoryEventBus;
