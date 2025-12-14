# 业务功能与交互设计指南 (Business & Interaction Guide)

本文档梳理了 Storyteller 的核心业务模型、功能组合方式以及用户/AI 的交互流程。

## 文档索引

### 0. [业务文档索引（按角色/任务快速导航）](./INDEX.md)
> **用途**：把业务决策与实现入口统一起来，避免口径漂移。

### 1. [世界观与节点结构 (World Structure)](./01-world-structure.md)
> **核心业务**：如何构建一个无限层级、可组合的世界观。
> **内容涵盖**：
> - 世界观的层级分类（地理、社会、生物等）
> - 组合节点 (Composite) 与原子节点 (Leaf) 的业务定义
> - 节点树的组织方式

### 2. [能力矩阵与交互 (Capabilities & Interaction)](./02-capabilities-interaction.md)
> **核心业务**：节点具备哪些业务能力，以及如何与用户/AI 交互。
> **内容涵盖**：
> - 核心能力清单 (KV, 生图, 渲染, 剧本)
> - **用户交互流**：编辑、版本管理、可视化
> - **AI 交互流**：工具调用、上下文感知、自动化生成

### 3. [创作工作流 (Creative Workflow)](./03-creative-workflow.md)
> **核心业务**：从灵感到产出的完整链路。
> **内容涵盖**：
> - 初始化 (Seed) 与模板
> - 运行 (Run) 与 重做 (Redo)
> - 聚合 (Aggregation) 与 导出

### 4. [模板系统调研与抽象 (Template Research & Proposal)](./04-template-system-research.md)
> **核心业务**：竞品（World Anvil / Campfire）模板体系的共性与抽象。

### 5. [模板组装系统（轻量 Section/Panel）](./05-template-assembly-system.md)
> **核心业务**：模板如何驱动“给创作者看的页面”，以及如何支持用户自定义（不走重低代码）。

### 6. [创作体验与 UI 指南（避免烂表单）](./06-authoring-ux-guidelines.md)
> **核心业务**：分类页/条目页的体验原则、空态引导、阅读流优先。

### 7. [AI 协作（Chat + Tools）与模板映射](./07-ai-coauthoring.md)
> **核心业务**：有 schema 后如何让 AI 填充，同时保留用户自由创作与版本化安全边界。
