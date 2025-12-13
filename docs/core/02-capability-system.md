# 02. 能力系统设计 (Capability System)

## 1. 核心理念：Capability as Plugin (能力即插件)

Storyteller 摒弃了传统的继承式架构（`class CharacterNode extends Node`），转而采用 **ECS (Entity-Component-System)** 风格的组合式架构。
- **Node** 只是一个 ID。
- **Capability** 是挂载在 Node 上的插件，赋予其具体的功能。

一个节点可以同时拥有：
- `KvCapability` (存储属性)
- `GenImageCapability` (生成配图)
- `RenderableCapability` (自定义渲染)

## 2. 接口定义：Facets (切面) 模式

为了实现高内聚低耦合，Capability 不再是一个巨大的类，而是由多个 **Facets (切面)** 组成的集合。

```typescript
interface INodeCapability<TData = any, TConfig = any> {
  // 唯一标识 (e.g., 'kv', 'gen_image')
  readonly id: string;
  
  // 1. Schema Facet: 定义数据结构与验证
  readonly schema: ISchemaProvider<TData>;
  
  // 2. Render Facet: 定义前端如何展示 (可选)
  readonly render?: IRenderableFacet;
  
  // 3. Agent Facet: 定义 LLM 如何调用 (可选)
  readonly agent?: IAgentToolProvider;
  
  // 4. Operation Facet: 定义核心业务逻辑 (可选)
  readonly operation?: IOperatableFacet<TData>;
  
  // 生命周期钩子
  onMount?(context: ICapabilityContext<TConfig>): void;
}
```

### 2.1 Schema Facet
负责元数据定义，供 DB 初始化、验证器和 LLM 使用。
```typescript
interface ISchemaProvider<T> {
  defaultData: T;
  validate(data: any): boolean;
  // 返回 JSON Schema，用于指导 LLM 输出
  getJsonSchema(): object; 
}
```

### 2.2 Render Facet
负责前端 UI 映射。后端不返回 HTML，只返回组件标识。
```typescript
interface IRenderableFacet {
  // 前端组件注册名 (e.g., 'KvEditor', 'ImageViewer')
  componentName: string;
  // 传递给组件的静态配置
  uiOptions?: Record<string, any>;
}
```

### 2.3 Agent Facet
负责将能力暴露为 LLM 可调用的 Tools。
```typescript
interface IAgentToolProvider {
  // 返回 Tool 定义 (name, description, args schema)
  getTools(): AgentToolDefinition[];
  // 执行 Tool 逻辑
  invokeTool(toolName: string, args: any, ctx: ToolContext): Promise<any>;
}
```

### 2.4 Operation Facet
负责不依赖 LLM 的纯业务操作（如“重置数据”、“应用模板”）。
```typescript
interface IOperatableFacet<T> {
  execute(operation: string, args: any, currentData: T): Promise<T>;
}
```

## 3. 能力注册与加载 (Registry & Loading)

系统维护一个全局的 `CapabilityRegistry`。

```typescript
class CapabilityRegistry {
  register(cap: INodeCapability): void;
  get(id: string): INodeCapability;
}
```

**运行时流程**：
1. Runner/Renderer 获取 Node 数据。
2. 读取 `node.capabilities` 列表 (e.g., `['kv', 'image']`)。
3. 从 Registry 加载对应的 Capability 实例。
4. 根据当前场景（渲染 UI 或 执行 Agent），调用对应 Facet 的方法。

## 4. 开发指南：如何新增一个 Capability

假设我们要开发一个 **"DiceRollCapability"** (骰子能力)：

1. **定义 Schema**: `{ result: number, formula: string }`。
2. **实现 Render Facet**: 指向前端组件 `'DiceRoller'`，显示投掷按钮和结果。
3. **实现 Agent Facet**: 提供 `roll_dice(formula)` 工具，让 LLM 可以决定投骰子。
4. **实现 Operation Facet**: 实现真实的随机数生成逻辑。
5. **注册**: `registry.register(new DiceRollCapability())`。
6. **使用**: 在某个 Node 的 capabilities 列表中加入 `'dice_roll'`。
