# ADR 0002：Agent 与大模型接入（第一期）

日期：2025-12-13
状态：Accepted

## 背景
第一期需要“导演式创作”的 Chat：
- 能与用户对话（流式输出）
- 能调用工具（例如更新某个 Step 的产物、注入节点渲染、后续接入 MCP 等）
- 在桌面端环境要尽量避免把大模型密钥暴露给渲染进程

## 决策
采用三层结构：
1) Renderer（Vue）负责 UI 与状态（Chat/Steps/Artifacts），以及把用户输入交给 Agent
2) Agent 负责“对话 + 工具调用编排”
3) Main（Electron 主进程）代理访问大模型 HTTP 接口，提供流式 delta 给 Renderer（通过 IPC）

## 关键点
- Chat UI 组件只是展示层：流式是“不断追加 delta 到同一条 assistant 消息”。
- 工具调用与产物更新要结构化：后续落库为 Run/Event/ArtifactVersion。
- 大模型接入走 OpenAI-compatible：减少供应商锁定，便于接本地/云端。

## 实现（当前仓库）
- Agent（LangChain，主进程）
  - 位置：[main/agent/agentRunner.js](main/agent/agentRunner.js)
  - 能力：
    - 流式输出（token delta）
    - 工具调用（当前演示工具：`injectStoryboardSandbox`，触发 renderer 侧注入节点渲染）

- 设置持久化（SQLite）
  - DB：`<userData>/storyteller.db`
  - 位置：[main/db/settingsRepo.js](main/db/settingsRepo.js)
  - 说明：使用 `better-sqlite3`；安装后需要 `electron-rebuild` 以匹配 Electron ABI（本仓库已在 `postinstall` 自动执行）。

- IPC（主进程）
  - 位置：[main.js](main.js)
  - Agent：
    - `agent:start`（handle）：返回 streamId
    - `agent:delta`（event）：逐 token 输出
    - `agent:done`（event）：结束
    - `agent:error`（event）：错误
    - `agent:tool_call`（event）：工具调用事件
    - `agent:cancel`（event）：取消
  - Settings：
    - `settings:get`（handle）
    - `settings:set`（handle）

- Preload 桥接
  - 位置：[preload.js](preload.js)
  - `window.storyteller.agent.*`、`window.storyteller.settings.*`

- Renderer 侧接入
  - Agent client：[renderer/src/agent/mainAgentClient.ts](renderer/src/agent/mainAgentClient.ts)
  - Chat UI：[renderer/src/components/ChatPane.vue](renderer/src/components/ChatPane.vue)
  - Settings UI：[renderer/src/components/SettingsPane.vue](renderer/src/components/SettingsPane.vue)

## 配置方式
优先使用应用内设置页（持久化到 SQLite）：
- 在“设置”页填写 `Endpoint / Model / API Key`

也可使用环境变量（用于 CI/临时覆盖；设置为空时会回退到环境变量）：
- `STORYTELLER_LLM_BASE_URL`（默认 `https://api.openai.com`）
- `STORYTELLER_LLM_API_KEY`
- `STORYTELLER_LLM_MODEL`（默认 `gpt-4.1-mini`）

## 影响与权衡
- ✅ 密钥只在主进程使用，渲染进程不直接持有密钥
- ✅ 统一用 OpenAI-compatible，后续可替换为本地推理/企业网关
- ✅ 流式通过 IPC delta，UI 更新路径稳定
- ⚠️ 使用 sqlite native module 需要 electron-rebuild（已自动化）
- ⚠️ 后续做工具调用时，需要在 Agent 层引入结构化 ToolCall/ToolResult 事件，并写入运行日志
