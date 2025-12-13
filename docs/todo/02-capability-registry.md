# 02 能力注册与装配（Capability Registry）

目的：建立 CapabilityRegistry + Facets 装配机制，使 Runner/Agent/Renderer 只依赖所需 Facet；能力新增不改核心流程。

依赖
- 01-core-contracts

## Checklist

### A. CapabilityRegistry 机制
- [x] 注册 API：register/get/list
- [x] 支持工厂/惰性实例化（避免一次性创建所有能力实例）
- [x] 明确能力实例生命周期：
  - [x] 能力“定义”是单例（全局）；按需惰性创建。
  - [x] onMount/onUnmount 由调用方（Runner/Renderer/Agent 编排器）在“开始使用某 node 的某 capability”时显式触发。

### B. 配置与依赖
- [ ] capability 默认 config（全局）
- [ ] node 级覆盖 config（可选，合同先定义）
- [x] 能力依赖校验策略：
  - [x] onMount 可调用 ctx.getSiblingData 进行依赖探测
  - [x] 依赖不满足必须 throw（上层记录为 run:failed / tool.error），不 silent

### C. Facets 装配与发现
- [x] 从 node.capabilities[] 解析得到：schema/render/agent/operation facets 的集合
- [x] RenderFacet 输出格式固定为 componentName + uiOptions
- [x] Agent tools 的命名约束与冲突策略：
  - [x] toolName 必须全局唯一（跨 capability）
  - [x] 冲突策略：注册时报错（fail fast）

### D. 第一批内置能力清单（对齐现有系统）
- [x] kv
- [x] memo
- [x] sandbox（或 renderable）
- [x] storyboard（先只做 schema+render，执行后置）
- [x] image（先只做 schema+render，占位面板即可）

## 完成定义（DoD）
- [x] Runner/Agent/Renderer 均可通过 registry + node.capabilities 得到自己需要的 facet
- [x] 新增能力时：只需注册 capability（+ 可选前端组件），不需要改核心调度流程

## 本轮拍板（冻结）

### 1) 能力实例生命周期
- “能力定义（NodeCapability）”是全局单例；registry 负责惰性创建并缓存。
- 不在 registry 内部维护 per-node 的能力实例（避免隐式状态）；如需 per-node 生命周期，由编排器显式调用 capability.onMount/onUnmount。

### 2) Facet 装配规则
- 给定 node.capabilities[]：
  - registry.get(capabilityId) -> NodeCapability
  - 由 NodeCapability 暴露 schema/render/agent/operation 四类 facet（缺省即不支持）。

### 3) Agent Tool 命名
- tool.name 全局唯一。
- 冲突即抛错（注册阶段 fail fast）。

## 代码落点
- 合同：main/core/contracts/capabilities.ts
- 实现：main/core/inMemoryCapabilityRegistry.ts
