<template>
  <div class="editor">
    <div class="sectionTitle">分镜（JSON 版本）</div>
    <div class="memo">
      <div class="memoRow">
        <select class="select" :disabled="!projectId" :value="selectedVersionId" @change="onSelectVersion">
          <option value="">（选择版本）</option>
          <option v-for="v in versions" :key="v.id" :value="v.id">
            v{{ v.versionIndex }}{{ v.id === adoptedVersionId ? '（已采纳）' : '' }}
          </option>
        </select>
        <button class="btn" :disabled="!projectId || !selectedVersionId" @click="adoptSelected">采纳</button>
        <button class="btn" :disabled="!projectId" @click="saveVersion">保存新版本</button>
      </div>

      <textarea v-model="jsonText" class="memoArea" spellcheck="false" />
      <div class="hint">占位能力：当前仅提供 JSON 编辑/版本化；后续可升级为表格视图与生成。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import type { ArtifactVersion } from './types'

const props = defineProps<{
  projectId: string
  nodeId: string
  capabilityId: string
  refreshSeq?: number
}>()

const versions = ref<ArtifactVersion[]>([])
const selectedVersionId = ref('')
const adoptedVersionId = ref('')
const jsonText = ref(JSON.stringify({ shots: [] }, null, 2))

function toJsonText(v: ArtifactVersion | undefined | null): string {
  if (!v) return JSON.stringify({ shots: [] }, null, 2)
  if (v.contentType === 'json') return JSON.stringify(v.contentJson ?? { shots: [] }, null, 2)
  if (typeof v.contentText === 'string' && v.contentText.trim()) return v.contentText
  return JSON.stringify({ shots: [] }, null, 2)
}

async function load() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!pid || !nodeId) {
    versions.value = []
    selectedVersionId.value = ''
    adoptedVersionId.value = ''
    jsonText.value = JSON.stringify({ shots: [] }, null, 2)
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
  jsonText.value = toJsonText(chosen)
}

watch(() => [props.projectId, props.nodeId, props.capabilityId, props.refreshSeq], load, { immediate: true })

async function onSelectVersion(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  selectedVersionId.value = id
  const v = versions.value.find((x) => x.id === id)
  jsonText.value = toJsonText(v)
}

async function adoptSelected() {
  const pid = props.projectId
  const nodeId = props.nodeId
  const vid = selectedVersionId.value
  if (!pid || !nodeId || !vid) return

  const api = window.storyteller?.artifacts
  if (!api?.adoptVersion) return

  await api.adoptVersion(pid, nodeId, props.capabilityId, vid)
  await load()
}

async function saveVersion() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!pid || !nodeId) return

  let parsed: any
  try {
    parsed = JSON.parse(jsonText.value)
  } catch {
    return
  }

  const api = window.storyteller?.artifacts
  if (!api?.appendVersion) return

  await api.appendVersion({
    projectId: pid,
    nodeId,
    capabilityId: props.capabilityId,
    contentType: 'json',
    contentJson: parsed,
    adopt: true
  })

  await load()
}
</script>
