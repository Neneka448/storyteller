# 05 Agent 工具插件化（Capability Agent Facet）

目的：把 Agent tools 从硬编码列表演进为由 capability 的 agent facet 自动暴露；工具调用能精确定位 nodeId+capabilityId，并落库为版本。

依赖
- 02-capability-registry
- 03-versioned-artifact-store
- 04-runner-refactor

## Checklist

### A. 工具来源分层
- [x] 系统工具：项目管理/设置/调试 + 节点浏览（nodeList）
- [x] 能力工具：由 registry 汇总 agent facets（当前实现：按 capabilityId 暴露工具；执行时校验目标 node 是否挂载该 capability）

### B. ToolContext 统一
- [x] projectId/nodeId/capabilityId/runId/streamId
- [x] 注入方式固定：ctx.artifacts + ctx.nodeTree + ctx.events

### C. Schema 注入
- [x] tools 参数 schema：来自 capability.agent.getTools().schema（JSON Schema 形态）
- [x] system prompt 注入（MVP）：注入可用工具清单 + nodeList 用法（能力+schema+adopted 摘要后续增强）

### D. 工具调用落库与事件
- [x] 每次 tool call 产生 run event：agent:tool.call/agent:tool.result/agent:tool.error（RunRepo + EventBus）
- [x] 执行成功必须 appendVersion，并可选 adopt
- [x] 发出 data:changed 供 UI 刷新（EventBus emit；IPC 推送将在 08 完成）

## 完成定义（DoD）
- [x] 新增能力工具不需要改 agentRunner：只注册 capability 即可
- [x] Agent 可以通过工具精确修改某 node 的某能力，并产生新版本

## 本轮拍板（冻结）

### 1) 目标定位
- tool 调用必须最终落到 (projectId,nodeId,capabilityId) 维度。
- agent:start 不带上下文，因此 capability 工具参数必须显式包含 nodeId（projectId 可缺省为 active）。

### 2) 工具汇总策略
- agentRunner 启动时：
	- 注册系统工具（project/node/debug）
	- 从 CapabilityRegistry 汇总 capability.agent.getTools() 并包装为 LangChain tools

### 3) 执行路径
- capability 工具执行：capability.agent.invokeTool(toolName,args,ctx)
- invokeTool 内部只能通过 ctx.artifacts/nodeTree/events 与 core 交互（不直接耦合 UI/renderer）。

## 代码落点
- 核心合同：main/core/contracts/capabilities.ts（ToolContext）
- 内置能力（示例）：main/capabilities/builtin/*
- Agent 汇总：main/agent/agentRunner.ts
