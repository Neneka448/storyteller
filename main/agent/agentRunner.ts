import { ChatOpenAI } from '@langchain/openai'
import { tool } from '@langchain/core/tools'
import {
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
    type BaseMessage
} from '@langchain/core/messages'
import { z } from 'zod'

import { getSettings, resolveBaseURL } from '../db/settingsRepo'
import { getServices } from '../services/serviceContainer'

type AgentMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type RunAgentArgs = {
    userDataPath: string
    webContents: { send: (channel: string, payload: any) => void }
    streamId: string
    messages: AgentMessage[]
    signal: AbortSignal
}

type ToolDef = any

type ToolRegistry = {
    tools: ToolDef[]
    toolByName: Map<string, ToolDef>
}

const DEFAULT_MODEL = 'gpt-4.1-mini'

function normalizeEnvBaseURL(raw: unknown): string {
    const input = String(raw ?? '').trim()
    if (!input) return ''
    try {
        const u = new URL(input)
        return u.toString().replace(/\/$/, '')
    } catch {
        return ''
    }
}

function createModel(opts: { userDataPath: string }) {
    const s = getSettings({ userDataPath: opts.userDataPath })

    const envBaseURL = normalizeEnvBaseURL(process.env.STORYTELLER_LLM_BASE_URL)
    const baseURL = envBaseURL || resolveBaseURL(s)

    const apiKey = (s.apiKey || '').trim() || (process.env.STORYTELLER_LLM_API_KEY || '').trim()
    const model = (s.model || '').trim() || (process.env.STORYTELLER_LLM_MODEL || '').trim() || DEFAULT_MODEL

    return new ChatOpenAI({
        model,
        // OpenAI-compatible：优先 chat-completions
        useResponsesApi: false,
        streaming: true,
        apiKey,
        configuration: { baseURL }
    })
}

function toLangChainMessages(msgs: AgentMessage[]) {
    const out: BaseMessage[] = []
    for (const m of msgs || []) {
        const role = m?.role
        const content = typeof m?.content === 'string' ? m.content : ''
        if (!content) continue
        if (role === 'assistant') out.push(new AIMessage(content))
        else if (role === 'system') out.push(new SystemMessage(content))
        else out.push(new HumanMessage(content))
    }
    return out
}

function safeJsonStringify(value: unknown) {
    try {
        return JSON.stringify(value)
    } catch {
        return String(value)
    }
}

function createToolRegistry(args: RunAgentArgs): ToolRegistry {
    const services = getServices(args.userDataPath)

    const projectList = tool(
        async () => {
            const list = services.projectService.listProjects()
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'projectList',
                args: {}
            })
            return { ok: true, projects: list, activeProjectId: services.projectService.getActiveProjectId() }
        },
        {
            name: 'projectList',
            description: 'List all projects and show the active project id.',
            schema: z.object({})
        }
    )

    const projectCreate = tool(
        async (input: { name?: string }) => {
            const p = services.projectService.createProject(input?.name)
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'projectCreate',
                args: { name: input?.name }
            })
            return { ok: true, project: p }
        },
        {
            name: 'projectCreate',
            description: 'Create a new project and set it active.',
            schema: z.object({ name: z.string().optional() })
        }
    )

    const projectSetActive = tool(
        async (input: { projectId: string }) => {
            services.projectService.setActiveProjectId(String(input?.projectId || ''))
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'projectSetActive',
                args: { projectId: input?.projectId }
            })
            return { ok: true }
        },
        {
            name: 'projectSetActive',
            description: 'Set active project by id.',
            schema: z.object({ projectId: z.string() })
        }
    )

    const memoSave = tool(
        async (input: { stepId: string; contentText: string; projectId?: string }) => {
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'memoSave',
                args: {
                    projectId: input?.projectId,
                    stepId: input?.stepId,
                    contentTextPreview: String(input?.contentText || '').slice(0, 120)
                }
            })
            return services.pipelineRunner.runStep({
                projectId: input?.projectId,
                stepId: input?.stepId,
                mode: 'run',
                contentText: input?.contentText
            })
        },
        {
            name: 'memoSave',
            description:
                'Save memo text as a new version for a step and adopt it. If projectId is omitted, uses active project.',
            schema: z.object({
                projectId: z.string().optional(),
                stepId: z.string().describe('Target stepId, e.g. step_world'),
                contentText: z.string().describe('Full memo text to save')
            })
        }
    )

    const stepRun = tool(
        async (input: { stepId: string; instruction: string; projectId?: string }) => {
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'stepRun',
                args: {
                    projectId: input?.projectId,
                    stepId: input?.stepId,
                    instructionPreview: String(input?.instruction || '').slice(0, 120)
                }
            })
            return services.pipelineRunner.runStep({
                projectId: input?.projectId,
                stepId: input?.stepId,
                mode: 'run',
                instruction: input?.instruction
            })
        },
        {
            name: 'stepRun',
            description:
                'Run a step node: uses LLM when needed, saves a new version and adopts it. If projectId omitted, uses active project.',
            schema: z.object({
                projectId: z.string().optional(),
                stepId: z.string().describe('Target stepId, e.g. step_world'),
                instruction: z.string().describe('Human instruction for this step')
            })
        }
    )

    const stepRedo = tool(
        async (input: { stepId: string; instruction: string; baseVersionId: string; projectId?: string }) => {
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'stepRedo',
                args: {
                    projectId: input?.projectId,
                    stepId: input?.stepId,
                    baseVersionId: input?.baseVersionId,
                    instructionPreview: String(input?.instruction || '').slice(0, 120)
                }
            })
            return services.pipelineRunner.runStep({
                projectId: input?.projectId,
                stepId: input?.stepId,
                mode: 'redo',
                baseVersionId: input?.baseVersionId,
                instruction: input?.instruction
            })
        },
        {
            name: 'stepRedo',
            description:
                'Redo a step based on a specific baseline version (baseVersionId). Saves a new version and adopts it.',
            schema: z.object({
                projectId: z.string().optional(),
                stepId: z.string().describe('Target stepId, e.g. step_world'),
                baseVersionId: z.string().describe('Baseline memo version id to redo from'),
                instruction: z.string().describe('Human instruction describing how to redo')
            })
        }
    )

    const debugPing = tool(
        async (input: { message: string }) => {
            const message = String(input?.message ?? '')
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'debugPing',
                args: { message }
            })
            return { ok: true, echoed: message, ts: new Date().toISOString() }
        },
        {
            name: 'debugPing',
            description:
                'Testing tool. Use when you need to verify tool-calling works without changing any UI. Provide a short message and it will be echoed back.',
            schema: z.object({
                message: z.string().describe('Short message to echo back')
            })
        }
    )

    const debugNote = tool(
        async (input: { note: string }) => {
            const note = String(input?.note ?? '')
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'debugNote',
                args: { note }
            })
            return { ok: true, saved: false, note }
        },
        {
            name: 'debugNote',
            description:
                'Testing tool. Use when user asks to record/log a note for debugging. Does not persist; just returns the note back.',
            schema: z.object({
                note: z.string().describe('The note content')
            })
        }
    )

    const injectStoryboardSandbox = tool(
        async () => {
            args.webContents.send('agent:tool_call', {
                streamId: args.streamId,
                name: 'injectStoryboardSandbox',
                args: {}
            })
            return { ok: true }
        },
        {
            name: 'injectStoryboardSandbox',
            description:
                'Inject HTML/CSS/JS sandbox renderer into the currently selected node preview. Use only when user asks to inject/preview node rendering.',
            schema: z.object({})
        }
    )

    const tools = [
        projectList,
        projectCreate,
        projectSetActive,
        stepRun,
        stepRedo,
        memoSave,
        debugPing,
        debugNote,
        injectStoryboardSandbox
    ]
    return { tools, toolByName: new Map(tools.map((t) => [t.name, t])) }
}

/**
 * LangChain tool-calling loop（不强制 tool_choice）：
 * - bindTools(tools)
 * - invoke -> tool_calls -> ToolMessage -> continue
 */
export async function runAgent(args: RunAgentArgs) {
    const model = createModel({ userDataPath: args.userDataPath })
    const { tools, toolByName } = createToolRegistry(args)

    const systemPrompt =
        '你是 Storyteller 桌面端里的导演型 Agent。你可以在合适时机调用工具。\n' +
        '工具使用规则：仅当工具能更准确/可验证地满足用户请求时才调用；否则直接回答。\n' +
        '如果用户只是想确认工具链路是否工作，优先使用 debugPing / debugNote。\n' +
        '如果用户明确要求注入/预览节点渲染，才调用 injectStoryboardSandbox。'

    const apiKeyFromSettings = (getSettings({ userDataPath: args.userDataPath }).apiKey || '').trim()
    const apiKeyFromEnv = (process.env.STORYTELLER_LLM_API_KEY || '').trim()
    const hasApiKey = Boolean(apiKeyFromSettings || apiKeyFromEnv)

    if (!hasApiKey) {
        const tip =
            '（未配置 API Key：请在设置页填写 baseUrl/path/model/apiKey，或设置环境变量 STORYTELLER_LLM_API_KEY。）\n\n我将继续用占位回复。'
        args.webContents.send('agent:delta', { streamId: args.streamId, delta: tip })
        args.webContents.send('agent:done', { streamId: args.streamId })
        return
    }

    const lcMessages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        ...toLangChainMessages(args.messages)
    ]

    const llm = model.bindTools(tools)

    try {
        for (let step = 0; step < 6; step += 1) {
            const ai = (await llm.invoke(lcMessages, {
                signal: args.signal,
                callbacks: [
                    {
                        handleLLMNewToken(token: string) {
                            if (typeof token === 'string' && token.length) {
                                args.webContents.send('agent:delta', { streamId: args.streamId, delta: token })
                            }
                        }
                    }
                ]
            })) as AIMessage

            lcMessages.push(ai)

            const toolCalls: any[] = (ai as any)?.tool_calls
            if (!Array.isArray(toolCalls) || toolCalls.length === 0) break

            for (const call of toolCalls) {
                const name = String(call?.name || '')
                const argsObj = call?.args ?? {}
                const toolCallId = call?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`

                const t = toolByName.get(name)
                if (!t) {
                    lcMessages.push(new ToolMessage({ content: `Unknown tool: ${name}`, tool_call_id: toolCallId }))
                    continue
                }

                const toolResult = await t.invoke(argsObj, { signal: args.signal })
                const content = typeof toolResult === 'string' ? toolResult : safeJsonStringify(toolResult)
                lcMessages.push(new ToolMessage({ content, tool_call_id: toolCallId }))
            }
        }

        args.webContents.send('agent:done', { streamId: args.streamId })
    } catch (err) {
        const e = err as any
        const message = e?.stack ? String(e.stack) : String(e?.message || e)
        args.webContents.send('agent:error', { streamId: args.streamId, error: message })
        args.webContents.send('agent:done', { streamId: args.streamId })
    }
}
