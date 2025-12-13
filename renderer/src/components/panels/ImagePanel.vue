<template>
  <div class="content">
    <div class="editor">
      <div class="sectionTitle">图片（版本）</div>
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

        <textarea v-model="imageUrl" class="memoArea" spellcheck="false" placeholder="输入图片 URL（http/https/data/blob/file）" />
        <div class="hint">保存会创建新版本并自动采纳。</div>
      </div>
    </div>

    <div class="preview">
      <div class="sectionTitle">预览</div>
      <div class="frameWrap" style="padding:12px; overflow:auto;">
        <img v-if="imageUrl.trim()" :src="imageUrl" style="max-width:100%; height:auto; display:block;" />
        <div v-else class="hint">（暂无图片）</div>
      </div>
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
const imageUrl = ref('')

function toUrl(v: ArtifactVersion | undefined | null): string {
  if (!v) return ''
  if (v.contentType === 'image') return String(v.contentUrl ?? '')
  if (typeof v.contentText === 'string') return v.contentText
  return ''
}

async function load() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!pid || !nodeId) {
    versions.value = []
    selectedVersionId.value = ''
    adoptedVersionId.value = ''
    imageUrl.value = ''
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
  imageUrl.value = toUrl(chosen)
}

watch(() => [props.projectId, props.nodeId, props.capabilityId, props.refreshSeq], load, { immediate: true })

async function onSelectVersion(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  selectedVersionId.value = id
  const v = versions.value.find((x) => x.id === id)
  imageUrl.value = toUrl(v)
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

  const url = imageUrl.value.trim()
  if (!url) return

  const api = window.storyteller?.artifacts
  if (!api?.appendVersion) return

  await api.appendVersion({
    projectId: pid,
    nodeId,
    capabilityId: props.capabilityId,
    contentType: 'image',
    contentUrl: url,
    adopt: true
  })

  await load()
}
</script>

<style scoped>
.content {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .content {
    grid-template-columns: 1fr;
  }
}
</style>
