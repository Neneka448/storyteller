"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const openai_1 = require("@langchain/openai");
const tools_1 = require("@langchain/core/tools");
const messages_1 = require("@langchain/core/messages");
const zod_1 = require("zod");
const settingsRepo_1 = require("../db/settingsRepo");
const serviceContainer_1 = require("../services/serviceContainer");
const DEFAULT_MODEL = 'gpt-4.1-mini';
function normalizeEnvBaseURL(raw) {
    const input = String(raw ?? '').trim();
    if (!input)
        return '';
    try {
        const u = new URL(input);
        return u.toString().replace(/\/$/, '');
    }
    catch {
        return '';
    }
}
function createModel(opts) {
    const s = (0, settingsRepo_1.getSettings)({ userDataPath: opts.userDataPath });
    const envBaseURL = normalizeEnvBaseURL(process.env.STORYTELLER_LLM_BASE_URL);
    const baseURL = envBaseURL || (0, settingsRepo_1.resolveBaseURL)(s);
    const apiKey = (s.apiKey || '').trim() || (process.env.STORYTELLER_LLM_API_KEY || '').trim();
    const model = (s.model || '').trim() || (process.env.STORYTELLER_LLM_MODEL || '').trim() || DEFAULT_MODEL;
    return new openai_1.ChatOpenAI({
        model,
        // OpenAI-compatible：优先 chat-completions
        useResponsesApi: false,
        streaming: true,
        apiKey,
        configuration: { baseURL }
    });
}
function toLangChainMessages(msgs) {
    const out = [];
    for (const m of msgs || []) {
        const role = m?.role;
        const content = typeof m?.content === 'string' ? m.content : '';
        if (!content)
            continue;
        if (role === 'assistant')
            out.push(new messages_1.AIMessage(content));
        else if (role === 'system')
            out.push(new messages_1.SystemMessage(content));
        else
            out.push(new messages_1.HumanMessage(content));
    }
    return out;
}
function safeJsonStringify(value) {
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value);
    }
}
function resolveProjectId(services, input) {
    const fromArgs = String(input?.projectId ?? '').trim();
    if (fromArgs)
        return fromArgs;
    const active = services.projectService.getActiveProjectId();
    if (active)
        return String(active);
    throw new Error('Missing projectId (and no active project set)');
}
function resolveNodeId(input) {
    const nodeId = String(input?.nodeId ?? '').trim();
    if (!nodeId)
        throw new Error('Missing nodeId');
    return nodeId;
}
function createToolRegistry(args) {
    const services = (0, serviceContainer_1.getServices)(args.userDataPath);
    const emitToolCall = (name, toolArgs) => {
        args.webContents.send('agent:tool_call', {
            streamId: args.streamId,
            name,
            args: toolArgs ?? {}
        });
    };
    const projectList = (0, tools_1.tool)(async () => {
        const list = services.projectService.listProjects();
        emitToolCall('projectList', {});
        return { ok: true, projects: list, activeProjectId: services.projectService.getActiveProjectId() };
    }, {
        name: 'projectList',
        description: 'List all projects and show the active project id.',
        schema: zod_1.z.object({})
    });
    const projectCreate = (0, tools_1.tool)(async (input) => {
        const p = services.projectService.createProject(input?.name);
        emitToolCall('projectCreate', { name: input?.name });
        return { ok: true, project: p };
    }, {
        name: 'projectCreate',
        description: 'Create a new project and set it active.',
        schema: zod_1.z.object({ name: zod_1.z.string().optional() })
    });
    const projectSetActive = (0, tools_1.tool)(async (input) => {
        services.projectService.setActiveProjectId(String(input?.projectId || ''));
        emitToolCall('projectSetActive', { projectId: input?.projectId });
        return { ok: true };
    }, {
        name: 'projectSetActive',
        description: 'Set active project by id.',
        schema: zod_1.z.object({ projectId: zod_1.z.string() })
    });
    const nodeList = (0, tools_1.tool)(async (input) => {
        const projectId = resolveProjectId(services, input);
        emitToolCall('nodeList', { projectId });
        const nodes = await services.nodeTreeRepository.listChildren({ projectId, parentId: null });
        return { ok: true, projectId, nodes };
    }, {
        name: 'nodeList',
        description: 'List top-level nodes (root children) for a project. Use this to find nodeId to operate on. Defaults to active project.',
        schema: zod_1.z.object({ projectId: zod_1.z.string().optional() })
    });
    const debugPing = (0, tools_1.tool)(async (input) => {
        const message = String(input?.message ?? '');
        emitToolCall('debugPing', { message });
        return { ok: true, echoed: message, ts: new Date().toISOString() };
    }, {
        name: 'debugPing',
        description: 'Testing tool. Use when you need to verify tool-calling works without changing any UI. Provide a short message and it will be echoed back.',
        schema: zod_1.z.object({
            message: zod_1.z.string().describe('Short message to echo back')
        })
    });
    const debugNote = (0, tools_1.tool)(async (input) => {
        const note = String(input?.note ?? '');
        emitToolCall('debugNote', { note });
        return { ok: true, saved: false, note };
    }, {
        name: 'debugNote',
        description: 'Testing tool. Use when user asks to record/log a note for debugging. Does not persist; just returns the note back.',
        schema: zod_1.z.object({
            note: zod_1.z.string().describe('The note content')
        })
    });
    const injectStoryboardSandbox = (0, tools_1.tool)(async () => {
        emitToolCall('injectStoryboardSandbox', {});
        return { ok: true };
    }, {
        name: 'injectStoryboardSandbox',
        description: 'Inject HTML/CSS/JS sandbox renderer into the currently selected node preview. Use only when user asks to inject/preview node rendering.',
        schema: zod_1.z.object({})
    });
    // Capability tools: auto-exposed from registry
    const capabilityTools = [];
    for (const capability of services.capabilityRegistry.list()) {
        if (!capability.agent)
            continue;
        const defs = capability.agent.getTools?.() ?? [];
        for (const def of defs) {
            const toolName = String(def?.name ?? '').trim();
            if (!toolName)
                continue;
            const wrapped = (0, tools_1.tool)(async (input) => {
                const projectId = resolveProjectId(services, input);
                const nodeId = resolveNodeId(input);
                const runId = services.runRepo.createRun({
                    projectId,
                    kind: `agent:tool:${toolName}`,
                    inputJson: { streamId: args.streamId, toolName, args: input ?? null, nodeId, capabilityId: capability.id }
                });
                services.runRepo.addEvent({
                    runId,
                    type: 'agent:tool.call',
                    payloadJson: { ts: Date.now(), runId, projectId, nodeId, capabilityId: capability.id, streamId: args.streamId, toolName, args: input ?? null }
                });
                services.eventBus.emit('agent:tool.call', {
                    ts: Date.now(),
                    runId,
                    projectId,
                    nodeId,
                    capabilityId: capability.id,
                    streamId: args.streamId,
                    toolName,
                    args: input ?? null
                });
                emitToolCall(toolName, input);
                try {
                    const result = await capability.agent.invokeTool(toolName, input, {
                        projectId,
                        nodeId,
                        capabilityId: capability.id,
                        runId,
                        streamId: args.streamId,
                        artifacts: services.artifactStore,
                        nodeTree: services.nodeTreeRepository,
                        events: services.eventBus
                    });
                    services.runRepo.addEvent({
                        runId,
                        type: 'agent:tool.result',
                        payloadJson: { ts: Date.now(), runId, projectId, nodeId, capabilityId: capability.id, streamId: args.streamId, toolName, result }
                    });
                    services.eventBus.emit('agent:tool.result', {
                        ts: Date.now(),
                        runId,
                        projectId,
                        nodeId,
                        capabilityId: capability.id,
                        streamId: args.streamId,
                        toolName,
                        result
                    });
                    services.runRepo.setRunStatus({ runId, status: 'succeeded' });
                    return result;
                }
                catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    services.runRepo.addEvent({
                        runId,
                        type: 'agent:tool.error',
                        payloadJson: { ts: Date.now(), runId, projectId, nodeId, capabilityId: capability.id, streamId: args.streamId, toolName, error: msg }
                    });
                    services.eventBus.emit('agent:tool.error', {
                        ts: Date.now(),
                        runId,
                        projectId,
                        nodeId,
                        capabilityId: capability.id,
                        streamId: args.streamId,
                        toolName,
                        error: msg
                    });
                    services.runRepo.setRunStatus({ runId, status: 'failed', error: msg });
                    throw e;
                }
            }, {
                name: toolName,
                description: `${String(def?.description ?? '')}\n\nJSON Schema: ${safeJsonStringify(def?.schema ?? {})}`,
                // MVP: accept any input; capability.invokeTool validates.
                schema: zod_1.z.any()
            });
            capabilityTools.push(wrapped);
        }
    }
    const tools = [
        projectList,
        projectCreate,
        projectSetActive,
        nodeList,
        debugPing,
        debugNote,
        injectStoryboardSandbox,
        ...capabilityTools
    ];
    return { tools, toolByName: new Map(tools.map((t) => [t.name, t])) };
}
/**
 * LangChain tool-calling loop（不强制 tool_choice）：
 * - bindTools(tools)
 * - invoke -> tool_calls -> ToolMessage -> continue
 */
async function runAgent(args) {
    const model = createModel({ userDataPath: args.userDataPath });
    const { tools, toolByName } = createToolRegistry(args);
    const toolNames = tools.map((t) => String(t?.name ?? '')).filter(Boolean);
    const systemPrompt = '你是 Storyteller 桌面端里的导演型 Agent。你可以在合适时机调用工具。\n' +
        '工具使用规则：仅当工具能更准确/可验证地满足用户请求时才调用；否则直接回答。\n' +
        '如果用户只是想确认工具链路是否工作，优先使用 debugPing / debugNote。\n' +
        '如果用户明确要求注入/预览节点渲染，才调用 injectStoryboardSandbox。\n\n' +
        '可用工具（tool.name 列表）：' + toolNames.join(', ') + '\n' +
        '提示：能力工具通常需要提供 nodeId（必要时先用 nodeList 查询）。';
    const apiKeyFromSettings = ((0, settingsRepo_1.getSettings)({ userDataPath: args.userDataPath }).apiKey || '').trim();
    const apiKeyFromEnv = (process.env.STORYTELLER_LLM_API_KEY || '').trim();
    const hasApiKey = Boolean(apiKeyFromSettings || apiKeyFromEnv);
    if (!hasApiKey) {
        const tip = '（未配置 API Key：请在设置页填写 baseUrl/path/model/apiKey，或设置环境变量 STORYTELLER_LLM_API_KEY。）\n\n我将继续用占位回复。';
        args.webContents.send('agent:delta', { streamId: args.streamId, delta: tip });
        args.webContents.send('agent:done', { streamId: args.streamId });
        return;
    }
    const lcMessages = [
        new messages_1.SystemMessage(systemPrompt),
        ...toLangChainMessages(args.messages)
    ];
    const llm = model.bindTools(tools);
    try {
        for (let step = 0; step < 6; step += 1) {
            const ai = (await llm.invoke(lcMessages, {
                signal: args.signal,
                callbacks: [
                    {
                        handleLLMNewToken(token) {
                            if (typeof token === 'string' && token.length) {
                                args.webContents.send('agent:delta', { streamId: args.streamId, delta: token });
                            }
                        }
                    }
                ]
            }));
            lcMessages.push(ai);
            const toolCalls = ai?.tool_calls;
            if (!Array.isArray(toolCalls) || toolCalls.length === 0)
                break;
            for (const call of toolCalls) {
                const name = String(call?.name || '');
                const argsObj = call?.args ?? {};
                const toolCallId = call?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
                const t = toolByName.get(name);
                if (!t) {
                    lcMessages.push(new messages_1.ToolMessage({ content: `Unknown tool: ${name}`, tool_call_id: toolCallId }));
                    continue;
                }
                const toolResult = await t.invoke(argsObj, { signal: args.signal });
                const content = typeof toolResult === 'string' ? toolResult : safeJsonStringify(toolResult);
                lcMessages.push(new messages_1.ToolMessage({ content, tool_call_id: toolCallId }));
            }
        }
        args.webContents.send('agent:done', { streamId: args.streamId });
    }
    catch (err) {
        const e = err;
        const message = e?.stack ? String(e.stack) : String(e?.message || e);
        args.webContents.send('agent:error', { streamId: args.streamId, error: message });
        args.webContents.send('agent:done', { streamId: args.streamId });
    }
}
