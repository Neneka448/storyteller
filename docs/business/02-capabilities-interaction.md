# 02. 能力矩阵与交互 (Capabilities & Interaction)

## 1. 核心能力矩阵 (Capabilities Matrix)

节点不仅仅是数据容器，更是“能力”的集合。以下是核心业务能力：

| 能力名称 | 业务定义 | 数据形态 | AI 交互 (Tools) | UI 表现 |
| :--- | :--- | :--- | :--- | :--- |
| **KV (设定词典)** | 结构化的属性定义 | `{ items: [{k,v}] }` | `update_kv` | 键值对编辑器 |
| **Text (长文本)** | 叙事性描述、大纲 | Markdown String | `update_text` | 富文本编辑器 |
| **GenImage (生图)** | 视觉化呈现 | `{ url, prompt }` | `generate_image` | 图片预览 + 重绘按钮 |
| **Renderable (自定义渲染)** | 复杂数据的可视化 | `{ html, css, js }` | `render_view` | 沙箱预览 (Sandbox) |
| **Timeline (时间轴)** | 历史事件序列 | `{ events: [{date, title}] }` | `update_timeline` | 时间轴视图 |
| **Graph (关系图)** | 实体间连接 | `{ nodes, edges }` | `update_graph` | 节点关系图谱 |

## 2. 交互流程设计

### 2.1 用户交互 (User Interaction)
用户是创作的主导者，通过 UI 直接操作节点能力。

- **编辑 (Edit)**: 直接修改 KV、文本或拖拽时间轴。
- **版本管理 (Versioning)**:
  - 查看历史版本。
  - **采纳 (Adopt)**: 选择一个满意版本作为当前生效版本。
  - **基线重做 (Redo)**: 基于某个旧版本，要求 AI "Refine" 或 "Rewrite"。
- **组合 (Compose)**: 拖拽节点改变层级，右键新增子节点。

### 2.2 AI 交互 (AI Interaction)
AI 是创作的协作者，通过 Tool Calling 操作节点能力。

- **感知 (Perception)**:
  - AI 能够读取当前节点的 Schema（知道能填什么）。
  - AI 能够读取父节点的 Summary（知道上下文）。
- **行动 (Action)**:
  - **Step Run**: 用户输入指令 -> AI 分析 -> 调用 `update_kv` 或 `generate_image` -> 生成新版本。
  - **Chat**: 用户在对话框提问 -> AI 读取节点数据 -> 回答或调用工具修改。
- **反馈 (Feedback)**:
  - 如果 AI 生成的数据不符合 Schema，系统自动报错并要求 AI 重试。

### 2.3 渲染交互 (Rendering Interaction)
前端渲染器是“哑”的，它只负责展示数据。

- **动态挂载**: 节点有什么能力，UI 就渲染什么面板。
  - 例子：一个“角色卡”节点同时有 `KV` (属性) 和 `GenImage` (立绘)。UI 会同时渲染 KV 编辑器和图片预览区。
- **自定义渲染 (Renderable)**:
  - 场景：用户想看“势力分布雷达图”。
  - 流程：AI 生成 HTML/JS 代码 -> 存入节点 -> UI 沙箱执行代码 -> 展示雷达图。
  - 价值：无需开发新组件，即可支持无限种类的可视化需求。
