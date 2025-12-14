<template>
  <div class="editor">
    <div class="sectionTitle">{{ title }}</div>
    <div class="body">
      <div v-if="!enabled" class="disabled">该节点未启用 kv 能力，无法编辑结构化字段。</div>

      <template v-else>
        <div class="row">
          <select class="select" :disabled="!projectId" :value="selectedVersionId" @change="onSelectVersion">
            <option value="">（选择版本）</option>
            <option v-for="v in versions" :key="v.id" :value="v.id">
              v{{ v.versionIndex }}{{ v.id === adoptedVersionId ? '（已采纳）' : '' }}
            </option>
          </select>
          <button class="btn" :disabled="!projectId || !selectedVersionId" @click="adoptSelected">采纳</button>
          <button class="btn" :disabled="!projectId" @click="saveVersion">保存新版本</button>
        </div>

        <div class="card">
          <div v-for="f in fields" :key="f.key" class="field">
            <div class="label">
              {{ f.label }}
              <div v-if="f.prompt" class="prompt">{{ f.prompt }}</div>
            </div>
            <div class="value">
              <input
                v-if="f.valueType === 'text'"
                class="input"
                type="text"
                v-model="fieldValues[f.key]"
                :placeholder="f.optional ? '（可选）' : ''"
              />
              <textarea
                v-else
                class="textarea"
                v-model="fieldValues[f.key]"
                :placeholder="f.optional ? '（可选）' : ''"
                spellcheck="false"
              />
            </div>
          </div>
        </div>

        <details v-if="showOtherFields && otherItems.length" class="other">
          <summary>其它字段（模板外）</summary>
          <div class="otherList">
            <div v-for="(it, idx) in otherItems" :key="idx" class="otherRow">
              <div class="k">{{ it.k }}</div>
              <textarea class="textarea" v-model="it.v" spellcheck="false" />
            </div>
          </div>
        </details>

        <div class="hint">保存会创建新版本并自动采纳。</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import type { TemplateField } from '../../../templates/types'
import type { ArtifactVersion } from '../../panels/types'

const props = defineProps<{
  title: string
  fields: TemplateField[]
  showOtherFields: boolean
  projectId: string
  nodeId: string
  capabilityId: string
  refreshSeq?: number
  enabled: boolean
}>()

const versions = ref<ArtifactVersion[]>([])
const selectedVersionId = ref('')
const adoptedVersionId = ref('')

const fieldValues = reactive<Record<string, string>>({})
const otherItems = ref<Array<{ k: string; v: string }>>([])

function resetValues() {
  for (const f of props.fields) fieldValues[f.key] = ''
  otherItems.value = []
}

function parseItemsToState(items: Array<{ k: string; v: string }>) {
  const map = new Map(items.map((x) => [String(x.k), String(x.v)]))

  for (const f of props.fields) {
    fieldValues[f.key] = map.get(f.key) ?? ''
    map.delete(f.key)
  }

  otherItems.value = Array.from(map.entries()).map(([k, v]) => ({ k, v }))
}

async function load() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!props.enabled || !pid || !nodeId) {
    versions.value = []
    selectedVersionId.value = ''
    adoptedVersionId.value = ''
    resetValues()
    return
  }

  const api = window.storyteller?.artifacts
  if (!api?.listVersions || !api.getAdopted) return

  const [list, adopted] = await Promise.all([
    api.listVersions(pid, nodeId, props.capabilityId),
    api.getAdopted(pid, nodeId, props.capabilityId)
  ])

  versions.value = (Array.isArray(list) ? list : []).map((v: any) => ({
    id: String(v.id),
    artifactId: String(v.artifactId),
    versionIndex: Number(v.versionIndex),
    contentType: String(v.contentType || ''),
    contentText: v.contentText != null ? String(v.contentText) : null,
    contentJson: v.contentJson ?? null,
    createdAt: Number(v.createdAt),
    contentUrl: v.contentUrl != null ? String(v.contentUrl) : null,
    meta: v.meta ?? null
  }))

  const adoptedId = adopted?.id ? String(adopted.id) : ''
  adoptedVersionId.value = adoptedId

  const chosen = adoptedId ? versions.value.find((x) => x.id === adoptedId) : versions.value[0]
  selectedVersionId.value = chosen?.id || ''

  const items = Array.isArray((chosen as any)?.contentJson?.items) ? (chosen as any).contentJson.items : []
  const clean = items.map((x: any) => ({ k: String(x?.k ?? ''), v: String(x?.v ?? '') })).filter((x: any) => x.k)
  parseItemsToState(clean)
}

watch(() => [props.projectId, props.nodeId, props.capabilityId, props.refreshSeq, props.enabled], load, {
  immediate: true
})

async function onSelectVersion(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  selectedVersionId.value = id
  const v = versions.value.find((x) => x.id === id)
  if (!v) return

  const items = Array.isArray((v as any)?.contentJson?.items) ? (v as any).contentJson.items : []
  const clean = items.map((x: any) => ({ k: String(x?.k ?? ''), v: String(x?.v ?? '') })).filter((x: any) => x.k)
  parseItemsToState(clean)
}

async function adoptSelected() {
  const pid = props.projectId
  const nodeId = props.nodeId
  const vid = selectedVersionId.value
  if (!props.enabled || !pid || !nodeId || !vid) return

  const api = window.storyteller?.artifacts
  if (!api?.adoptVersion) return

  await api.adoptVersion(pid, nodeId, props.capabilityId, vid)
  await load()
}

async function saveVersion() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!props.enabled || !pid || !nodeId) return

  const api = window.storyteller?.artifacts
  if (!api?.appendVersion) return

  const items: Array<{ k: string; v: string }> = []
  for (const f of props.fields) {
    const v = String(fieldValues[f.key] ?? '')
    if (v || !f.optional) items.push({ k: f.key, v })
    else if (v) items.push({ k: f.key, v })
  }
  // keep template-external keys
  for (const it of otherItems.value) {
    const k = String(it.k ?? '').trim()
    if (!k) continue
    items.push({ k, v: String(it.v ?? '') })
  }

  await api.appendVersion({
    projectId: pid,
    nodeId,
    capabilityId: props.capabilityId,
    contentType: 'json',
    contentJson: { items },
    adopt: true
  })

  await load()
}
</script>

<style scoped>
.body {
  padding: 12px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.field {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 10px;
  padding: 10px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.field:first-child {
  border-top: none;
}

.label {
  font-size: 12px;
  color: #555;
}

.prompt {
  margin-top: 4px;
  font-size: 12px;
  color: #777;
}

.value {
  min-width: 0;
}

.input {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
}

.textarea {
  width: 100%;
  min-height: 70px;
  resize: vertical;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 8px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  box-sizing: border-box;
}

.other {
  border: 1px dashed rgba(0, 0, 0, 0.16);
  border-radius: 12px;
  padding: 8px 10px;
}

.otherList {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.otherRow {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 10px;
  align-items: start;
}

.k {
  font-size: 12px;
  color: #555;
  padding-top: 8px;
}

.hint,
.disabled {
  font-size: 12px;
  color: #555;
}
</style>
