<template>
  <div class="editor">
    <div class="sectionTitle">{{ title }}</div>
    <div class="body">
      <div v-if="!enabled" class="disabled">
        该节点未启用 memo 能力，无法编辑概述。
      </div>

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

        <div v-if="prompt" class="prompt">{{ prompt }}</div>
        <textarea v-model="memoText" class="memo" spellcheck="false" />
        <div class="hint">保存会创建新版本并自动采纳。</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import type { ArtifactVersion } from '../../panels/types'

const props = defineProps<{
  title: string
  prompt?: string
  projectId: string
  nodeId: string
  capabilityId: string
  refreshSeq?: number
  enabled: boolean
}>()

const memoText = ref('')
const versions = ref<ArtifactVersion[]>([])
const selectedVersionId = ref('')
const adoptedVersionId = ref('')

async function load() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!props.enabled || !pid || !nodeId) {
    versions.value = []
    selectedVersionId.value = ''
    adoptedVersionId.value = ''
    memoText.value = ''
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
  memoText.value = chosen?.contentText ?? ''
}

watch(() => [props.projectId, props.nodeId, props.capabilityId, props.refreshSeq, props.enabled], load, {
  immediate: true
})

async function onSelectVersion(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  selectedVersionId.value = id
  const v = versions.value.find((x) => x.id === id)
  if (!v) return
  memoText.value = v.contentText ?? ''
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

  await api.appendVersion({
    projectId: pid,
    nodeId,
    capabilityId: props.capabilityId,
    contentType: 'text',
    contentText: memoText.value,
    adopt: true
  })

  await load()
}
</script>

<style scoped>
.body {
  padding: 12px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 10px;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.prompt {
  font-size: 12px;
  color: #555;
}

.memo {
  width: 100%;
  min-height: 140px;
  resize: vertical;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  box-sizing: border-box;
}

.hint {
  font-size: 12px;
  color: #555;
}

.disabled {
  font-size: 12px;
  color: #555;
}
</style>
