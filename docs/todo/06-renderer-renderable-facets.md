# 06 Renderer：Renderable Facets 驱动 UI 组装

目的：删除 renderer 侧对 uiBlocks/hasKv/hasSandbox 的业务判断；改为根据 node.capabilities → render facets → 动态渲染能力面板。

依赖
- 02-capability-registry（render facet 协议）
- 03-versioned-artifact-store（版本数据来源）

## Checklist

### A. 组件注册表
- [x] componentName → Vue 组件的映射表
- [x] 缺失组件的降级渲染（显示 JSON/文本）

### B. NodeInspector 改造
- [x] 由 render facets 生成面板列表并渲染（capability:list + componentName 映射）
- [x] 版本面板统一从 artifact store 读取（append/list/getAdopted/adopt）

### C. Sandbox 数据进入版本体系
- [x] sandbox 作为 capability（capabilityId=sandbox），保存为 json 版本
- [x] “应用到节点/注入示例渲染”改为 appendVersion + adopt

### D. 事件驱动刷新
- [x] 订阅 data:changed（来自 main→IPC）后局部刷新对应面板

## 完成定义（DoD）
- [x] renderer 不再写死 kv/memo/sandbox 分支
- [x] 新增能力只需新增前端组件并注册 componentName 映射

## 代码落点
- IPC：main/main.ts（capability:list + app:event(data:changed)）
- Preload：preload.js（window.storyteller.capabilities + events.on）
- 组件注册表：renderer/src/components/capabilityComponentRegistry.ts
- 面板组件：renderer/src/components/panels/*
- NodeInspector：renderer/src/components/NodeInspector.vue
