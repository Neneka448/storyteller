# 07. AI 协作（Chat + Tools）与模板映射

目标：让 AI 成为“可控的协作者”——能按模板填充与扩写，但不夺走用户的创作主导权。

## 1. 协作原则

- **AI 默认产出草稿版本**：写入必须走版本化（append version），不自动 adopt。
- **用户永远可以手改**：模板提供结构，不限制用户随时自由改写。
- **schema 用于约束输出，不用于强制输入**：AI 更严格，用户更自由。

## 2. 模板如何喂给模型（Schema Prompt）

模板为每个 Section/Field 提供：
- `label`：字段/块名称
- `prompt`：引导语（要写得像创作提示，而不是表单说明）
- `valueType`：文本/数字/枚举/引用
- `examples`（可选）：高质量示例

Runner/Chat 组合上下文时应包含：
- 当前节点的模板结构（sections + fields + prompts）
- 当前节点已 adopted 的内容摘要（避免胡写）
- 父级/路径摘要（世界观上下文）

## 3. AI 写入模式（两种都要）

### 3.1 结构化填充（Fill Schema）

场景：开局补全空壳节点、批量生成设定。
- 输出目标：对每个 KvGroup 字段给出值；对每个 MemoBlock 给出段落。
- 失败策略：字段缺失可留空并给 TODO；类型不对则重试。

### 3.2 自由扩写 + 事实抽取（Write then Extract）

场景：用户更关注创作流与可读性。
- 第一步：AI 先写一段可读的 Memo 草稿
- 第二步：从 Memo 草稿中抽取事实回填 Kv（可选/半自动）

> 这能避免“为了结构化而牺牲文风”的问题。

## 4. Tools 映射（保持底层能力稳定）

模板不会创造新的存储类型；Tools 仍然围绕能力：
- `update_kv`：写入 kv（字段映射到 key）
- `update_text` / `update_memo`：写入 memo（按 block/heading 更新或整体替换）
- `generate_image`：生成/更新 image

模板系统只需要提供“从模板字段 → capability payload”的编排层。

## 5. 安全边界与 UI 约束

- Chat 的默认动作：**生成草稿版本**
- 明确的用户动作：采纳（Adopt）
- 若 AI 影响范围较大（覆盖多个 Section）：必须提示“将创建新版本”

## 6. 校验（Validation）

- 对 AI：可以更严格
  - 数字字段必须是数字
  - 枚举字段必须在 options 内
  - 引用字段必须是有效 nodeId 或可创建待办
- 对用户：尽量宽松
  - 不阻塞保存
  - 允许“暂时不完整”

## 7. 与版本化体系对齐

- 内容版本：由 capability artifact store 管
- 模板版本：模板定义本身也需要版本（后续），但与内容版本解耦
- 采纳策略：内容采纳与模板变更互不影响
