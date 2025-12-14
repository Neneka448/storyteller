# 世界观模板可视化方案调研与设计

## 1. 问题分析与目标

### 1.1 当前系统的局限性

通过分析现有代码（`renderer/src/templates/registry.ts` 和 `types.ts`），当前模板系统存在以下局限：

1. **表单定制化不足**
   - KV 字段仅支持 `text` 和 `longtext` 两种类型
   - 缺少 `number`、`select`、`date`、`tags`、`reference`（实体链接）等常见字段类型
   - 每个叶子节点无法根据业务需求定制专属表单

2. **用户体验不友好**
   - 界面呈现为"表单填写"而非"百科条目阅读"
   - 缺少字段分组、折叠、优先级展示等交互优化
   - 没有空态引导和字段提示（prompt）的充分利用

3. **扩展性不足**
   - 用户无法在运行时添加自定义字段
   - 模板字段修改需要修改代码
   - 没有 Instance Overrides（节点级别的模板偏离）机制

4. **缺少 AI 协作能力**
   - 虽然字段有 `prompt`，但没有利用 LLM 自动填充
   - 无法通过对话让 AI 修改模板结构（如"给角色增加性格字段"）
   - 没有 AI 辅助的字段推荐与验证

### 1.2 目标

- **目标 1**：支持丰富的字段类型和定制化表单，每个节点类型可以有专属的编辑体验
- **目标 2**：提升用户体验，从"填表单"到"创作与阅读"
- **目标 3**：支持用户自定义扩展字段，支持节点级别的模板覆盖（Instance Overrides）
- **目标 4**：利用 LLM 辅助用户修改模板结构和自动填充内容

---

## 2. 竞品分析：模板系统最佳实践

### 2.1 World Anvil

**特点**：
- 固定的文章模板（Character, Location, Organization 等）
- 字段分为两类：
  - **Vignette (侧边栏)**：结构化数据（种族、年龄、性别、状态），快速参考
  - **主内容**：分标签页和分区（外观、心理、历史）
- 每个字段有详细的 **Prompts** 引导创作（如"描述角色的着装风格以及如何反映其地位"）
- 数据类型：文本、富文本、下拉、日期时间、实体链接、图片
- 布局：固定，侧边栏 + 标签页主内容区

**启示**：
- **Prompt-driven**: 字段提示词至关重要，既引导用户，也为 AI 提供 schema
- **分组与布局**：侧边栏放关键信息，主内容分标签页，符合阅读习惯
- **实体链接**：允许字段引用其他节点（如"出生地：[某城市]"），形成知识网络

### 2.2 Campfire Writing

**特点**：
- 模块化、灵活、基于"Elements"和"Panels"
- 字段类型：
  - **Attributes Panel**：自定义键值对（文本、数字、复选框）
  - **Text Panels**：富文本块，可重命名（如"背景故事"、"性格"）
  - **Relations Panel**：基于图的实体链接
- 布局：网格化，拖拽界面，用户可以自己设计模板
- 抽象：一个"角色"就是一套 Panels 的配置（Bio + Stats + Image + Notes）

**启示**：
- **Lightweight Section/Panel Assembly**：不是像素级表单搭建器，而是"大块积木"组装
- **用户可定制布局**：允许重命名、增删 Panel，但仍保持模板一致性
- **关系优先**：Relations Panel 强调实体间的网络关系

### 2.3 Notion / Airtable

**特点**：
- Database 视图：表格、看板、日历、画廊、时间轴
- 字段类型丰富：文本、数字、选择、多选、日期、人员、文件、公式、关联记录
- **Formula Fields**：支持计算字段（如"年龄 = 当前年份 - 出生年份"）
- **Relations & Rollup**：跨表关联与聚合

**启示**：
- **多视图**：同一数据可以有不同的展示方式（表格、卡片、时间轴）
- **公式与计算字段**：允许派生字段，减少手动维护
- **关联与聚合**：支持"一对多"和"多对多"关系

---

## 3. 设计方案：扩展字段类型与定制化表单

### 3.1 扩展字段类型（FieldValueType）

当前仅支持 `text` 和 `longtext`，建议扩展为：

```typescript
export type FieldValueType = 
  | 'text'           // 单行文本
  | 'longtext'       // 多行文本
  | 'richtext'       // 富文本（Markdown/WYSIWYG）
  | 'number'         // 数字
  | 'select'         // 单选下拉
  | 'multiSelect'    // 多选
  | 'checkbox'       // 布尔值
  | 'date'           // 日期
  | 'dateTime'       // 日期时间
  | 'tags'           // 标签数组
  | 'reference'      // 节点引用（单个）
  | 'references'     // 节点引用（多个）
  | 'image'          // 图片 URL
  | 'file'           // 文件 URL
  | 'color'          // 颜色选择器
  | 'rating'         // 星级/评分
  | 'formula'        // 计算字段（未来）
```

### 3.2 字段配置增强（TemplateField）

```typescript
export type TemplateField = {
  key: string              // 唯一键
  label: string            // 显示标签
  valueType: FieldValueType
  
  // UI 配置
  uiConfig?: {
    placeholder?: string
    helpText?: string      // 工具提示
    prompt?: string        // AI 创作提示
    options?: string[]     // select/multiSelect 的选项
    min?: number           // number/rating 最小值
    max?: number           // number/rating 最大值
    rows?: number          // longtext 默认行数
    nodeTypeFilter?: string[] // reference/references 的节点类型过滤
    format?: string        // date/dateTime 格式
  }
  
  // 验证
  required?: boolean       // 是否必填
  validate?: string        // 正则表达式或验证规则
  
  // 默认值
  defaultValue?: any
  
  // 分组（用于 UI 组织）
  group?: string           // 字段分组名（如"基础信息"、"外观"）
  
  // 绑定到 capability
  binding: CapabilityBinding
}
```

### 3.3 分组与布局增强

引入 **FieldGroup** 概念，组织字段显示：

```typescript
export type FieldGroup = {
  id: string               // 分组 ID
  label: string            // 分组标签
  fields: string[]         // 字段 key 数组
  collapsible?: boolean    // 是否可折叠
  defaultCollapsed?: boolean
  description?: string     // 分组说明
}

export type SectionKvGroup = {
  type: 'kvGroup'
  title: string
  capabilityId: 'kv'
  
  // 字段定义
  fields: TemplateField[]
  
  // 分组配置
  groups?: FieldGroup[]
  
  // 是否显示模板外字段
  showOtherFields?: boolean
  
  // 布局提示：'form' | 'card' | 'table'
  layout?: 'form' | 'card' | 'table'
}
```

### 3.4 示例：角色卡模板（增强版）

```typescript
{
  id: 'char.card.enhanced',
  label: '角色卡（增强版）',
  match: (t) => String(t || '').startsWith('char.card.'),
  requiredCapabilities: ['kv', 'memo', 'image'],
  sections: [
    // 侧边栏：头像和关键信息
    {
      type: 'kvGroup',
      title: '快速参考',
      capabilityId: 'kv',
      layout: 'card',
      fields: [
        {
          key: 'portrait',
          label: '头像',
          valueType: 'image',
          binding: { capabilityId: 'image', slot: 'portrait' }
        },
        {
          key: 'name',
          label: '姓名',
          valueType: 'text',
          required: true,
          binding: { capabilityId: 'kv', key: 'name' }
        },
        {
          key: 'role',
          label: '角色定位',
          valueType: 'select',
          uiConfig: {
            options: ['主角', '配角', '反派', '路人'],
            prompt: '这个角色在故事中的定位'
          },
          binding: { capabilityId: 'kv', key: 'role' }
        },
        {
          key: 'age',
          label: '年龄',
          valueType: 'number',
          uiConfig: { min: 0, max: 200 },
          binding: { capabilityId: 'kv', key: 'age' }
        },
        {
          key: 'gender',
          label: '性别',
          valueType: 'select',
          uiConfig: { options: ['男', '女', '其他', '未知'] },
          binding: { capabilityId: 'kv', key: 'gender' }
        },
        {
          key: 'faction',
          label: '所属势力',
          valueType: 'reference',
          uiConfig: {
            nodeTypeFilter: ['world.society.faction'],
            prompt: '角色所属的组织或阵营'
          },
          binding: { capabilityId: 'kv', key: 'faction' }
        }
      ]
    },
    
    // 主内容：外观、性格、背景
    {
      type: 'kvGroup',
      title: '详细设定',
      capabilityId: 'kv',
      layout: 'form',
      groups: [
        {
          id: 'appearance',
          label: '外观',
          fields: ['height', 'build', 'hair', 'eyes', 'clothing'],
          collapsible: true
        },
        {
          id: 'personality',
          label: '性格',
          fields: ['traits', 'likes', 'dislikes', 'fears'],
          collapsible: true
        },
        {
          id: 'background',
          label: '背景',
          fields: ['birthplace', 'occupation', 'relationships'],
          collapsible: true
        }
      ],
      fields: [
        // 外观组
        {
          key: 'height',
          label: '身高',
          valueType: 'text',
          group: 'appearance',
          uiConfig: { placeholder: '如：175cm' },
          binding: { capabilityId: 'kv', key: 'height' }
        },
        {
          key: 'build',
          label: '体型',
          valueType: 'select',
          group: 'appearance',
          uiConfig: { options: ['瘦弱', '匀称', '健壮', '肥胖'] },
          binding: { capabilityId: 'kv', key: 'build' }
        },
        {
          key: 'hair',
          label: '发型发色',
          valueType: 'text',
          group: 'appearance',
          uiConfig: { prompt: '描述发型、长度、颜色' },
          binding: { capabilityId: 'kv', key: 'hair' }
        },
        {
          key: 'eyes',
          label: '眼睛',
          valueType: 'text',
          group: 'appearance',
          uiConfig: { prompt: '眼睛颜色、形状' },
          binding: { capabilityId: 'kv', key: 'eyes' }
        },
        {
          key: 'clothing',
          label: '服饰风格',
          valueType: 'longtext',
          group: 'appearance',
          uiConfig: {
            rows: 3,
            prompt: '日常着装风格，如何反映其身份与性格'
          },
          binding: { capabilityId: 'kv', key: 'clothing' }
        },
        
        // 性格组
        {
          key: 'traits',
          label: '性格特质',
          valueType: 'tags',
          group: 'personality',
          uiConfig: {
            placeholder: '如：勇敢、冲动、固执',
            prompt: '用 3-5 个关键词描述性格'
          },
          binding: { capabilityId: 'kv', key: 'traits' }
        },
        {
          key: 'likes',
          label: '喜好',
          valueType: 'text',
          group: 'personality',
          binding: { capabilityId: 'kv', key: 'likes' }
        },
        {
          key: 'dislikes',
          label: '厌恶',
          valueType: 'text',
          group: 'personality',
          binding: { capabilityId: 'kv', key: 'dislikes' }
        },
        {
          key: 'fears',
          label: '恐惧',
          valueType: 'text',
          group: 'personality',
          uiConfig: { prompt: '角色最害怕的事物或情境' },
          binding: { capabilityId: 'kv', key: 'fears' }
        },
        
        // 背景组
        {
          key: 'birthplace',
          label: '出生地',
          valueType: 'reference',
          group: 'background',
          uiConfig: { nodeTypeFilter: ['world.geo.location'] },
          binding: { capabilityId: 'kv', key: 'birthplace' }
        },
        {
          key: 'occupation',
          label: '职业',
          valueType: 'text',
          group: 'background',
          binding: { capabilityId: 'kv', key: 'occupation' }
        },
        {
          key: 'relationships',
          label: '关键关系',
          valueType: 'references',
          group: 'background',
          uiConfig: {
            nodeTypeFilter: ['char.card.*'],
            prompt: '与其他角色的重要关系'
          },
          binding: { capabilityId: 'kv', key: 'relationships' }
        }
      ],
      showOtherFields: true
    },
    
    // 叙事文本
    {
      type: 'memoBlock',
      title: '人物小传',
      capabilityId: 'memo',
      prompt: '用叙事性的文字讲述这个角色的故事、经历、动机与成长弧线。'
    }
  ]
}
```

---

## 4. 设计方案：用户自定义扩展字段

### 4.1 Instance Overrides（节点级模板偏离）

**核心思想**：用户在某个节点上的改动，默认不影响模板，而是作为"实例覆盖"存储。

**数据结构**：

```typescript
export type InstanceOverride = {
  nodeId: string
  templateId: string
  
  // 字段级覆盖
  fieldOverrides?: {
    [fieldKey: string]: {
      hidden?: boolean        // 隐藏模板字段
      label?: string          // 重命名标签
      uiConfig?: Partial<...> // 修改 UI 配置
    }
  }
  
  // 新增自定义字段
  customFields?: TemplateField[]
  
  // Section 级覆盖
  sectionOverrides?: {
    [sectionId: string]: {
      hidden?: boolean
      order?: number
    }
  }
  
  // 新增自定义 Section
  customSections?: TemplateSection[]
}
```

**存储位置**：
- 方案 A：作为节点的一个 capability（`view` 或 `render`）
- 方案 B：存储在 project-level 的 `instanceOverrides` 表中（推荐，便于跨节点管理）

**UI 流程**：
1. 用户在 KvGroupSection 点击"添加字段"按钮
2. 弹出对话框：选择字段类型、输入标签和配置
3. 保存到 `customFields`
4. 渲染器合并模板字段 + 自定义字段显示

### 4.2 Promote to Template（提升为模板）

**场景**：用户在多个角色节点上都添加了"性格"字段，觉得应该统一到模板。

**流程**：
1. 在节点上右键 -> "将改动提升为模板"
2. 系统检测当前节点的 `customFields`
3. 弹出对话框：预览将要添加到模板的字段
4. 确认后，更新模板定义（生成新的模板版本）
5. 可选：应用到所有同类节点

**版本化策略**：
- 模板本身需要版本化（`templateVersion`）
- 节点记录其使用的模板版本号
- 升级模板时，已有节点可以选择：
  - 自动迁移到新模板（可能丢失 overrides）
  - 继续使用旧模板版本

---

## 5. 设计方案：AI 辅助模板修改

### 5.1 对话式模板修改

**用户需求**："给所有角色增加一个'性格'字段"

**实现路径**：通过 Agent Tool 调用

```typescript
// Tool: modify_template
{
  name: 'modify_template',
  description: '修改节点模板结构，如添加字段、修改字段配置',
  parameters: {
    type: 'object',
    properties: {
      templateId: {
        type: 'string',
        description: '模板 ID，如 char.card'
      },
      operation: {
        type: 'string',
        enum: ['addField', 'removeField', 'modifyField', 'reorderFields'],
        description: '操作类型'
      },
      field: {
        type: 'object',
        description: '字段定义',
        properties: {
          key: { type: 'string' },
          label: { type: 'string' },
          valueType: { type: 'string' },
          group: { type: 'string' },
          uiConfig: { type: 'object' }
        }
      }
    }
  }
}
```

**交互流程**：
1. 用户：给角色增加性格字段
2. AI 理解意图：需要在 `char.card` 模板的 KvGroup 中添加新字段
3. AI 调用 `modify_template`:
   ```json
   {
     "templateId": "char.card",
     "operation": "addField",
     "field": {
       "key": "personality",
       "label": "性格",
       "valueType": "tags",
       "group": "personality",
       "uiConfig": {
         "prompt": "用 3-5 个关键词描述角色性格特质",
         "placeholder": "如：勇敢、冲动、固执"
       }
     }
   }
   ```
4. 系统：执行修改，返回确认信息
5. AI：回复用户"已添加性格字段到角色卡模板"

### 5.2 智能字段推荐

**场景**：用户创建一个"魔法体系"节点，AI 推荐应该包含哪些字段。

**实现**：
- 基于节点类型（`nodeType`）和名称，AI 查询知识库或使用 Few-shot 推理
- 生成推荐字段列表
- 用户可选择性采纳

### 5.3 批量填充与验证

**Tool: auto_fill_field**

```typescript
{
  name: 'auto_fill_field',
  description: '根据上下文自动填充字段内容',
  parameters: {
    nodeId: string,
    fieldKey: string,
    context?: string  // 可选的额外上下文
  }
}
```

**流程**：
1. 用户在某个字段点击"AI 填充"按钮
2. 前端调用 Agent，传递节点 ID 和字段 key
3. AI 读取节点的其他字段、父节点的信息、世界观设定
4. AI 生成字段内容，保存为新版本（不自动 adopt）
5. 用户审阅后采纳或重新生成

---

## 6. 技术实现路线图

### 6.1 第一阶段：扩展字段类型（2-3 天）

**目标**：支持 `number`, `select`, `tags`, `checkbox`, `date` 等常见类型

**任务**：
1. 更新 `types.ts` 中的 `FieldValueType`
2. 在 `KvGroupSection.vue` 中实现各类型的渲染组件
3. 更新 `registry.ts` 中的模板定义，使用新字段类型
4. 测试各字段类型的存储与版本化

### 6.2 第二阶段：字段分组与布局优化（2 天）

**目标**：支持 `FieldGroup`，实现可折叠分组

**任务**：
1. 在 `types.ts` 中定义 `FieldGroup`
2. 更新 `SectionKvGroup` 结构
3. 在 `KvGroupSection.vue` 中实现分组渲染
4. 实现折叠/展开交互
5. 更新示例模板（角色卡）

### 6.3 第三阶段：Instance Overrides（3-4 天）

**目标**：支持节点级的字段自定义

**任务**：
1. 设计 `InstanceOverride` 数据结构
2. 在数据库中添加 `instance_overrides` 表
3. 实现"添加自定义字段"的 UI 交互
4. 在模板渲染时合并模板字段 + 自定义字段
5. 实现字段的隐藏、重命名功能

### 6.4 第四阶段：Promote to Template（2 天）

**目标**：将实例改动提升为模板变更

**任务**：
1. 实现模板版本化系统
2. 实现"提升为模板"的 UI 与逻辑
3. 处理版本迁移与冲突
4. 测试跨节点的模板升级

### 6.5 第五阶段：AI 辅助功能（3-4 天）

**目标**：通过 Agent Tool 实现模板修改与字段填充

**任务**：
1. 实现 `modify_template` Tool
2. 实现 `auto_fill_field` Tool
3. 在 Chat 中集成模板修改功能
4. 实现智能字段推荐
5. 测试端到端的 AI 协作流程

---

## 7. UX 改进建议

### 7.1 从"表单"到"条目页"

**现状问题**：当前界面像管理后台表单，不像创作工具。

**改进方向**：
- **阅读模式 + 内联编辑**：默认显示为"百科条目页"，字段值以阅读友好的方式展示，点击即可编辑
- **卡片化布局**：关键信息卡片化（如侧边栏的快速参考），而不是平铺的表单行
- **Markdown 渲染**：`longtext` 和 `richtext` 字段在阅读模式下渲染为格式化文本

### 7.2 空态引导与字段提示

- **空字段提示**：字段为空时显示 `prompt` 作为引导语，而不是简单的 placeholder
- **AI 填充按钮**：每个字段旁边显示"✨ AI 填充"按钮
- **字段关联提示**：如"出生地"字段显示"选择一个地理位置节点"

### 7.3 版本对比与审阅

- **Diff 视图**：选择两个版本进行对比，高亮差异
- **批注与评论**：在字段级别添加批注（如"这个性格描述不够立体"）
- **A/B 采纳**：AI 生成多个版本，用户选择采纳

### 7.4 快捷操作

- **快速创建子节点**：在分类页点击"+ 添加角色"，自动创建并应用模板
- **模板切换**：节点创建后可以切换模板（如从"角色草案"升级为"角色卡"）
- **批量操作**：选择多个节点，批量添加字段或执行 AI 填充

---

## 8. 风险与对策

### 8.1 模板复杂度膨胀

**风险**：字段类型、分组、覆盖规则越来越复杂，难以维护。

**对策**：
- 保持模板的"大块积木"哲学，不要做像素级表单搭建器
- 优先支持最常用的 20% 功能，满足 80% 需求
- 提供"简单模式"和"高级模式"切换

### 8.2 数据迁移与版本兼容

**风险**：模板升级后，已有节点的数据可能不兼容。

**对策**：
- 节点记录其使用的模板版本号
- 提供迁移工具，自动或半自动迁移数据
- 允许节点继续使用旧模板版本

### 8.3 AI 生成质量

**风险**：AI 推荐的字段或填充的内容质量不高。

**对策**：
- AI 生成的内容不自动 adopt，必须用户审阅
- 提供"重新生成"和"手动修改"选项
- 收集用户反馈，持续优化 Prompt

---

## 9. 总结

本方案通过以下几个方面解决当前模板系统的局限：

1. **扩展字段类型**：从 2 种扩展到 15+ 种，覆盖常见业务需求
2. **字段分组与布局**：引入 `FieldGroup`，支持折叠与分区，提升可读性
3. **Instance Overrides**：允许用户在节点级自定义字段，不影响模板
4. **Promote to Template**：将实例改动提升为模板变更，实现模板演进
5. **AI 辅助**：通过 Tool 调用实现对话式模板修改和自动填充
6. **UX 优化**：从"表单填写"转向"百科条目 + 内联编辑"，提升创作体验

**下一步行动**：
- 按照技术路线图分阶段实施
- 优先完成字段类型扩展和分组功能，验证方向
- 并行设计 Instance Overrides 的数据结构与 UI 交互
- 最后集成 AI 辅助功能，形成完整闭环
