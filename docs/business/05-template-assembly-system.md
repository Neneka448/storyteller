# 05. 模板组装系统（Template Assembly System）

> 结论先行：我们采用 Campfire 风格的“Section/Panel 组装”，而不是精细到每个 input 的低代码表单搭建器。
>
> - 对用户：像在搭建“百科条目页/角色卡页”，而不是填管理后台表单。
> - 对系统：模板只是“展示与编辑方案”，底层仍由 capabilities（kv/memo/image…）负责存储与版本化。

## 1. 设计目标

- **展示给创作者看的**：可阅读、可浏览、可写作（阅读流优先，编辑是轻打断）。
- **可 AI 协作**：模板提供 schema/prompt，Chat/Tools 可以按模板填充，但永远保留用户的自由编辑。
- **可演进**：先支持少量 Section 类型，后续再加关系/时间轴/地图等专用 Section。
- **可自定义**：用户能在 UI 中增删 Section、增删字段（但不走“拖拽搭表单”的重方案）。

## 2. 核心抽象：Template / Section / Binding

### 2.1 Template（模板）

一个模板描述“某类节点应该如何呈现与编辑”。模板不等于节点类型，但通常通过 `node.type` 命中默认模板。

模板包含：
- `templateId`：唯一标识
- `match`：匹配条件（如 `world.category.*`）
- `requiredCapabilities`：最小能力集合（渲染所需），缺失则引导用户补齐或降级显示
- `sections[]`：页面由哪些大块组成（顺序即布局）
- `uiHints`：轻量布局提示（是否有 sidebar、header image 等）

### 2.2 Section（大块积木）

Section 是“用户能理解的模块”，并且每个模块对应一类交互：

- `ChildrenList`：显示子节点（分类页核心）
- `KvGroup`：结构化事实（以“信息卡/infobox”方式呈现）
- `MemoBlock`：叙事文本（以文章段落方式呈现）
- `ImageBlock`：头图/插图
- `Links/Relations`（后续）：与其他节点的关联
- `Timeline/Map/Graph`（后续）：专用视角

我们优先做前 4 个，满足“世界观分类页 / 条目页 / 角色卡”的 80% 场景。

### 2.3 Binding（绑定协议）

Binding 解决“这个 UI 模块读写哪里的数据”。底层仍然是 capabilities 的 artifact 数据。

推荐绑定形式：
- KV：`{ capability: 'kv', groupId: 'basic', fields: [...] }`
- Memo：`{ capability: 'memo', blockId: 'history', heading?: '历史' }`
- Image：`{ capability: 'image', slot: 'cover' }`
- Children：`{ source: 'nodeTree', filter?: {...} }`

> 注意：Binding 是模板层的协议，不要求底层 capability 立刻支持复杂 schema；可以先在渲染层做字段映射。

## 3. 字段管理（Field Model）

### 3.1 KvGroup 的字段不是自由 KV 表

KV 作为存储形态没问题，但给用户看的 UI 不应该是“随意加 k/v”。

KvGroup 内部字段应是“模板驱动的字段列表”，字段结构至少包含：
- `key`：存储 key（落到 kv.items 的 k）
- `label`：展示名
- `valueType`：`text | number | select | tags | reference | longtext`（渲染控件类型）
- `prompt`：引导语（可被 AI 使用）
- `optional`：是否可缺省

如果 kv 中出现模板未声明的 key：
- UI 放到“其他/自定义”折叠组展示，确保不丢数据。

### 3.2 MemoBlock 支持多块（多实例）

参考 Campfire：用户可以添加多个文本块并命名：
- “概述”
- “历史”
- “文化”
- “出场记录”

落地方式（建议）：
- 仍然使用一个 memo capability 存储全文，但通过 heading 或内部分隔符管理块（MVP：按标题）
- 或（后续）memo capability 支持 `sections` 结构化存储

## 4. 自定义与扩展性：Instance Overrides & Promote

### 4.1 Instance Overrides（节点级偏离）

用户在某个节点上做的改动，默认不影响模板：
- 增加一个 MemoBlock
- KvGroup 里新增一个字段
- 调整 Section 顺序

这些改动存到节点自己的“视图配置”（view config）里：
- 作为 node 的一个 capability（例如 `view` / `render`）
- 或作为模板系统的实例覆盖记录（project-scoped）

### 4.2 Promote（提升为模板）

当用户觉得“这套改动以后都想用”，提供显式操作：
- Promote changes to template

并且要有冲突策略（多人/多节点不同改动）：
- 以模板为基线，Promote 产生一个新模板版本

## 5. 版本化与采纳策略（与现有 artifacts 对齐）

- 任何写入（用户或 AI）都产生新版本（append version）
- Adopt 是显式操作
- 模板系统的 schema 本身也需要版本（模板版本），但与内容版本独立

## 6. 运行时降级策略（Template 缺失/能力缺失）

- 找不到模板：降级到“能力面板堆叠模式（Raw Capabilities）”
- 模板要求的能力缺失：提示补齐（或临时隐藏对应 Section）

## 7. 与 DAG/树展示的关系

- DAG（树状）负责结构浏览
- Template（分类页）在 Inspector 侧提供“子节点列表 + 概述 + 快捷创建”
- 两者互补：DAG 看全局结构，Inspector 看当前条目内容
