# 技术重构 TODO（Core 内核化）

目标：以 docs/core 为设计基准，把当前“Step + NodeHandler + uiBlocks + MemoStore + PipelineRunner + Agent tools(硬编码) + NodeInspector(硬编码)”重构为：
- Node Tree（结构层）
- Capability（插件）+ Facets（Schema/Render/Agent/Operation）
- Versioned Artifact Store（按 nodeId + capabilityId 版本化）
- EventBus + Context（解耦、可组合）
- Runner/Agent/Renderer 都只依赖它们关心的 Facet

说明：本轮 **不考虑兼容与回滚**，允许 DB/API 断代升级；但仍要求工程可运行、类型检查通过、功能按新架构完整闭环。

## 现状锚点（便于对照重构落点）
- 核心合同：main/core/contracts/*
- DB schema：main/db/schema.ts
- Node Tree / Artifact store SQLite 实现：main/core/sqlite/*
- IPC API：main/main.ts、preload.js
- Agent：main/agent/agentRunner.ts
- Renderer：renderer/src/components/NodeInspector.vue、renderer/src/stores/pipeline.ts

## 推荐落地顺序（强依赖自上而下）
1) 01-core-contracts：先冻结“目标接口/命名/ID 语义/事件规范”
2) 02-capability-registry：完成能力注册、装配与上下文注入
3) 03-versioned-artifact-store：完成 nodeId+capabilityId 的版本化存储与 adopt/baseline 语义
4) 04-runner-refactor：Runner 内核化为 capability orchestrator + trace
5) 05-agent-tools：Agent 工具由 capability agent facet 自动暴露
6) 06-renderer-renderable-facets：UI 由 render facet 组装，删除 uiBlocks 业务判断
7) 08-observability：统一 run/event/IPC 事件流（便于后续扩展与排障）

## 文件索引
- 01 核心合同：./01-core-contracts.md
- 02 能力注册与装配：./02-capability-registry.md
- 03 版本化产物存储：./03-versioned-artifact-store.md
- 04 Runner 重构：./04-runner-refactor.md
- 05 Agent 工具插件化：./05-agent-tools.md
- 06 Renderer 能力化渲染：./06-renderer-renderable-facets.md
- 08 可观测性：./08-observability.md

## 全局验收口径
- 新架构下：任意“能力执行/工具调用/版本采纳”都能落到 versioned artifact 中，并可驱动 UI 更新
- Runner/Agent/Renderer 不再依赖 NodeHandler.kind/uiBlocks 的硬编码分支
- 新增一种能力：不改 Runner 核心流程，仅注册 capability +（可选）前端组件即可接入
