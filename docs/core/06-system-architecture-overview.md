# 06. 系统架构总览 (System Architecture Overview)

本文档从全局视角描述 Storyteller 的系统分层、模块组装方式与核心设计模式。

---

## 1. 分层架构 (Layered Architecture)

Storyteller 采用经典的 **四层架构**，自上而下依次为：

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                           │
│              (Renderer: Vue + VueFlow + Pinia)                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│   │ DagPane  │  │NodeInsp. │  │ ChatPane │  │ Settings │           │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                              │ IPC (Electron)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Application Layer                             │
│              (Main Process: Services & Runner)                      │
│   ┌──────────────┐  ┌───────────────┐  ┌────────────────┐          │
│   │ AgentRunner  │  │PipelineRunner │  │ ProjectService │          │
│   └──────────────┘  └───────────────┘  └────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Domain Layer                                 │
│              (Core Contracts & Capabilities)                        │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │                    INodeCapability                           │ │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐        │ │
│   │  │ Schema  │ │ Render  │ │ Agent   │ │ Operation   │        │ │
│   │  │ Facet   │ │ Facet   │ │ Facet   │ │ Facet       │        │ │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘        │ │
│   └──────────────────────────────────────────────────────────────┘ │
│   ┌────────────┐  ┌─────────────┐  ┌───────────────┐               │
│   │ INodeEntity│  │ IEventBus   │  │ IContext      │               │
│   └────────────┘  └─────────────┘  └───────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                            │
│              (Persistence & External Services)                      │
│   ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐        │
│   │   SQLite     │  │ ArtifactStore   │  │  LLM Provider  │        │
│   │  (better-    │  │ (Versioned)     │  │  (OpenAI/etc)  │        │
│   │   sqlite3)   │  │                 │  │                │        │
│   └──────────────┘  └─────────────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### 各层职责

| Layer | 职责 | 依赖方向 |
|-------|------|---------|
| **Presentation** | UI 渲染、用户交互、状态展示 | → Application |
| **Application** | 编排业务流程、调度能力执行、管理会话 | → Domain |
| **Domain** | 核心业务模型、能力定义、领域事件 | → Infrastructure (接口) |
| **Infrastructure** | 数据持久化、外部服务调用、文件系统 | 无依赖 |

**依赖规则**：上层依赖下层，下层不知道上层存在。Domain 层只定义接口，不依赖具体实现。

---

## 2. 核心模块组装 (Module Assembly)

```
                          ┌─────────────────────┐
                          │   ServiceContainer  │
                          │   (DI Container)    │
                          └─────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │ CapabilityReg.  │   │  NodeTreeRepo   │   │  ArtifactStore  │
    │ (KV, Image...)  │   │  (SQLite)       │   │  (Versioned)    │
    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │   PipelineRunner    │
                          │   (Orchestrator)    │
                          └─────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │   AgentRunner   │   │   EventBus      │   │   LlmService    │
    │   (LLM Agent)   │   │   (Pub/Sub)     │   │   (API Client)  │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
```

**组装流程**：
1. `ServiceContainer` 作为依赖注入容器，初始化所有核心服务。
2. `CapabilityRegistry` 注册所有可用的 Capability（KV, Image, Renderable...）。
3. `PipelineRunner` 作为编排器，根据节点的 `capabilities` 列表，动态加载并执行对应能力。

---

## 3. 核心设计模式 (Design Patterns)

### 3.1 组合模式 (Composite Pattern)
用于构建无限嵌套的节点树。

```
        WorldRoot (Composite)
            │
    ┌───────┼───────┐
    │       │       │
Geography  Society  Culture
(Composite)(Composite)(Composite)
    │
 ┌──┴──┐
 │     │
Climate Terrain
(Leaf)  (Leaf)
```

**优势**：统一处理单个节点和节点组合，简化遍历和聚合逻辑。

### 3.2 策略模式 (Strategy Pattern)
用于 Capability 的多态实现。

```
┌─────────────────────────────────────────┐
│           IAgentToolProvider            │  ← 接口 (Strategy)
└─────────────────────────────────────────┘
        △                 △
        │                 │
┌───────┴───────┐ ┌───────┴───────┐
│ KvCapability  │ │GenImageCap.   │  ← 具体策略
│ .agent        │ │ .agent        │
└───────────────┘ └───────────────┘
```

**优势**：新增能力时，只需实现接口，无需修改调用方代码。

### 3.3 观察者模式 (Observer Pattern)
用于 EventBus 实现模块解耦。

```
┌─────────────┐       emit('data:changed')       ┌─────────────┐
│ KvCapability│ ─────────────────────────────▶   │  EventBus   │
└─────────────┘                                  └──────┬──────┘
                                                        │
                    ┌───────────────────────────────────┼───────────────────────────────────┐
                    │                                   │                                   │
                    ▼                                   ▼                                   ▼
          ┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
          │ Renderer (UI)   │               │GenImageCapability│              │ SearchIndexer   │
          │ (Subscriber)    │               │ (Subscriber)     │              │ (Subscriber)    │
          └─────────────────┘               └─────────────────┘              └─────────────────┘
```

**优势**：发布者不知道订阅者存在，支持动态扩展。

### 3.4 外观模式 (Facade Pattern)
`PipelineRunner` 作为外观，封装复杂的内部调度逻辑。

```
            ┌───────────────────────────┐
            │      PipelineRunner       │  ← Facade
            │       (Simple API)        │
            └─────────────┬─────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ RunRepo     │   │ MemoStore   │   │ LlmService  │
│ (Trace)     │   │ (Version)   │   │ (Generate)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

**优势**：调用方只需调用 `runner.runStep()`，无需了解内部细节。

### 3.5 工厂模式 (Factory Pattern)
`CapabilityRegistry` 作为工厂，按需创建 Capability 实例。

```
registry.get('kv')       →  new KvCapability(config)
registry.get('gen_image') →  new GenImageCapability(config)
```

**优势**：延迟实例化，支持配置化和动态加载。

---

## 4. 数据流 (Data Flow)

### 4.1 用户操作流（UI → Backend）

```
┌──────────┐      ┌──────────┐      ┌──────────────┐      ┌──────────────┐
│  User    │ ───▶ │ Renderer │ ───▶ │ IPC (invoke) │ ───▶ │ Application  │
│ (Click)  │      │ (Vue)    │      │              │      │ (Runner)     │
└──────────┘      └──────────┘      └──────────────┘      └───────┬──────┘
                                                                   │
                  ┌────────────────────────────────────────────────┘
                  ▼
          ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
          │ Capability   │ ───▶ │ ArtifactStore│ ───▶ │  SQLite DB   │
          │ (Execute)    │      │ (Append Ver.)│      │              │
          └──────────────┘      └──────────────┘      └──────────────┘
```

### 4.2 Agent 调用流（LLM → System）

```
┌──────────┐      ┌──────────┐      ┌──────────────┐      ┌──────────────┐
│  User    │ ───▶ │ ChatPane │ ───▶ │ AgentRunner  │ ───▶ │  LLM API     │
│ (Prompt) │      │          │      │              │      │  (OpenAI)    │
└──────────┘      └──────────┘      └──────────────┘      └───────┬──────┘
                                                                   │
                  ┌────────────────────────────────────────────────┘
                  │  Tool Call: update_node_kv({...})
                  ▼
          ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
          │ Capability   │ ───▶ │ ArtifactStore│ ───▶ │  EventBus    │
          │ .invokeTool()│      │              │      │ (data:changed)│
          └──────────────┘      └──────────────┘      └───────┬──────┘
                                                               │
                                                               ▼
                                                      ┌──────────────┐
                                                      │  Renderer    │
                                                      │  (Refresh)   │
                                                      └──────────────┘
```

---

## 5. 技术栈映射 (Tech Stack Mapping)

| Layer | Technology |
|-------|------------|
| Presentation | Vue 3, Pinia, VueFlow, TypeScript |
| Application | Electron Main Process, LangChain |
| Domain | TypeScript Interfaces, Zod (Schema) |
| Infrastructure | better-sqlite3, Node.js fs, OpenAI API |

---

## 6. 扩展性保障 (Extensibility Guarantees)

本架构通过以下机制保障未来半年及更长时间的扩展性：

| 需求 | 机制 |
|------|------|
| 新增节点类型 | 只需注册新的 `type`，无需改代码 |
| 新增能力 | 实现 `INodeCapability` 并注册到 Registry |
| 新增 LLM 工具 | 在 Capability 的 `agent` Facet 中添加 Tool |
| 新增渲染组件 | 前端注册组件，后端在 `render` Facet 中指定组件名 |
| 新增存储后端 | 实现 `IVersionedArtifactStore` 接口 |
| 新增事件订阅者 | 调用 `eventBus.on()` 订阅事件 |

**核心原则**：
> **开闭原则 (OCP)**：对扩展开放，对修改封闭。
> **依赖倒置 (DIP)**：高层模块不依赖低层模块，都依赖抽象。
