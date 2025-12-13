# 08 可观测性（Runs / Events / IPC Stream）

目的：把运行过程做成可追踪、可定位的链路；随着能力增多也能稳定排障。

依赖
- 04-runner-refactor
- 05-agent-tools

## Checklist

### A. 事件命名规范（冻结）
- [x] run:start/run:succeeded/run:failed
- [x] artifact:appended/artifact:adopted
- [x] agent:tool.call/agent:tool.result/agent:tool.error
- [x] data:changed（nodeId+capabilityId+versionId）

### B. payload 规范
- [x] 必填：runId/projectId/nodeId/capabilityId/ts（data:changed 的 runId 允许为空）
- [x] 可选：baseVersionId/toolName/argsSummary/promptSummary/error

### C. IPC 推送
- [x] main 推送事件到 renderer（增量更新状态与版本）
- [x] renderer 只依赖事件 + 拉取接口，不轮询全量

### D. UI 最小展示点（不新增页面）
- [x] Chat 中显示 tool_call 与错误摘要（tool.error/run.failed）
- [x] 节点详情显示最近一次运行状态与失败原因

## 完成定义（DoD）
- [x] 任意一次执行都能从 runs/events 复盘：谁触发、改了哪个能力、生成了哪个版本、失败原因是什么（提供 run:list 与 run:events IPC）

## 冻结：事件与 payload

### Event Types
- run:start | run:succeeded | run:failed
- artifact:appended | artifact:adopted
- agent:tool.call | agent:tool.result | agent:tool.error
- data:changed

### Payload（最小必填）
- ts: number
- projectId: string
- nodeId: string
- capabilityId: string
- runId: string（data:changed 可为空）

### 常用可选字段
- error: string
- toolName: string
- args: any
- artifactId/versionId/versionIndex

## 代码落点
- 事件源：main/services/capabilityOrchestrator.ts、main/agent/agentRunner.ts、main/capabilities/builtin/*
- IPC 转发：main/main.ts（app:event）
- IPC 查询：main/services/runRepo.ts + main/main.ts（run:list / run:events）
- Renderer 展示点：renderer/src/components/ChatPane.vue、renderer/src/components/NodeInspector.vue
