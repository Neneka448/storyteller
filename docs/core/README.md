# 核心架构设计指南 (Core Architecture Guide)

本文档索引了 Storyteller 系统的核心架构设计决策 (ADR) 与实现指南。本架构旨在构建一个高内聚、低耦合、可无限扩展的节点化创作系统，以支撑未来长期的业务迭代。

## 架构愿景
打造一个 **ECS (Entity-Component-System)** 风格的、**微内核 + 插件化切面** 的创作引擎。
- **Entity (Node)**: 纯粹的结构化容器（树状）。
- **Component (Capability)**: 赋予节点数据、行为、渲染能力的插件。
- **System (Runner/Renderer)**: 驱动能力执行与展示的引擎。

## 文档索引

### 1. [节点与树架构 (Node & Tree Architecture)](./01-node-tree-architecture.md)
> **核心概念**：世界观不是一张表，而是一棵树。
> **内容涵盖**：
> - 为什么选择 Block Tree 结构
> - `INodeEntity` 数据模型
> - 组合模式 (Composite) 与叶子节点 (Leaf)
> - 树的持久化与遍历策略

### 2. [能力系统设计 (Capability System)](./02-capability-system.md)
> **核心概念**：节点的能力由插件化的 Capability 赋予，而非继承。
> **内容涵盖**：
> - `INodeCapability` 接口定义
> - **Facets (切面) 模式**：`Schema`, `Render`, `Agent`, `Operation`
> - 能力的生命周期与配置
> - 如何开发一个新的 Capability

### 3. [事件驱动与上下文 (Event Bus & Context)](./03-event-context.md)
> **核心概念**：解耦模块间的直接调用，通过事件总线通信。
> **内容涵盖**：
> - Domain Event Bus 设计
> - 依赖注入 (DI) 与上下文 (Context) 管理
> - 跨 Capability 的通信机制

### 4. [版本化与工件存储 (Versioning & Artifacts)](./04-versioning-artifacts.md)
> **核心概念**：一切皆可版本化，支持细粒度回溯。
> **内容涵盖**：
> - `IVersionedArtifactStore` 接口
> - 节点数据的版本策略
> - 采纳 (Adopt) 与基线 (Baseline) 机制

### 5. [大模型交互协议 (LLM Interaction Protocol)](./05-llm-protocol.md)
> **核心概念**：让大模型理解并操作 Capability。
> **内容涵盖**：
> - `ICallableTool` 接口与 Function Calling 映射
> - Schema 注入与 Prompt 构建
> - 自动化任务执行流

### 6. [系统架构总览 (System Architecture Overview)](./06-system-architecture-overview.md)
> **核心概念**：全局视角理解系统分层与模块组装。
> **内容涵盖**：
> - 四层架构图解（Presentation → Application → Domain → Infrastructure）
> - 核心模块组装与依赖注入
> - 设计模式应用（组合、策略、观察者、外观、工厂）
> - 数据流可视化（用户操作流、Agent 调用流）
> - 扩展性保障机制

---

## 快速开始 (For Developers)

如果你要开发一个新的功能（例如“角色关系图”）：
1. 阅读 [02-capability-system.md](./02-capability-system.md) 了解如何定义 `GraphCapability`。
2. 实现 `RenderFacet` (前端组件) 和 `SchemaFacet` (数据结构)。
3. 在 [01-node-tree-architecture.md](./01-node-tree-architecture.md) 中了解如何将其挂载到节点树上。
