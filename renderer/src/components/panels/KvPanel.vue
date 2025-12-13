<template>
  <div class="editor">
    <div class="sectionTitle">设定词典（KV）</div>
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

      <div class="kvList">
        <div class="kvRow" v-for="(it, idx) in kvItems" :key="idx">
          <input class="kvKey" v-model="it.k" placeholder="Key" />
          <textarea class="kvVal" v-model="it.v" placeholder="Value" spellcheck="false" />
          <button class="btn" type="button" @click="removeKv(idx)">删</button>
        </div>
        <button class="btn" type="button" @click="addKv">添加条目</button>
      </div>

      <div class="hint">保存会创建新版本并自动采纳。</div>
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
const kvItems = ref<Array<{ k: string; v: string }>>([])

async function load() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!pid || !nodeId) {
    versions.value = []
    selectedVersionId.value = ''
    adoptedVersionId.value = ''
    kvItems.value = []
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
  kvItems.value = items.map((x: any) => ({ k: String(x?.k ?? ''), v: String(x?.v ?? '') }))
}

watch(() => [props.projectId, props.nodeId, props.capabilityId, props.refreshSeq], load, { immediate: true })

async function onSelectVersion(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  selectedVersionId.value = id
  const v = versions.value.find((x) => x.id === id)
  if (!v) return
  const items = Array.isArray((v as any).contentJson?.items) ? (v as any).contentJson.items : []
  kvItems.value = items.map((x: any) => ({ k: String(x?.k ?? ''), v: String(x?.v ?? '') }))
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

  const api = window.storyteller?.artifacts
  if (!api?.appendVersion) return

  const clean = kvItems.value
    .map((x) => ({ k: String(x.k ?? '').trim(), v: String(x.v ?? '') }))
    .filter((x) => x.k)

  await api.appendVersion({
    projectId: pid,
    nodeId,
    capabilityId: props.capabilityId,
    contentType: 'json',
    contentJson: { items: clean },
    adopt: true
  })

  await load()
}

function addKv() {
  kvItems.value = [...kvItems.value, { k: '', v: '' }]
}

function removeKv(idx: number) {
  kvItems.value = kvItems.value.filter((_, i) => i !== idx)
}
</script>
