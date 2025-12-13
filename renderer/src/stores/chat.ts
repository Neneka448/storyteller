import { defineStore } from 'pinia'

export type ChatRoom = {
    roomId: string
    roomName: string
    avatar?: string
    users: Array<{
        _id: string
        username: string
        avatar?: string
        status?: {
            state: 'online' | 'offline'
            lastChanged?: string
        }
    }>
    typingUsers: Array<string>
}

export type ChatMessage = {
    _id: string
    content: string
    senderId: string
    username?: string
    timestamp?: string
    date?: string
    system?: boolean
    saved?: boolean
    distributed?: boolean
    seen?: boolean
}

function nowTimestamp(): string {
    const d = new Date()
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

let nextId = 1
function genId(prefix: string) {
    nextId += 1
    return `${prefix}_${Date.now()}_${nextId}`
}

export const useChatStore = defineStore('chat', {
    state: () => ({
        currentUserId: 'human',
        roomId: 'default',
        rooms: [
            {
                roomId: 'default',
                roomName: 'Storyteller',
                users: [
                    { _id: 'human', username: 'You', status: { state: 'online' } },
                    { _id: 'ai', username: 'AI', status: { state: 'online' } }
                ],
                typingUsers: []
            }
        ] as ChatRoom[],
        messagesLoaded: true,
        messages: [
            {
                _id: 'm_welcome',
                content:
                    '我已准备好。你可以描述一个故事意图，或说“注入节点预览”，我会演示流式输出并更新右侧节点渲染。',
                senderId: 'ai',
                username: 'AI',
                timestamp: nowTimestamp(),
                saved: true,
                distributed: true,
                seen: true
            }
        ] as ChatMessage[]
    }),
    actions: {
        addUserMessage(text: string) {
            const msg: ChatMessage = {
                _id: genId('m_user'),
                content: text,
                senderId: this.currentUserId,
                username: 'You',
                timestamp: nowTimestamp(),
                saved: true,
                distributed: true,
                seen: true
            }
            this.messages = [...this.messages, msg]
        },
        addAssistantMessage(initial = ''): string {
            const id = genId('m_ai')
            const msg: ChatMessage = {
                _id: id,
                content: initial,
                senderId: 'ai',
                username: 'AI',
                timestamp: nowTimestamp(),
                saved: true,
                distributed: true,
                seen: true
            }
            this.messages = [...this.messages, msg]
            return id
        },
        startAssistantMessage(): string {
            return this.addAssistantMessage('')
        },
        updateMessage(id: string, content: string) {
            this.messages = this.messages.map((m) => (m._id === id ? { ...m, content } : m))
        },
        appendMessageDelta(id: string, delta: string) {
            const d = String(delta ?? '')
            if (!d) return

            this.messages = this.messages.map((m) =>
                m._id === id ? { ...m, content: (m.content ?? '') + d } : m
            )
        },
        async streamAssistant(text: string, onDone?: () => void) {
            const msgId = this.addAssistantMessage('')
            const chunks = text.split('')
            let acc = ''

            for (let i = 0; i < chunks.length; i += 1) {
                acc += chunks[i]
                this.updateMessage(msgId, acc)
                // 模拟流式
                // eslint-disable-next-line no-await-in-loop
                await new Promise((r) => setTimeout(r, 12))
            }

            onDone?.()
        }
    }
})
