# 世界观模板可视化方案实施路线图

## 1. 概述

本文档整合前面三份调研与设计文档的内容，提供一个清晰的实施路线图，包括任务拆分、优先级、时间估算和依赖关系。

---

## 2. 总体目标与里程碑

### 2.1 总体目标

解决当前模板系统的三大局限：
1. **定制化不足**：扩展字段类型，支持每个节点类型的专属表单
2. **用户体验不佳**：从"表单填写"转向"创作与阅读"
3. **扩展性不足**：支持用户自定义字段和 AI 辅助模板修改

### 2.2 四个里程碑

```
Milestone 1: 字段类型扩展 (2-3 天)
  ↓
Milestone 2: UI 体验改进 (2 周)
  ↓
Milestone 3: Instance Overrides (1 周)
  ↓
Milestone 4: AI 辅助功能 (1 周)
```

**总计**：约 4-5 周

---

## 3. Milestone 1: 字段类型扩展（2-3 天）

### 3.1 目标

从 2 种字段类型扩展到 15+ 种，满足常见业务需求。

### 3.2 任务清单

#### Task 1.1: 更新类型定义（1 小时）

**文件**：`renderer/src/templates/types.ts`

**改动**：
```typescript
export type FieldValueType = 
  | 'text'           // ✅ 已有
  | 'longtext'       // ✅ 已有
  | 'richtext'       // 新增
  | 'number'         // 新增
  | 'select'         // 新增
  | 'multiSelect'    // 新增
  | 'checkbox'       // 新增
  | 'date'           // 新增
  | 'dateTime'       // 新增
  | 'tags'           // 新增
  | 'reference'      // 新增（节点引用）
  | 'references'     // 新增（多节点引用）
  | 'image'          // 新增
  | 'file'           // 新增
  | 'color'          // 新增
  | 'rating'         // 新增
```

#### Task 1.2: 实现各类型的渲染组件（8 小时）

**文件**：`renderer/src/components/template/sections/KvGroupSection.vue`

**改动**：在 `<template>` 中为每种类型实现对应的 UI 组件

**优先级**：
- P0（核心）：`number`, `select`, `tags`, `checkbox`
- P1（常用）：`multiSelect`, `date`, `reference`
- P2（进阶）：`richtext`, `references`, `rating`
- P3（未来）：`image`, `file`, `color`, `dateTime`

**实现示例**：

```vue
<template>
  <div class="field">
    <div class="label">{{ f.label }}</div>
    <div class="value">
      <!-- 文本 -->
      <input v-if="f.valueType === 'text'" type="text" v-model="fieldValues[f.key]" />
      
      <!-- 数字 -->
      <input v-else-if="f.valueType === 'number'" type="number" 
        v-model.number="fieldValues[f.key]"
        :min="f.uiConfig?.min"
        :max="f.uiConfig?.max" />
      
      <!-- 下拉选择 -->
      <select v-else-if="f.valueType === 'select'" v-model="fieldValues[f.key]">
        <option value="">请选择</option>
        <option v-for="opt in f.uiConfig?.options" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
      
      <!-- 标签 -->
      <TagInput v-else-if="f.valueType === 'tags'" v-model="fieldValues[f.key]" />
      
      <!-- 复选框 -->
      <input v-else-if="f.valueType === 'checkbox'" type="checkbox" 
        v-model="fieldValues[f.key]" />
      
      <!-- ... 其他类型 -->
    </div>
  </div>
</template>
```

**新增组件**：
- `TagInput.vue`：标签输入组件
- `NodeReferenceInput.vue`：节点引用选择器
- `RichTextEditor.vue`：富文本编辑器（可使用 TipTap 或 Quill）

#### Task 1.3: 更新模板定义（2 小时）

**文件**：`renderer/src/templates/registry.ts`

**改动**：更新角色卡模板，使用新的字段类型

```typescript
{
  id: 'char.card',
  label: '角色卡',
  sections: [
    {
      type: 'kvGroup',
      title: '基础信息',
      fields: [
        { key: 'name', label: '姓名', valueType: 'text', required: true },
        { key: 'age', label: '年龄', valueType: 'number', uiConfig: { min: 0, max: 200 } },
        { key: 'gender', label: '性别', valueType: 'select', 
          uiConfig: { options: ['男', '女', '其他', '未知'] } },
        { key: 'role', label: '角色定位', valueType: 'select',
          uiConfig: { options: ['主角', '配角', '反派', '路人'] } },
        { key: 'personality', label: '性格', valueType: 'tags',
          uiConfig: { prompt: '用 3-5 个关键词描述性格', placeholder: '如：勇敢、冲动、固执' } }
      ]
    }
  ]
}
```

#### Task 1.4: 测试与验证（2 小时）

**测试内容**：
- [ ] 各字段类型正常显示
- [ ] 数据正确保存到 KV capability
- [ ] 版本化正常工作
- [ ] 采纳功能正常

### 3.3 交付物

- [ ] 更新的 `types.ts`
- [ ] 更新的 `KvGroupSection.vue`
- [ ] 新增的组件（`TagInput.vue`, `NodeReferenceInput.vue` 等）
- [ ] 更新的模板定义
- [ ] 测试报告

---

## 4. Milestone 2: UI 体验改进（2 周）

### 4.1 阶段 2.1: 字段分组与折叠（3 天）

#### Task 2.1.1: 更新类型定义（1 小时）

**文件**：`renderer/src/templates/types.ts`

**新增**：
```typescript
export type FieldGroup = {
  id: string
  label: string
  fields: string[]         // 字段 key 数组
  collapsible?: boolean
  defaultCollapsed?: boolean
  description?: string
}

export type SectionKvGroup = {
  type: 'kvGroup'
  title: string
  capabilityId: 'kv'
  fields: TemplateField[]
  groups?: FieldGroup[]    // 新增
  showOtherFields?: boolean
  layout?: 'form' | 'card' | 'table'  // 新增
}
```

#### Task 2.1.2: 实现分组渲染（8 小时）

**文件**：`renderer/src/components/template/sections/KvGroupSection.vue`

**改动**：
```vue
<template>
  <div class="kvgroup">
    <!-- 未分组字段 -->
    <div v-if="ungroupedFields.length" class="ungrouped">
      <FieldRenderer v-for="f in ungroupedFields" :key="f.key" :field="f" />
    </div>
    
    <!-- 分组字段 -->
    <FieldGroup v-for="g in groups" :key="g.id" 
      :group="g" 
      :fields="getGroupFields(g)"
      :field-values="fieldValues" />
  </div>
</template>

<script setup lang="ts">
import FieldGroup from './FieldGroup.vue'

const ungroupedFields = computed(() => {
  const groupedKeys = new Set(props.groups?.flatMap(g => g.fields) ?? [])
  return props.fields.filter(f => !groupedKeys.has(f.key))
})

function getGroupFields(group: FieldGroup) {
  return props.fields.filter(f => group.fields.includes(f.key))
}
</script>
```

**新增组件**：`FieldGroup.vue`

```vue
<template>
  <details class="field-group" :open="!group.defaultCollapsed">
    <summary class="group-header">
      <span class="label">{{ group.label }}</span>
      <span class="count">{{ filledCount }}/{{ fields.length }}</span>
    </summary>
    <div class="group-body">
      <FieldRenderer v-for="f in fields" :key="f.key" :field="f" />
    </div>
  </details>
</template>

<script setup lang="ts">
const props = defineProps<{
  group: FieldGroup
  fields: TemplateField[]
  fieldValues: Record<string, any>
}>()

const filledCount = computed(() => {
  return props.fields.filter(f => {
    const val = props.fieldValues[f.key]
    return val !== undefined && val !== null && val !== ''
  }).length
})
</script>
```

#### Task 2.1.3: 更新模板定义（2 小时）

**文件**：`renderer/src/templates/registry.ts`

**改动**：为角色卡添加分组

```typescript
{
  type: 'kvGroup',
  title: '详细设定',
  groups: [
    {
      id: 'appearance',
      label: '外观',
      fields: ['height', 'build', 'hair', 'eyes', 'clothing'],
      collapsible: true,
      defaultCollapsed: false
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
    { key: 'height', label: '身高', valueType: 'text', group: 'appearance' },
    { key: 'build', label: '体型', valueType: 'select', group: 'appearance',
      uiConfig: { options: ['瘦弱', '匀称', '健壮', '肥胖'] } },
    // ... 更多字段
  ]
}
```

### 4.2 阶段 2.2: 阅读模式与内联编辑（4 天）

#### Task 2.2.1: 实现模式切换（4 小时）

**文件**：新增 `NodeInspector.vue`（节点检查器，包含模式切换）

```vue
<template>
  <div class="node-inspector">
    <div class="toolbar">
      <button @click="toggleMode" :class="{ active: mode === 'read' }">
        阅读模式
      </button>
      <button @click="toggleMode" :class="{ active: mode === 'edit' }">
        编辑模式
      </button>
    </div>
    
    <component :is="rendererComponent" 
      :template="template"
      :mode="mode"
      :node-id="nodeId"
      :project-id="projectId" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TemplateRendererRead from './TemplateRendererRead.vue'
import TemplateRendererEdit from './TemplateRendererEdit.vue'

const mode = ref<'read' | 'edit'>('read')

const rendererComponent = computed(() => {
  return mode.value === 'read' ? TemplateRendererRead : TemplateRendererEdit
})

function toggleMode() {
  mode.value = mode.value === 'read' ? 'edit' : 'read'
}
</script>
```

#### Task 2.2.2: 实现阅读模式渲染器（12 小时）

**文件**：新增 `TemplateRendererRead.vue`

**特点**：
- 卡片式布局
- 字段值渲染为可读文本
- 支持 Markdown 渲染（长文本）
- 空字段显示引导卡片
- 点击字段进入内联编辑

```vue
<template>
  <div class="template-read">
    <div v-for="section in template.sections" :key="section.type" class="section">
      <KvGroupRead v-if="section.type === 'kvGroup'" 
        :section="section"
        :data="kvData"
        @edit-field="onEditField" />
      <!-- 其他 section 类型 -->
    </div>
  </div>
</template>
```

**新增组件**：`KvGroupRead.vue`

```vue
<template>
  <div class="kvgroup-read">
    <h3>{{ section.title }}</h3>
    
    <div v-for="f in section.fields" :key="f.key" class="field-card" @click="editField(f)">
      <div class="field-label">{{ f.label }}</div>
      <div v-if="hasValue(f)" class="field-value">
        <!-- 根据类型渲染 -->
        <span v-if="f.valueType === 'text'">{{ data[f.key] }}</span>
        <div v-else-if="f.valueType === 'longtext'" class="longtext">
          {{ data[f.key] }}
        </div>
        <div v-else-if="f.valueType === 'tags'" class="tags">
          <span v-for="tag in parseTagsarray(data[f.key])" :key="tag" class="tag">
            {{ tag }}
          </span>
        </div>
        <!-- ... 其他类型 -->
      </div>
      <div v-else class="field-empty">
        <div class="empty-hint">
          💡 {{ f.uiConfig?.prompt || '点击填写' }}
        </div>
        <div class="empty-actions">
          <button class="btn-ai" @click.stop="aiFill(f)">✨ AI 填充</button>
          <button @click.stop="editField(f)">手动填写</button>
        </div>
      </div>
    </div>
  </div>
</template>
```

#### Task 2.2.3: 实现内联编辑（8 小时）

**策略**：点击字段时，替换为编辑器组件

```vue
<div class="field-card" :class="{ editing: editingField === f.key }">
  <template v-if="editingField === f.key">
    <!-- 编辑器 -->
    <input v-if="f.valueType === 'text'" 
      v-model="editingValue"
      @blur="saveField"
      @keyup.enter="saveField"
      @keyup.esc="cancelEdit"
      ref="editInput" />
  </template>
  <template v-else>
    <!-- 阅读视图 -->
    <div @click="startEdit(f)">{{ data[f.key] }}</div>
  </template>
</div>

<script>
function startEdit(field) {
  editingField.value = field.key
  editingValue.value = data[field.key]
  nextTick(() => {
    editInput.value?.focus()
  })
}

async function saveField() {
  // 保存到后端
  await updateField(editingField.value, editingValue.value)
  editingField.value = null
}
</script>
```

### 4.3 阶段 2.3: 侧边栏与快捷操作（3 天）

#### Task 2.3.1: 实现侧边栏（8 小时）

**文件**：新增 `NodeSidebar.vue`

```vue
<template>
  <div class="node-sidebar">
    <!-- 头像/立绘 -->
    <div class="avatar-section">
      <img v-if="portraitUrl" :src="portraitUrl" alt="Portrait" />
      <button v-else @click="generatePortrait">生成立绘</button>
    </div>
    
    <!-- 快速参考 -->
    <div class="quick-facts">
      <h4>{{ nodeName }}</h4>
      <div v-for="f in quickFields" :key="f.key" class="fact">
        <span class="label">{{ f.label }}</span>
        <span class="value">{{ getFieldValue(f) }}</span>
      </div>
    </div>
    
    <!-- 关系链接 -->
    <div v-if="references.length" class="references">
      <h5>关系</h5>
      <a v-for="ref in references" :key="ref.id" :href="`#/node/${ref.id}`" class="ref-link">
        {{ ref.name }} →
      </a>
    </div>
    
    <!-- 快捷操作 -->
    <div class="quick-actions">
      <button @click="aiComplete">🤖 AI 完善设定</button>
      <button @click="generateImage">🎨 生成立绘</button>
      <button @click="exportMarkdown">📤 导出 Markdown</button>
    </div>
  </div>
</template>
```

#### Task 2.3.2: 集成到页面布局（4 小时）

**文件**：更新主节点页面，使用三栏布局

```vue
<template>
  <div class="node-page">
    <NodeSidebar :node-id="nodeId" />
    <div class="main-content">
      <TemplateRenderer :template="template" :mode="mode" />
    </div>
  </div>
</template>

<style scoped>
.node-page {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
}
</style>
```

### 4.4 阶段 2.4: 版本对比 Diff 视图（2 天）

#### Task 2.4.1: 实现 Diff 组件（8 小时）

**文件**：新增 `VersionDiff.vue`

```vue
<template>
  <div class="version-diff">
    <div class="diff-header">
      <div class="version-info">
        <select v-model="leftVersionId">
          <option v-for="v in versions" :key="v.id" :value="v.id">
            v{{ v.versionIndex }}
          </option>
        </select>
        <span>vs</span>
        <select v-model="rightVersionId">
          <option v-for="v in versions" :key="v.id" :value="v.id">
            v{{ v.versionIndex }}
          </option>
        </select>
      </div>
    </div>
    
    <div class="diff-body">
      <div v-for="f in fields" :key="f.key" class="diff-field">
        <div class="field-label">{{ f.label }}</div>
        <div class="diff-row">
          <div class="left" :class="diffClass(f, 'left')">
            {{ leftData[f.key] }}
          </div>
          <div class="right" :class="diffClass(f, 'right')">
            {{ rightData[f.key] }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="diff-actions">
      <button @click="adopt('left')">← 采纳左侧</button>
      <button @click="adopt('right')">采纳右侧 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
function diffClass(field, side) {
  const leftVal = leftData[field.key]
  const rightVal = rightData[field.key]
  if (leftVal !== rightVal) {
    return 'changed'
  }
  return ''
}
</script>
```

#### Task 2.4.2: 集成到版本选择器（4 小时）

**文件**：更新 `KvGroupSection.vue`

**改动**：添加"对比"按钮，打开 Diff 视图

```vue
<div class="version-toolbar">
  <select v-model="selectedVersionId">...</select>
  <button @click="adoptSelected">采纳</button>
  <button @click="showDiff">对比</button>  <!-- 新增 -->
</div>

<Modal v-if="diffModalVisible" @close="diffModalVisible = false">
  <VersionDiff :versions="versions" :fields="fields" />
</Modal>
```

---

## 5. Milestone 3: Instance Overrides（1 周）

### 5.1 目标

支持用户在节点级别自定义字段，不影响模板。

### 5.2 任务清单

#### Task 3.1: 设计数据结构（2 小时）

**数据库 Schema**：

```sql
CREATE TABLE instance_overrides (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  override_data TEXT NOT NULL,  -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(project_id, node_id)
);
```

**JSON 结构**：

```typescript
export type InstanceOverride = {
  nodeId: string
  templateId: string
  fieldOverrides?: {
    [fieldKey: string]: {
      hidden?: boolean
      label?: string
      uiConfig?: Partial<any>
    }
  }
  customFields?: TemplateField[]
  sectionOverrides?: {
    [sectionId: string]: {
      hidden?: boolean
      order?: number
    }
  }
  customSections?: TemplateSection[]
}
```

#### Task 3.2: 实现存储与查询 API（8 小时）

**文件**：`main/services/instanceOverrideService.ts`

```typescript
export class InstanceOverrideService {
  async get(projectId: string, nodeId: string): Promise<InstanceOverride | null>
  async save(projectId: string, override: InstanceOverride): Promise<void>
  async delete(projectId: string, nodeId: string): Promise<void>
}
```

**IPC 接口**：

```typescript
ipcMain.handle('instanceOverrides:get', async (event, projectId, nodeId) => {
  return await instanceOverrideService.get(projectId, nodeId)
})

ipcMain.handle('instanceOverrides:save', async (event, projectId, override) => {
  await instanceOverrideService.save(projectId, override)
})
```

#### Task 3.3: 实现"添加自定义字段" UI（12 小时）

**文件**：新增 `AddCustomFieldModal.vue`

```vue
<template>
  <Modal title="添加自定义字段" @close="$emit('close')">
    <form @submit.prevent="submit">
      <div class="form-group">
        <label>字段标识 (key)</label>
        <input v-model="field.key" required placeholder="如：hobby" />
      </div>
      
      <div class="form-group">
        <label>显示标签</label>
        <input v-model="field.label" required placeholder="如：爱好" />
      </div>
      
      <div class="form-group">
        <label>字段类型</label>
        <select v-model="field.valueType" required>
          <option value="text">单行文本</option>
          <option value="longtext">多行文本</option>
          <option value="number">数字</option>
          <option value="select">下拉选择</option>
          <option value="tags">标签</option>
          <!-- ... 更多类型 -->
        </select>
      </div>
      
      <div v-if="field.valueType === 'select'" class="form-group">
        <label>选项（每行一个）</label>
        <textarea v-model="optionsText" rows="4"></textarea>
      </div>
      
      <div class="form-group">
        <label>创作提示 (prompt)</label>
        <textarea v-model="field.uiConfig.prompt" rows="2"></textarea>
      </div>
      
      <div class="form-group">
        <label>所属分组</label>
        <select v-model="field.group">
          <option value="">（无分组）</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">
            {{ g.label }}
          </option>
        </select>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="$emit('close')">取消</button>
        <button type="submit">添加</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
const field = ref<TemplateField>({
  key: '',
  label: '',
  valueType: 'text',
  uiConfig: {},
  binding: { capabilityId: 'kv', key: '' }
})

const optionsText = ref('')

function submit() {
  if (field.value.valueType === 'select') {
    field.value.uiConfig.options = optionsText.value.split('\n').filter(Boolean)
  }
  field.value.binding.key = field.value.key
  emit('submit', field.value)
}
</script>
```

#### Task 3.4: 实现模板与 Override 合并逻辑（8 小时）

**文件**：新增 `templateMerger.ts`

```typescript
export function mergeTemplateWithOverride(
  template: NodeTemplate,
  override: InstanceOverride | null
): NodeTemplate {
  if (!override) return template
  
  const merged = { ...template }
  
  // 合并字段
  merged.sections = merged.sections.map(section => {
    if (section.type === 'kvGroup') {
      let fields = [...section.fields]
      
      // 应用字段覆盖
      fields = fields.map(f => {
        const fieldOverride = override.fieldOverrides?.[f.key]
        if (fieldOverride) {
          return { ...f, ...fieldOverride }
        }
        return f
      })
      
      // 添加自定义字段
      if (override.customFields) {
        fields = [...fields, ...override.customFields]
      }
      
      // 过滤隐藏字段
      fields = fields.filter(f => {
        const fieldOverride = override.fieldOverrides?.[f.key]
        return !fieldOverride?.hidden
      })
      
      return { ...section, fields }
    }
    return section
  })
  
  // 添加自定义 Section
  if (override.customSections) {
    merged.sections = [...merged.sections, ...override.customSections]
  }
  
  return merged
}
```

#### Task 3.5: 集成到渲染器（4 小时）

**文件**：更新 `TemplateRenderer.vue`

```vue
<script setup lang="ts">
import { mergeTemplateWithOverride } from '../../utils/templateMerger'

const props = defineProps<{
  template: NodeTemplate
  nodeId: string
  projectId: string
}>()

const override = ref<InstanceOverride | null>(null)

onMounted(async () => {
  override.value = await window.storyteller.instanceOverrides.get(
    props.projectId, 
    props.nodeId
  )
})

const mergedTemplate = computed(() => {
  return mergeTemplateWithOverride(props.template, override.value)
})
</script>

<template>
  <!-- 使用 mergedTemplate 而不是 template -->
  <TemplateRendererImpl :template="mergedTemplate" />
</template>
```

---

## 6. Milestone 4: AI 辅助功能（1 周）

### 6.1 任务清单

#### Task 4.1: 实现 modify_template Tool（2 天）

**文件**：`main/agent/tools/modifyTemplate.ts`

参考"02-ai-template-modification-design.md"的详细设计。

**核心逻辑**：
1. 加载模板
2. 根据 operation 修改字段或 Section
3. 保存模板新版本
4. 可选：应用到现有节点

#### Task 4.2: 实现 auto_fill_field Tool（2 天）

**文件**：`main/agent/tools/autoFillField.ts`

**核心逻辑**：
1. 加载节点数据
2. 收集上下文（父节点、世界观背景、字段定义）
3. 构建 Prompt
4. 调用 LLM 生成内容
5. 保存为新版本（不自动 adopt）

#### Task 4.3: 实现 recommend_template_fields Tool（1 天）

**文件**：`main/agent/tools/recommendTemplateFields.ts`

**核心逻辑**：
1. 根据节点类型和名称构建 Prompt
2. 使用 Few-shot 示例
3. 调用 LLM 生成推荐字段列表
4. 返回结构化结果

#### Task 4.4: 集成到 Agent Chat（1 天）

**文件**：`main/agent/AgentRunner.ts`

**改动**：注册新的 Tools

```typescript
import { modifyTemplateTool } from './tools/modifyTemplate'
import { autoFillFieldTool } from './tools/autoFillField'
import { recommendTemplateFieldsTool } from './tools/recommendTemplateFields'

const tools = [
  modifyTemplateTool,
  autoFillFieldTool,
  recommendTemplateFieldsTool,
  // ... 其他 tools
]
```

#### Task 4.5: UI 集成（1 天）

**改动**：
- 在字段旁添加"✨ AI 填充"按钮
- 在 Chat 中显示 Tool 调用结果
- 实现批量操作确认对话框

---

## 7. 测试计划

### 7.1 单元测试

- [ ] 字段类型渲染测试
- [ ] 分组逻辑测试
- [ ] Override 合并测试
- [ ] Tool 调用测试

### 7.2 集成测试

- [ ] 端到端：创建节点 -> 填写字段 -> 保存版本 -> 采纳
- [ ] 端到端：添加自定义字段 -> 保存 -> 刷新页面验证
- [ ] 端到端：AI 填充字段 -> 审阅 -> 采纳
- [ ] 端到端：修改模板 -> 应用到现有节点

### 7.3 用户验收测试

- [ ] 邀请 5-10 位用户试用
- [ ] 收集反馈问卷
- [ ] 观察用户操作录屏，发现卡点
- [ ] 迭代优化

---

## 8. 风险与对策

### 8.1 风险：性能问题（大量节点 + 复杂模板）

**对策**：
- 使用虚拟滚动渲染长列表
- 分页加载节点
- 缓存已渲染的组件

### 8.2 风险：AI 生成质量不稳定

**对策**：
- 不自动 adopt，必须用户审阅
- 提供"重新生成"选项
- 收集用户反馈，优化 Prompt

### 8.3 风险：数据迁移问题（模板升级）

**对策**：
- 节点记录模板版本号
- 提供迁移工具
- 允许节点继续使用旧版本模板

### 8.4 风险：UI 复杂度膨胀

**对策**：
- 保持"大块积木"哲学，不做像素级搭建
- 提供"简单模式"和"高级模式"
- 遵循"约定优于配置"原则

---

## 9. 发布计划

### 9.1 Alpha 版本（Milestone 1 + 2.1）

**时间**：第 1-2 周

**内容**：
- 扩展字段类型
- 字段分组与折叠

**验收标准**：
- 支持 8+ 种字段类型
- 角色卡模板有清晰的分组

### 9.2 Beta 版本（Milestone 2.2 + 2.3）

**时间**：第 3 周

**内容**：
- 阅读模式与内联编辑
- 侧边栏与快捷操作

**验收标准**：
- 默认阅读模式，点击即编辑
- 侧边栏显示关键信息和快捷操作

### 9.3 RC 版本（Milestone 2.4 + 3）

**时间**：第 4 周

**内容**：
- 版本对比 Diff 视图
- Instance Overrides

**验收标准**：
- 可对比两个版本的差异
- 可在节点级别添加自定义字段

### 9.4 正式版本（Milestone 4）

**时间**：第 5 周

**内容**：
- AI 辅助功能

**验收标准**：
- 可通过对话修改模板
- 可通过 AI 填充字段
- 端到端流程顺畅

---

## 10. 后续演进方向

### 10.1 短期（1-2 个月）

- [ ] 实现更多自定义 Widget（Timeline, Map, Gallery）
- [ ] 支持计算字段（Formula）
- [ ] 支持字段间依赖（如"年龄"变化时自动更新"年龄段"）
- [ ] 模板市场（导入/导出模板）

### 10.2 中期（3-6 个月）

- [ ] 跨节点的字段关联与聚合
- [ ] 基于机器学习的字段推荐
- [ ] 多人协作时的模板版本冲突解决
- [ ] 移动端适配

### 10.3 长期（6+ 个月）

- [ ] 视觉化的模板设计器（拖拽式）
- [ ] 社区模板库与评分系统
- [ ] 插件系统，允许第三方扩展字段类型
- [ ] 与外部工具集成（如导入 World Anvil 模板）

---

## 11. 总结

本路线图详细规划了从字段类型扩展到 AI 辅助的完整实施路径。通过四个里程碑的逐步交付，我们将构建一个强大、灵活、用户友好的模板系统，解决当前的三大局限性。

**关键成功因素**：
1. **渐进式交付**：每个里程碑都有明确的交付物和验收标准
2. **用户反馈驱动**：在每个阶段邀请用户测试并迭代
3. **技术债务控制**：保持代码整洁，避免过度设计
4. **文档同步**：及时更新技术文档和用户手册

**预期成果**：
- 用户可以创建高度定制的节点模板
- 模板系统足够灵活，支持未来扩展
- AI 成为无缝的创作助手
- 整体用户体验从"填表单"提升到"创作与阅读"
