# 04 Runner 重构（Capability Orchestrator）

目的：把 Runner 从“按 NodeHandler.run(kind) 分支”的实现，重构为“按 capability + facet 调度”的编排器；执行、落库、事件发射职责清晰。

依赖
- 01-core-contracts
- 02-capability-registry
- 03-versioned-artifact-store

## Checklist

### A. Runner 分层拆分
- [x] Orchestrator：统一入口（run/redo/cancel）
- [x] ArtifactWriter：写 versioned artifact（append/adopt）
- [x] Step/Node 状态更新：Step 已彻底移除，统一更新 nodes.status（idle/running/succeeded/failed）
- [x] Run/Event 记录：RunRepo/events 作为 trace（或重写为新结构）

### B. 统一输入输出
- [x] 输入：projectId/nodeId/capabilityId + mode(run/redo) + instruction + baseVersionId + directContent(text/json/image)
- [x] 输出：runId + versionId + versionIndex + adoptedVersionId

### C. 执行策略（最小但可扩展）
- [x] operation facet：纯业务操作（无 LLM）
- [x] agent facet：工具调用落库后再执行（由 agentRunner 驱动；runner 本体负责 run/event/status 与 directContent/operation）
- [x] schema validate：写入前强校验（MVP：若 registry 中存在 capability，则对 directContent 做 validate；后续会对 operation/agent 产出也强校验）

### D. 事件发射
- [x] run:start/run:succeeded/run:failed
- [x] data:changed（nodeId+capabilityId+versionId）

## 完成定义（DoD）
- [x] Runner 内部不再依赖 NodeHandler.kind/uiBlocks
- [x] 所有写操作都通过 IVersionedArtifactStore 落版本，并发出 data:changed

## 目标 API（本轮实现建议）

### Orchestrator.runCapability(args)
- 输入：
	- projectId, nodeId, capabilityId
	- mode: 'run' | 'redo'
	- instruction?: string
	- baseVersionId?: string
	- directContent?: { contentType: 'text'|'json'|'image'; contentText?; contentJson?; contentUrl? }
- 行为：
	- 若 capability.operation 存在：读取 adopted/baseVersion 作为 currentData，执行 operation 或基于 instruction 的最小策略（后续增强）
	- 永远通过 VersionedArtifactStore.appendVersion 落版本（可选 adopt=true）
	- 更新 nodes.status
	- 记录 run + events（RunRepo）
	- 通过 EventBus emit：run:*、artifact:*、data:changed

### IPC
- renderer -> main：runner:runCapability

## 当前实现落点
- main/services/capabilityOrchestrator.ts
- main/main.ts（IPC：runner:runCapability）
- preload.js（window.storyteller.runner.runCapability）

## 已知限制（后续在 05/04 增强）
- 当前 MVP 仅支持 directContent 写入落库；operation facet 与 agent facet 的“编排执行”仍未接线（见 main/services/capabilityOrchestrator.ts）。
