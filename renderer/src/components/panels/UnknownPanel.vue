<template>
  <div class="editor">
    <div class="sectionTitle">{{ title }}</div>
    <div class="memo">
      <div class="memoRow">
        <select class="select" :disabled="!projectId" :value="selectedVersionId" @change="onSelectVersion">
          <option value="">（选择版本）</option>
          <option v-for="v in versions" :key="v.id" :value="v.id">
            v{{ v.versionIndex }}{{ v.id === adoptedVersionId ? '（已采纳）' : '' }}
          </option>
        </select>
        <button class="btn" :disabled="!projectId || !selectedVersionId" @click="adoptSelected">采纳</button>
        <button class="btn" :disabled="!projectId" @click="saveAsText">保存新版本（text）</button>
      </div>

      <textarea v-model="text" class="memoArea" spellcheck="false" />
      <div class="hint">未注册组件：以文本/JSON 降级展示与保存。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { ArtifactVersion } from './types'

const props = defineProps<{
  projectId: string
  nodeId: string
  capabilityId: string
  componentName?: string | null
  refreshSeq?: number
}>()

const title = computed(() => {
  const c = props.componentName ? String(props.componentName) : 'Unknown'
  return `${props.capabilityId}（${c}）`
})

const versions = ref<ArtifactVersion[]>([])
const selectedVersionId = ref('')
const adoptedVersionId = ref('')
const text = ref('')

async function load() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!pid || !nodeId) {
    versions.value = []
    selectedVersionId.value = ''
    adoptedVersionId.value = ''
    text.value = ''
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

  if (chosen?.contentType === 'json') {
    text.value = JSON.stringify(chosen.contentJson ?? null, null, 2)
  } else {
    text.value = chosen?.contentText ?? ''
  }
}

watch(() => [props.projectId, props.nodeId, props.capabilityId, props.refreshSeq], load, { immediate: true })

async function onSelectVersion(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  selectedVersionId.value = id
  const v = versions.value.find((x) => x.id === id)
  if (!v) return
  if (v.contentType === 'json') text.value = JSON.stringify(v.contentJson ?? null, null, 2)
  else text.value = v.contentText ?? ''
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

async function saveAsText() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!pid || !nodeId) return

  const api = window.storyteller?.artifacts
  if (!api?.appendVersion) return

  await api.appendVersion({
    projectId: pid,
    nodeId,
    capabilityId: props.capabilityId,
    contentType: 'text',
    contentText: text.value,
    adopt: true
  })

  await load()
}
</script>
