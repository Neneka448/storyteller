export type Unsubscribe = () => void

export interface EventBus {
    emit<T>(event: string, payload: T): void
    on<T>(event: string, handler: (payload: T) => void): Unsubscribe
}

export type CoreEventName =
    | 'run:start'
    | 'run:succeeded'
    | 'run:failed'
    | 'artifact:appended'
    | 'artifact:adopted'
    | 'data:changed'
    | 'agent:tool.call'
    | 'agent:tool.result'
    | 'agent:tool.error'
