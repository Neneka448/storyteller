type AgentEventDelta = { streamId: string; delta: string }
type AgentEventDone = { streamId: string }
type AgentEventError = { streamId: string; error: string }
type AgentToolCall = { streamId: string; name: string; args: any }

export type MainAgentClient = {
    start: (payload: {
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    }) => Promise<string>
    cancel: (streamId: string) => void
    onDelta: (handler: (e: AgentEventDelta) => void) => () => void
    onDone: (handler: (e: AgentEventDone) => void) => () => void
    onError: (handler: (e: AgentEventError) => void) => () => void
    onToolCall: (handler: (e: AgentToolCall) => void) => () => void
}

export function getMainAgentClient(): MainAgentClient | null {
    const agent = window.storyteller?.agent
    if (!agent?.start || !agent?.onDelta || !agent?.onDone || !agent?.onError || !agent?.onToolCall) return null

    return agent as any
}
