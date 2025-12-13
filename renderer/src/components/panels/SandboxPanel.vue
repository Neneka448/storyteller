<template>
  <div class="sandboxContent">
    <div class="editor">
      <div class="sectionTitle">节点沙箱（HTML / CSS / JS）</div>

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

        <div class="grid">
          <label class="label">
            <div class="labelTitle">HTML</div>
            <textarea v-model="draftHtml" spellcheck="false" />
          </label>
          <label class="label">
            <div class="labelTitle">CSS</div>
            <textarea v-model="draftCss" spellcheck="false" />
          </label>
          <label class="label">
            <div class="labelTitle">JS</div>
            <textarea v-model="draftJs" spellcheck="false" />
          </label>
        </div>

        <div class="editorActions">
          <button class="btn" type="button" @click="applyExample">注入示例渲染</button>
          <div class="hint">提示：第一期默认沙箱 CSP 禁止网络请求，仅允许 data/blob 图片。</div>
        </div>
      </div>
    </div>

    <div class="preview">
      <div class="sectionTitle">预览</div>
      <div class="frameWrap">
        <SandboxFrame :html="draftHtml" :css="draftCss" :js="draftJs" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import SandboxFrame from '../SandboxFrame.vue'
import type { ArtifactVersion } from './types'

const props = defineProps<{
  projectId: string
  nodeId: string
  capabilityId: string
  refreshSeq?: number
}>()

type SandboxData = { html: string; css: string; js: string }

const versions = ref<ArtifactVersion[]>([])
const selectedVersionId = ref('')
const adoptedVersionId = ref('')

const draftHtml = ref('')
const draftCss = ref('')
const draftJs = ref('')

function toSandboxData(v: ArtifactVersion | undefined | null): SandboxData {
  const j: any = v?.contentJson
  return {
    html: typeof j?.html === 'string' ? j.html : '<div style="padding:12px;font-family:system-ui">（暂无渲染）</div>',
    css: typeof j?.css === 'string' ? j.css : '',
    js: typeof j?.js === 'string' ? j.js : ''
  }
}

async function load() {
  const pid = props.projectId
  const nodeId = props.nodeId
  if (!pid || !nodeId) {
    versions.value = []
    selectedVersionId.value = ''
    adoptedVersionId.value = ''
    const d = toSandboxData(null)
    draftHtml.value = d.html
    draftCss.value = d.css
    draftJs.value = d.js
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

  const d = toSandboxData(chosen)
  draftHtml.value = d.html
  draftCss.value = d.css
  draftJs.value = d.js
}

watch(() => [props.projectId, props.nodeId, props.capabilityId, props.refreshSeq], load, { immediate: true })

async function onSelectVersion(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  selectedVersionId.value = id
  const v = versions.value.find((x) => x.id === id)
  if (!v) return
  const d = toSandboxData(v)
  draftHtml.value = d.html
  draftCss.value = d.css
  draftJs.value = d.js
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

  await api.appendVersion({
    projectId: pid,
    nodeId,
    capabilityId: props.capabilityId,
    contentType: 'json',
    contentJson: { html: draftHtml.value, css: draftCss.value, js: draftJs.value },
    adopt: true
  })

  await load()
}

async function applyExample() {
  draftHtml.value = '<div id="root"></div>'
  draftCss.value =
    'body{margin:0;font-family:system-ui;} .wrap{padding:12px} .h{font-weight:700;margin-bottom:6px} .p{font-size:12px;color:#555} .box{height:120px;border:1px dashed #bbb;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-top:10px}'
  draftJs.value =
    "const root=document.getElementById('root');\nroot.innerHTML=`<div class='wrap'><div class='h'>节点渲染示例</div><div class='p'>这段脚本在 sandbox iframe 中执行，可用于渲染表格/图片/自定义 UI。</div><div class='box' id='box'>点击变色</div></div>`;\nconst box=document.getElementById('box');\nbox.addEventListener('click',()=>{box.style.background='rgba(59,130,246,0.18)'; box.textContent='OK ' + new Date().toLocaleTimeString();});\nif (window.storyteller?.log) window.storyteller.log('example mounted');"

  await saveVersion()
}
</script>

<style scoped>
.sandboxContent {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .sandboxContent {
    grid-template-columns: 1fr;
  }
}
</style>
