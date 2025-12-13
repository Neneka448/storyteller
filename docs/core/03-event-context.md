# 03. 事件驱动与上下文 (Event Bus & Context)

## 1. 核心理念：解耦通信

在微内核架构中，Capability 之间、UI 与后端之间不应直接相互调用，而应通过 **Event Bus (事件总线)** 进行通信。这保证了系统的松耦合和可扩展性。

## 2. Domain Event Bus (领域事件总线)

系统内置一个全局 Event Bus，支持发布/订阅模式。

### 核心接口
```typescript
interface IEventBus {
  // 发布事件
  emit<T>(event: string, payload: T): void;
  
  // 订阅事件
  on<T>(event: string, handler: (payload: T) => void): UnsubscribeFn;
}
```

### 常用事件定义
- `node:created`: 节点创建完成 (Payload: `INodeEntity`)
- `node:updated`: 节点元数据更新 (Payload: `INodeEntity`)
- `node:deleted`: 节点被删除 (Payload: `nodeId`)
- `data:changed`: 节点 Capability 数据变更 (Payload: `{ nodeId, capabilityId, newData }`)
- `agent:action`: Agent 执行了某个动作 (Payload: `{ toolName, args, result }`)

### 使用场景示例
- **UI 刷新**: 前端订阅 `data:changed`。当 Agent 后台修改了 KV 数据，前端自动收到事件并刷新视图，无需轮询。
- **联动逻辑**: `GenImageCapability` 订阅 `data:changed`。当检测到同节点的 `KvCapability` 中 "外貌描述" 字段变化时，自动标记图片为 "Outdated" 或触发重绘建议。

## 3. 上下文与依赖注入 (Context & DI)

Capability 在执行时，往往需要访问外部环境（如当前项目、数据库、LLM 服务）。为了避免参数透传地狱，我们使用 **Context** 对象。

### ICapabilityContext
当 Capability 被挂载或执行时，系统会注入此上下文。

```typescript
interface ICapabilityContext<TConfig = any> {
  // 当前环境信息
  readonly projectId: string;
  readonly nodeId: string;
  
  // 核心服务访问
  readonly services: {
    db: DatabaseService;
    llm: LlmService;
    artifacts: ArtifactService;
  };
  
  // 事件总线
  readonly events: IEventBus;
  
  // 自身配置
  readonly config: TConfig;
  
  // 获取同节点其他 Capability 数据的方法 (用于依赖)
  getSiblingData<T>(capabilityId: string): Promise<T | null>;
}
```

### 依赖管理
如果 Capability A 强依赖 Capability B（例如 `ChartCapability` 依赖 `KvCapability` 的数据），应在 `onMount` 中检查依赖，或通过 `getSiblingData` 动态获取。

## 4. 跨层通信 (Cross-Layer Communication)

- **Renderer -> Runner**: 通过 IPC (Electron) 发送 Command (如 `runStep`, `invokeTool`)。
- **Runner -> Renderer**: 通过 IPC 发送 Event (如 `agent:token`, `data:changed`)。
- **Agent -> System**: Agent 通过调用 Tool，Tool 内部通过 `IOperatable` 修改数据并触发 Event。
