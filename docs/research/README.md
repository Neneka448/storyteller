# 世界观模板可视化方案调研文档

本目录包含关于世界观模板系统改进的完整调研、设计和实施计划。

## 背景

当前模板系统存在三个主要局限：
1. **定制化不足**：字段类型有限，无法满足不同节点类型的专属需求
2. **用户体验不佳**：界面呈现为"表单填写"而非"创作与阅读"
3. **扩展性不足**：用户无法自定义字段，AI 协作能力有限

## 文档结构

### [01-worldview-template-visualization-research.md](./01-worldview-template-visualization-research.md)

**核心内容**：
- 当前系统的局限性分析
- 竞品调研（World Anvil、Campfire Writing、Notion）
- 字段类型扩展方案（从 2 种到 15+ 种）
- 字段分组与布局设计
- Instance Overrides 机制设计
- 技术实现路线图（分 5 个阶段）

**关键设计**：
- 扩展 `FieldValueType` 到 15+ 种类型
- 引入 `FieldGroup` 支持字段分组
- 设计 `InstanceOverride` 数据结构，支持节点级模板偏离
- 提出 "Promote to Template" 流程

**适合读者**：产品经理、前端开发、架构师

---

### [02-ai-template-modification-design.md](./02-ai-template-modification-design.md)

**核心内容**：
- AI 辅助模板修改的核心场景
- Agent Tools 设计（`modify_template`, `auto_fill_field`, `recommend_template_fields`）
- 对话式模板修改流程
- Prompt 工程与上下文管理
- 安全性与权限控制

**关键设计**：
- `modify_template` Tool：通过对话添加/删除/修改字段
- `auto_fill_field` Tool：根据上下文自动填充字段内容
- `recommend_template_fields` Tool：为新节点类型推荐字段
- `generate_template_diagram` Tool：生成 Mermaid 可视化图（新增）
- Few-shot 示例库与 Prompt 策略
- **Mermaid 集成**：AI 生成 Mermaid 图展示模板结构，用户可直接编辑代码

**适合读者**：AI 工程师、后端开发、产品经理

---

### [03-ux-improvement-and-customized-forms.md](./03-ux-improvement-and-customized-forms.md)

**核心内容**：
- UI/UX 改进设计原则（阅读优先、信息分层、引导与提示）
- 布局模式：卡片式 vs 表单式
- 字段渲染策略（内联编辑、空字段引导、Markdown 渲染）
- 侧边栏设计（快速参考区）
- 版本对比 Diff 视图
- 响应式与无障碍访问

**关键设计**：
- 双模式切换：阅读模式（默认）+ 编辑模式
- 内联编辑：点击即编辑，失焦自动保存
- 空字段引导卡片：显示 prompt 和 AI 填充按钮
- 侧边栏快速参考：显示关键信息和快捷操作
- 字段级 UI 定制：`renderAs`, `icon`, `color`, `size`

**适合读者**：UI/UX 设计师、前端开发、产品经理

---

### [04-implementation-roadmap.md](./04-implementation-roadmap.md)

**核心内容**：
- 四个里程碑的完整实施计划
- 详细的任务拆分与时间估算
- 测试计划（单元测试、集成测试、用户验收测试）
- 风险与对策
- 发布计划（Alpha/Beta/RC/正式版）
- 后续演进方向

**四个里程碑**：
1. **Milestone 1**：字段类型扩展（2-3 天）
2. **Milestone 2**：UI 体验改进（2 周）
   - 2.1: 字段分组与折叠（3 天）
   - 2.2: 阅读模式与内联编辑（4 天）
   - 2.3: 侧边栏与快捷操作（3 天）
   - 2.4: 版本对比 Diff 视图（2 天）
3. **Milestone 3**：Instance Overrides（1 周）
4. **Milestone 4**：AI 辅助功能（1 周）

**总计**：约 4-5 周

**适合读者**：项目经理、开发团队、测试团队

---

### [05-graph-based-field-relationships.md](./05-graph-based-field-relationships.md)

**核心内容**：
- 图结构（Node-Edge）方式的模板系统设计
- 字段关系类型（依赖、派生、引用、分组、顺序、条件）
- 可视化编辑器设计（类似 n8n 的画布）
- 运行时依赖处理与条件渲染
- 与现有设计的融合（混合模式）

**关键设计**：
- **FieldNode**：字段作为节点，包含类型、配置、位置
- **RelationshipEdge**：字段关系作为边，支持 6 种关系类型
- **可视化编辑**：拖拽节点和连线建立关系，无需编写 JSON
- **派生字段**：通过公式自动计算（如：年龄 = 当前年份 - 出生年份）
- **条件显示**：根据源字段值动态显示/隐藏目标字段
- **混合模式**：简单模式（字段列表）+ 图模式（复杂关系）共存

**适合读者**：架构师、前端开发、产品经理、交互设计师

**💡 为什么需要这个文档**：
针对用户反馈"JSON schema 编辑对用户不友好"的问题，提出了更直观的图结构方案。图结构让字段关系可视化，用户通过拖拽连线即可建立复杂的依赖、派生、条件关系，比编辑配置文件更友好。

**🎨 Mermaid 可视化增强**：
AI 可以轻松生成 Mermaid 图代码表示模板结构，用户可以直接在浏览器中看到图形预览并编辑代码。这让模板设计变得极其简单：用户描述需求 → AI 生成 Mermaid 图 → 用户预览/编辑 → 一键应用。Mermaid 代码简洁易读，AI 原生支持，是完美的中间格式。

---

## 快速导航

### 按角色

**产品经理**：
1. 先读 [01-worldview-template-visualization-research.md](./01-worldview-template-visualization-research.md) 了解整体方案
2. 再读 [03-ux-improvement-and-customized-forms.md](./03-ux-improvement-and-customized-forms.md) 了解 UX 设计
3. 最后读 [04-implementation-roadmap.md](./04-implementation-roadmap.md) 确认发布计划

**前端开发**：
1. 先读 [03-ux-improvement-and-customized-forms.md](./03-ux-improvement-and-customized-forms.md) 了解 UI 实现
2. 再读 [01-worldview-template-visualization-research.md](./01-worldview-template-visualization-research.md) 第 3-4 节
3. 最后读 [04-implementation-roadmap.md](./04-implementation-roadmap.md) 的任务清单

**后端/AI 开发**：
1. 先读 [02-ai-template-modification-design.md](./02-ai-template-modification-design.md) 了解 Tools 设计
2. 再读 [01-worldview-template-visualization-research.md](./01-worldview-template-visualization-research.md) 第 4-5 节
3. 最后读 [04-implementation-roadmap.md](./04-implementation-roadmap.md) Milestone 4

**UI/UX 设计师**：
1. 直接读 [03-ux-improvement-and-customized-forms.md](./03-ux-improvement-and-customized-forms.md)
2. 参考 [01-worldview-template-visualization-research.md](./01-worldview-template-visualization-research.md) 第 2 节竞品分析

### 按任务

**我要实现字段类型扩展**：
- 读 [01-worldview-template-visualization-research.md](./01-worldview-template-visualization-research.md) 第 3 节
- 读 [04-implementation-roadmap.md](./04-implementation-roadmap.md) Milestone 1

**我要实现 UI 改进**：
- 读 [03-ux-improvement-and-customized-forms.md](./03-ux-improvement-and-customized-forms.md) 全文
- 读 [04-implementation-roadmap.md](./04-implementation-roadmap.md) Milestone 2

**我要实现自定义字段**：
- 读 [01-worldview-template-visualization-research.md](./01-worldview-template-visualization-research.md) 第 4 节
- 读 [04-implementation-roadmap.md](./04-implementation-roadmap.md) Milestone 3

**我要实现 AI 辅助**：
- 读 [02-ai-template-modification-design.md](./02-ai-template-modification-design.md) 全文
- 读 [04-implementation-roadmap.md](./04-implementation-roadmap.md) Milestone 4

---

## 核心设计决策

### 1. 轻量级 Section/Panel 组装，而非重低代码

**决策**：采用 Campfire 风格的"大块积木"组装，而不是像素级表单搭建器。

**理由**：
- 降低复杂度，易于维护
- 满足 80% 的需求，同时保持灵活性
- 避免陷入"万能表单设计器"的陷阱

### 2. 阅读优先，内联编辑

**决策**：默认以"百科条目页"形式展示，点击字段即可编辑。

**理由**：
- 提升信息可读性
- 减少认知负担（不是在"填表单"）
- 编辑操作更自然流畅

### 3. Instance Overrides 而非强制模板统一

**决策**：允许节点级别的模板偏离，而不是强制所有节点使用统一模板。

**理由**：
- 创作过程中，某些节点可能需要特殊字段
- 避免为了一个特例而修改全局模板
- 提供 "Promote to Template" 机制，平衡灵活性与一致性

### 4. AI 不自动采纳，必须用户审阅

**决策**：AI 生成的内容保存为新版本，但不自动 adopt。

**理由**：
- 避免 AI 生成质量问题破坏用户数据
- 给用户完全的控制权
- 培养"AI 是助手，用户是决策者"的心智模型

### 5. 版本化透明，支持回滚

**决策**：模板本身版本化，节点记录使用的模板版本号。

**理由**：
- 模板升级不破坏已有节点
- 用户可以选择何时迁移到新模板
- 支持回滚到旧版本模板

---

## 预期成果

完成实施后，我们将实现：

### 功能层面

- ✅ 支持 15+ 种字段类型（text, number, select, tags, reference, richtext 等）
- ✅ 字段分组与折叠，支持信息分层
- ✅ 节点级自定义字段，不影响模板
- ✅ 对话式模板修改（"给角色增加性格字段"）
- ✅ AI 自动填充字段（根据上下文推理）
- ✅ 版本对比 Diff 视图

### 体验层面

- ✅ 从"表单填写"转向"创作与阅读"
- ✅ 关键信息一目了然（侧边栏 + 快速参考）
- ✅ 内联编辑，流畅自然
- ✅ AI 辅助无处不在，但不打扰用户
- ✅ 版本管理透明，支持对比和回滚

### 技术层面

- ✅ 模板系统高度可扩展
- ✅ UI 组件化、可复用
- ✅ 数据版本化、可追溯
- ✅ AI Tools 可组合、可测试

---

## 参考资料

### 竞品

- [World Anvil](https://www.worldanvil.com/) - 结构化世界构建工具
- [Campfire Writing](https://www.campfirewriting.com/) - 模块化创作工具
- [Notion](https://www.notion.so/) - 数据库与多视图
- [Airtable](https://www.airtable.com/) - 灵活的字段类型

### 技术参考

- [Vue 3 文档](https://vuejs.org/) - 前端框架
- [Electron 文档](https://www.electronjs.org/) - 桌面应用
- [OpenAI Tool Calling](https://platform.openai.com/docs/guides/function-calling) - Agent Tools 设计
- [JSON Schema](https://json-schema.org/) - 数据验证

---

## 更新日志

- **2025-12-14**: 初始版本，包含四份完整的调研与设计文档

---

## 反馈与讨论

如有疑问或建议，请在项目中提出 Issue 或在团队会议中讨论。

**联系方式**：
- Issue Tracker: [GitHub Issues](https://github.com/Neneka448/storyteller/issues)
- 团队讨论: 请在 #storyteller-dev 频道讨论
