# Business Docs Index（业务文档索引）

目标：把业务决策、交互原则、AI 协作与模板系统的“共识”固定下来，避免实现阶段来回改口径。

## 快速入口（按你现在在做什么）

- 我在梳理世界观树/节点类型：看 [01-world-structure.md](01-world-structure.md)
- 我在梳理能力与交互：看 [02-capabilities-interaction.md](02-capabilities-interaction.md)
- 我在梳理创作工作流（Seed/Run/Redo/聚合）：看 [03-creative-workflow.md](03-creative-workflow.md)
- 我在梳理模板系统（竞品与抽象）：看 [04-template-system-research.md](04-template-system-research.md)
- 我在规划模板“组装系统”（轻量 Panel/Section，而非重低代码）：看 [05-template-assembly-system.md](05-template-assembly-system.md)
- 我在做“给创作者看的体验”而非后台表单：看 [06-authoring-ux-guidelines.md](06-authoring-ux-guidelines.md)
- 我在做 Chat/Tools 让 AI 填表/写文但不破坏用户创作：看 [07-ai-coauthoring.md](07-ai-coauthoring.md)

## 阅读顺序（按角色）

- 产品/业务：01 → 03 → 06 → 07 → 05
- 前端实现：06 → 05 → 02 → 07
- 后端/能力实现：02 → 07 → 05 → 03

## 关键术语对照

- Node：树上的节点，承载结构关系与元数据。
- Capability：节点挂载的底层能力（kv/memo/image/sandbox/storyboard…），负责数据形态与版本化。
- Template：面向用户的“展示与编辑方案”。
- Section（推荐抽象）：模板里的大块积木（ChildrenList/KvGroup/MemoBlock/Image…）。
- Binding：Section/Field 如何映射到 capability 的实际存储。
- Instance Overrides：某个节点对模板的局部偏离（加/删 Section 或字段），不立刻影响模板。
- Promote：把 Instance 的改动提升为模板变更（可选）。

## 约束（共识）

- 底层能力保持稳定：模板是视图层，不应改变持久化模型（仍落到 artifacts 版本化体系）。
- AI 写入必须可控：默认生成新版本，不自动 adopt。
- 体验优先：避免“烂表单”，尽量呈现为“可阅读的条目/百科页”，点击即编辑。
