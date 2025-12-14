# AI 辅助模板修改系统设计

## 1. 概述

本文档详细设计如何利用大模型（LLM）帮助用户修改模板结构、扩展字段、自动填充内容。核心思想是**将模板操作暴露为 Agent Tools**，让 AI 成为用户的"模板设计助手"。

---

## 2. 核心场景与用户需求

### 2.1 场景 1：动态添加字段

**用户说**："给所有角色增加一个'性格'字段"

**系统行为**：
1. AI 理解意图：需要修改 `char.card` 模板
2. AI 调用 `modify_template` Tool，添加字段
3. 系统更新模板定义
4. AI 回复确认信息
5. 用户的所有角色节点立即生效（或提示用户选择是否应用）

### 2.2 场景 2：批量字段填充

**用户说**："帮我把所有角色的'性格'字段都填上"

**系统行为**：
1. AI 遍历所有 `char.card.*` 节点
2. 对每个节点调用 `auto_fill_field`
3. AI 根据节点的名称、已有字段、世界观背景推理性格
4. 生成多个版本供用户审阅和采纳

### 2.3 场景 3：模板推荐与初始化

**用户说**："我要创建一个'魔法体系'节点"

**系统行为**：
1. AI 识别节点类型：`world.magic.system`
2. AI 推荐字段：名称、分类、能量来源、施法方式、限制条件、著名法术等
3. 系统基于推荐生成临时模板
4. 用户确认后创建节点并应用模板

### 2.4 场景 4：模板结构重组

**用户说**："把角色卡的'外观'字段都移到一个单独的分组里"

**系统行为**：
1. AI 调用 `reorganize_template` Tool
2. 创建新的 `FieldGroup`："外观"
3. 将相关字段移入该分组
4. 更新模板定义

---

## 3. Agent Tools 设计

### 3.1 Tool: `modify_template`

**功能**：修改模板结构（添加/删除/修改字段或 Section）

**接口定义**：

```typescript
interface ModifyTemplateArgs {
  templateId: string           // 模板 ID，如 'char.card'
  operation: 'addField' | 'removeField' | 'modifyField' | 'addSection' | 'removeSection'
  
  // 字段操作参数
  field?: {
    key: string
    label: string
    valueType: FieldValueType
    group?: string
    uiConfig?: {
      placeholder?: string
      helpText?: string
      prompt?: string
      options?: string[]
      min?: number
      max?: number
    }
    required?: boolean
    defaultValue?: any
    binding: CapabilityBinding
  }
  
  // Section 操作参数
  section?: TemplateSection
  
  // 是否立即应用到所有节点
  applyToExistingNodes?: boolean
}
```

**Tool 定义**（供 LLM 调用）：

```json
{
  "name": "modify_template",
  "description": "修改节点模板的结构，可以添加、删除或修改字段和区块。用于响应用户对模板结构的调整需求。",
  "parameters": {
    "type": "object",
    "properties": {
      "templateId": {
        "type": "string",
        "description": "要修改的模板 ID，如 'char.card' 表示角色卡模板"
      },
      "operation": {
        "type": "string",
        "enum": ["addField", "removeField", "modifyField", "addSection", "removeSection"],
        "description": "操作类型：addField=添加字段, removeField=删除字段, modifyField=修改字段, addSection=添加区块, removeSection=删除区块"
      },
      "field": {
        "type": "object",
        "description": "字段定义，当 operation 为 *Field 时必填",
        "properties": {
          "key": {
            "type": "string",
            "description": "字段的唯一键，如 'personality'"
          },
          "label": {
            "type": "string",
            "description": "字段的显示标签，如 '性格'"
          },
          "valueType": {
            "type": "string",
            "enum": ["text", "longtext", "richtext", "number", "select", "multiSelect", "checkbox", "date", "tags", "reference", "references"],
            "description": "字段值类型"
          },
          "group": {
            "type": "string",
            "description": "字段所属分组，如 'appearance', 'personality'"
          },
          "uiConfig": {
            "type": "object",
            "description": "UI 配置选项",
            "properties": {
              "placeholder": { "type": "string" },
              "helpText": { "type": "string" },
              "prompt": { "type": "string", "description": "创作引导提示" },
              "options": { "type": "array", "items": { "type": "string" } },
              "min": { "type": "number" },
              "max": { "type": "number" }
            }
          },
          "required": {
            "type": "boolean",
            "description": "是否必填"
          },
          "defaultValue": {
            "description": "默认值"
          }
        },
        "required": ["key", "label", "valueType"]
      },
      "applyToExistingNodes": {
        "type": "boolean",
        "description": "是否立即应用到所有使用该模板的现有节点（默认 false）"
      }
    },
    "required": ["templateId", "operation"]
  }
}
```

**实现逻辑**：

```typescript
async function modifyTemplate(args: ModifyTemplateArgs): Promise<{
  success: boolean
  message: string
  affectedNodeCount?: number
}> {
  const { templateId, operation, field, section, applyToExistingNodes } = args
  
  // 1. 加载当前模板
  const template = await templateRegistry.load(templateId)
  if (!template) {
    return { success: false, message: `模板 ${templateId} 不存在` }
  }
  
  // 2. 执行操作
  switch (operation) {
    case 'addField':
      if (!field) {
        return { success: false, message: '缺少 field 参数' }
      }
      // 找到 kvGroup section 并添加字段
      const kvSection = template.sections.find(s => s.type === 'kvGroup')
      if (!kvSection) {
        return { success: false, message: '模板中没有 kvGroup section' }
      }
      // 检查字段是否已存在
      if (kvSection.fields.some(f => f.key === field.key)) {
        return { success: false, message: `字段 ${field.key} 已存在` }
      }
      // 添加字段
      kvSection.fields.push({
        key: field.key,
        label: field.label,
        valueType: field.valueType,
        group: field.group,
        uiConfig: field.uiConfig,
        required: field.required,
        defaultValue: field.defaultValue,
        binding: field.binding || { capabilityId: 'kv', key: field.key }
      })
      break
      
    case 'removeField':
      // 类似逻辑，从 fields 数组中移除
      break
      
    case 'modifyField':
      // 找到字段并更新属性
      break
      
    // ... 其他操作
  }
  
  // 3. 保存模板（版本化）
  const newTemplateVersion = await templateRegistry.save(template)
  
  // 4. 可选：应用到现有节点
  let affectedCount = 0
  if (applyToExistingNodes) {
    const nodes = await nodeService.findByTemplate(templateId)
    for (const node of nodes) {
      // 迁移数据或标记需要更新
      await nodeService.updateTemplateVersion(node.id, newTemplateVersion)
      affectedCount++
    }
  }
  
  return {
    success: true,
    message: `成功${operation === 'addField' ? '添加' : '修改'}字段 ${field?.label}`,
    affectedNodeCount: affectedCount
  }
}
```

### 3.2 Tool: `auto_fill_field`

**功能**：根据上下文自动填充某个字段的内容

**接口定义**：

```typescript
interface AutoFillFieldArgs {
  nodeId: string
  fieldKey: string
  context?: string      // 可选的额外上下文或指令
  generateMultiple?: boolean  // 是否生成多个候选版本
}
```

**Tool 定义**：

```json
{
  "name": "auto_fill_field",
  "description": "根据节点的上下文信息，自动生成某个字段的内容。会创建新版本，不会自动采纳。",
  "parameters": {
    "type": "object",
    "properties": {
      "nodeId": {
        "type": "string",
        "description": "节点 ID"
      },
      "fieldKey": {
        "type": "string",
        "description": "要填充的字段 key，如 'personality'"
      },
      "context": {
        "type": "string",
        "description": "额外的上下文或指令，如 '性格要偏向冷酷'"
      },
      "generateMultiple": {
        "type": "boolean",
        "description": "是否生成多个候选版本供用户选择（默认 false）"
      }
    },
    "required": ["nodeId", "fieldKey"]
  }
}
```

**实现逻辑**：

```typescript
async function autoFillField(args: AutoFillFieldArgs): Promise<{
  success: boolean
  message: string
  versionIds?: string[]
}> {
  const { nodeId, fieldKey, context, generateMultiple } = args
  
  // 1. 加载节点数据
  const node = await nodeService.get(nodeId)
  const template = await templateRegistry.resolveTemplate(node.type)
  if (!template) {
    return { success: false, message: '无法解析节点模板' }
  }
  
  // 2. 找到字段定义
  const fieldDef = findFieldInTemplate(template, fieldKey)
  if (!fieldDef) {
    return { success: false, message: `字段 ${fieldKey} 不存在` }
  }
  
  // 3. 收集上下文
  const nodeData = await nodeService.getCapabilityData(nodeId, 'kv')
  const parentNode = await nodeService.getParent(nodeId)
  const worldContext = await gatherWorldContext(parentNode)
  
  // 4. 构建 Prompt
  const prompt = buildFieldFillPrompt({
    fieldDef,
    nodeData,
    worldContext,
    userContext: context
  })
  
  // 5. 调用 LLM 生成内容
  const count = generateMultiple ? 3 : 1
  const versionIds: string[] = []
  
  for (let i = 0; i < count; i++) {
    const generatedValue = await llmService.generate(prompt, {
      temperature: generateMultiple ? 0.8 : 0.7
    })
    
    // 6. 保存为新版本（不自动 adopt）
    const version = await artifactService.appendVersion({
      projectId: node.projectId,
      nodeId,
      capabilityId: 'kv',
      contentType: 'json',
      contentJson: {
        items: [
          ...nodeData.items.filter(item => item.k !== fieldKey),
          { k: fieldKey, v: generatedValue }
        ]
      },
      adopt: false  // 不自动采纳
    })
    
    versionIds.push(version.id)
  }
  
  return {
    success: true,
    message: `已生成 ${count} 个版本，请在 UI 中审阅并采纳`,
    versionIds
  }
}

function buildFieldFillPrompt(params: {
  fieldDef: TemplateField
  nodeData: any
  worldContext: any
  userContext?: string
}): string {
  const { fieldDef, nodeData, worldContext, userContext } = params
  
  return `你是一个创意写作助手。请根据以下信息，为字段"${fieldDef.label}"生成合适的内容。

字段说明：${fieldDef.uiConfig?.prompt || fieldDef.label}
字段类型：${fieldDef.valueType}

节点当前数据：
${JSON.stringify(nodeData, null, 2)}

世界观背景：
${worldContext}

${userContext ? `用户额外要求：${userContext}` : ''}

请生成该字段的内容（仅返回内容本身，不要其他解释）：`
}
```

### 3.3 Tool: `recommend_template_fields`

**功能**：根据节点类型和名称，推荐应该包含的字段

**接口定义**：

```typescript
interface RecommendTemplateFieldsArgs {
  nodeType: string
  nodeName?: string
  context?: string
}
```

**Tool 定义**：

```json
{
  "name": "recommend_template_fields",
  "description": "根据节点类型和名称，推荐该节点应该包含的字段列表。用于辅助用户创建新的模板或扩展现有模板。",
  "parameters": {
    "type": "object",
    "properties": {
      "nodeType": {
        "type": "string",
        "description": "节点类型，如 'world.magic.system'"
      },
      "nodeName": {
        "type": "string",
        "description": "节点名称，用于更精准的推荐"
      },
      "context": {
        "type": "string",
        "description": "额外的上下文信息"
      }
    },
    "required": ["nodeType"]
  }
}
```

**实现逻辑**：

```typescript
async function recommendTemplateFields(args: RecommendTemplateFieldsArgs): Promise<{
  success: boolean
  recommendations: Array<{
    key: string
    label: string
    valueType: FieldValueType
    group?: string
    uiConfig?: any
    reasoning: string  // 推荐理由
  }>
}> {
  const { nodeType, nodeName, context } = args
  
  // 1. 构建 Prompt，使用 Few-shot 示例
  const prompt = `你是一个模板设计专家。请为以下节点类型推荐合适的字段列表。

节点类型：${nodeType}
${nodeName ? `节点名称：${nodeName}` : ''}
${context ? `额外信息：${context}` : ''}

参考示例：
- 节点类型：char.card（角色卡）
  推荐字段：name（姓名）, age（年龄）, gender（性别）, role（角色定位）, personality（性格）, appearance（外观）, backstory（背景故事）

- 节点类型：world.geo.location（地理位置）
  推荐字段：name（名称）, type（类型：城市/村庄/山脉）, population（人口）, climate（气候）, resources（资源）, notable_features（显著特征）

请为"${nodeType}"推荐字段列表，格式为 JSON 数组：
[
  {
    "key": "字段key",
    "label": "字段标签",
    "valueType": "字段类型（text/number/select/tags等）",
    "group": "所属分组（可选）",
    "uiConfig": { "prompt": "创作提示", "options": [...] },
    "reasoning": "推荐理由"
  },
  ...
]`

  // 2. 调用 LLM 生成推荐
  const response = await llmService.generate(prompt, {
    responseFormat: 'json_object'
  })
  
  const recommendations = JSON.parse(response)
  
  return {
    success: true,
    recommendations
  }
}
```

### 3.4 Tool: `reorganize_template`

**功能**：重新组织模板的字段分组和布局

**接口定义**：

```typescript
interface ReorganizeTemplateArgs {
  templateId: string
  groups: Array<{
    id: string
    label: string
    fields: string[]  // 字段 key 数组
    collapsible?: boolean
    defaultCollapsed?: boolean
  }>
}
```

**实现逻辑**：类似 `modify_template`，但专注于分组和布局调整。

---

## 4. 对话流程示例

### 4.1 示例：添加字段

**用户**：给所有角色增加一个"性格"字段

**AI 内部推理**：
```
1. 识别意图：修改模板结构，添加字段
2. 确定模板：char.card（角色卡）
3. 确定字段信息：
   - key: personality
   - label: 性格
   - valueType: tags（性格特质适合用标签）
   - group: personality
   - prompt: 用 3-5 个关键词描述角色性格特质
```

**AI 调用 Tool**：
```json
{
  "name": "modify_template",
  "arguments": {
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
      },
      "binding": {
        "capabilityId": "kv",
        "key": "personality"
      }
    },
    "applyToExistingNodes": false
  }
}
```

**系统返回**：
```json
{
  "success": true,
  "message": "成功添加字段 性格"
}
```

**AI 回复用户**：
```
已成功在角色卡模板中添加"性格"字段（类型：标签）。
该字段会在你下次编辑角色时出现。

如果你想立即应用到所有现有角色，可以说："将性格字段应用到所有角色"。
```

### 4.2 示例：批量填充

**用户**：帮我把所有角色的"性格"字段都填上

**AI 内部推理**：
```
1. 识别意图：批量填充字段
2. 查询所有 char.card.* 节点
3. 对每个节点调用 auto_fill_field
```

**AI 执行**：
```typescript
const nodes = await nodeService.findByType('char.card.*')
for (const node of nodes) {
  await autoFillField({
    nodeId: node.id,
    fieldKey: 'personality',
    generateMultiple: false
  })
}
```

**AI 回复用户**：
```
已为 5 个角色生成了"性格"字段的内容：
- 阿尔托：勇敢、正直、固执、保护欲强
- 莉莉丝：聪慧、独立、神秘、善于观察
- ...

这些内容已保存为新版本，但未自动采纳。请在各个角色页面中审阅并选择采纳。
```

### 4.3 示例：智能推荐

**用户**：我要创建一个"魔法体系"节点

**AI 内部推理**：
```
1. 识别意图：创建新节点
2. 节点类型：world.magic.system
3. 检查是否有现成模板 -> 无
4. 调用 recommend_template_fields 推荐字段
```

**AI 调用 Tool**：
```json
{
  "name": "recommend_template_fields",
  "arguments": {
    "nodeType": "world.magic.system",
    "nodeName": "魔法体系"
  }
}
```

**系统返回**：
```json
{
  "success": true,
  "recommendations": [
    {
      "key": "name",
      "label": "名称",
      "valueType": "text",
      "reasoning": "魔法体系的名称，如'元素魔法'、'符文魔法'"
    },
    {
      "key": "category",
      "label": "分类",
      "valueType": "select",
      "uiConfig": {
        "options": ["元素系", "符文系", "召唤系", "变化系", "心灵系"]
      },
      "reasoning": "魔法体系的大类"
    },
    {
      "key": "energy_source",
      "label": "能量来源",
      "valueType": "text",
      "reasoning": "魔法能量的来源，如'自然元素'、'生命力'、'信仰'"
    },
    {
      "key": "casting_method",
      "label": "施法方式",
      "valueType": "longtext",
      "uiConfig": {
        "prompt": "描述如何施展这类魔法，如手势、咒语、媒介"
      },
      "reasoning": "施法的具体方法"
    },
    {
      "key": "limitations",
      "label": "限制条件",
      "valueType": "longtext",
      "uiConfig": {
        "prompt": "描述这类魔法的限制和代价"
      },
      "reasoning": "平衡性考虑，魔法不应无限强大"
    }
  ]
}
```

**AI 回复用户**：
```
我推荐为"魔法体系"节点包含以下字段：

1. 名称 - 魔法体系的名称
2. 分类 - 选择：元素系、符文系、召唤系、变化系、心灵系
3. 能量来源 - 魔法能量的来源
4. 施法方式 - 如何施展这类魔法
5. 限制条件 - 魔法的限制和代价

我现在为你创建这个节点吗？如果同意，我会基于这些字段生成临时模板。
```

---

## 5. Prompt 工程与上下文管理

### 5.1 System Prompt（模板修改助手）

```
你是 Storyteller 的模板设计助手。你的职责是帮助用户设计和修改节点模板。

核心能力：
1. 理解用户对模板结构的需求
2. 推荐合适的字段类型和配置
3. 调用 Tools 修改模板或填充字段
4. 确保模板设计符合创作工具的最佳实践

最佳实践：
- 字段名称应简洁且语义明确
- 为每个字段提供清晰的 prompt 引导创作
- 根据内容长度选择合适的 valueType（text vs longtext）
- 用 tags 类型表示多个关键词或特质
- 用 select 类型限制固定选项
- 用 reference 类型建立实体链接
- 字段应按语义分组（如"基础信息"、"外观"、"性格"）

注意事项：
- 修改模板前先确认用户意图
- 自动填充的内容不会自动采纳，需要用户审阅
- 批量操作前询问用户确认
```

### 5.2 上下文收集策略

在调用 `auto_fill_field` 时，需要收集丰富的上下文：

**1. 节点自身数据**
```typescript
const nodeData = await nodeService.getCapabilityData(nodeId, 'kv')
// 获取节点已有的字段值
```

**2. 父节点与世界观背景**
```typescript
const parentNode = await nodeService.getParent(nodeId)
const worldRoot = await nodeService.getWorldRoot(projectId)
const worldSummary = await nodeService.getSummary(worldRoot.id)
```

**3. 同类节点参考**
```typescript
const siblings = await nodeService.getSiblings(nodeId)
// 用于理解该类节点的典型模式
```

**4. 模板定义**
```typescript
const template = await templateRegistry.resolveTemplate(node.type)
const fieldDef = template.sections.find(...)
// 获取字段的 prompt 和 uiConfig
```

### 5.3 Few-shot 示例库

为提高推荐质量，维护一个 Few-shot 示例库：

```typescript
const templateExamples = {
  'char.card': {
    description: '角色卡，用于记录故事角色的详细信息',
    fields: [
      { key: 'name', label: '姓名', valueType: 'text' },
      { key: 'age', label: '年龄', valueType: 'number' },
      { key: 'personality', label: '性格', valueType: 'tags' },
      // ...
    ]
  },
  'world.geo.location': {
    description: '地理位置，可以是城市、村庄、山脉、河流等',
    fields: [
      { key: 'name', label: '名称', valueType: 'text' },
      { key: 'type', label: '类型', valueType: 'select', options: ['城市', '村庄', '山脉', '河流'] },
      // ...
    ]
  },
  // ... 更多示例
}
```

---

## 6. 安全性与权限控制

### 6.1 操作确认机制

对于有破坏性的操作，要求用户确认：

- **删除字段**：提示"该操作会影响 N 个节点，是否继续？"
- **批量修改**：显示受影响节点列表，要求用户确认
- **模板升级**：提醒"旧版本节点可能需要手动迁移"

### 6.2 版本回滚

- 模板修改生成新版本，旧版本保留
- 支持回滚到旧版本模板
- 节点可以固定使用某个模板版本

### 6.3 权限验证

- 仅项目所有者可以修改模板
- 协作者可以修改节点实例，但不能修改模板
- AI 操作需要用户授权（通过 UI 确认）

---

## 7. 性能优化

### 7.1 批量操作优化

- 批量填充字段时，并发调用 LLM（控制并发数）
- 使用缓存避免重复查询世界观背景
- 批量更新节点时，使用事务保证一致性

### 7.2 增量更新

- 模板修改后，不强制立即更新所有节点
- 提供"懒加载"模式：节点在下次打开时才应用新模板
- 提供"批量迁移"工具，由用户决定何时迁移

---

## 8. 测试与验证

### 8.1 单元测试

- 测试 `modify_template` 的各种操作（addField, removeField, modifyField）
- 测试字段验证逻辑（required, validate）
- 测试 Binding 的正确性

### 8.2 集成测试

- 端到端测试：用户对话 -> AI 调用 Tool -> 模板更新 -> UI 刷新
- 测试批量操作的性能和正确性
- 测试版本回滚和迁移

### 8.3 用户验收测试

- 邀请真实用户尝试对话式模板修改
- 收集反馈：AI 理解准确度、生成内容质量、UI 响应速度
- 迭代优化 Prompt 和交互流程

---

## 9. 实施优先级

### P0（核心功能）
- `modify_template` Tool（addField, removeField）
- `auto_fill_field` Tool
- 基础的字段类型支持（text, longtext, select, tags）

### P1（增强功能）
- `recommend_template_fields` Tool
- 字段分组和布局优化
- 批量操作

### P2（高级功能）
- `reorganize_template` Tool
- 模板版本化与迁移
- 计算字段（formula）

### P3（未来扩展）
- 跨节点的字段关联与聚合
- 模板市场（导入/导出模板）
- 基于机器学习的字段推荐

---

## 10. 总结

通过将模板操作暴露为 Agent Tools，我们实现了：

1. **对话式模板修改**：用户说"加字段"，AI 理解并执行
2. **智能字段填充**：根据上下文自动生成字段内容
3. **模板推荐**：为新节点类型推荐合适的字段结构
4. **批量操作**：一次性修改多个节点

这套系统让用户无需编写代码，就能动态调整模板结构，真正实现了"可扩展、可定制"的模板系统。

**下一步**：
- 实现核心 Tools（modify_template, auto_fill_field）
- 设计 UI 交互（确认对话框、版本审阅界面）
- 迭代优化 Prompt，提高 AI 理解和生成质量
