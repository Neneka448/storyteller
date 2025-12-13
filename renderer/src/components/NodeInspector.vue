<template>
  <div class="wrap">
    <div class="header">
      <div class="title">
        <div class="name">{{ node?.title ?? '未选择节点' }}</div>
        <div class="sub">{{ node ? `状态：${statusText(node.status)}｜${node.artifactSummary}` : '' }}</div>
      </div>
      <div class="actions">
        <button class="btn" :disabled="!node" @click="applyExample">注入示例渲染</button>
      </div>
    </div>

    <div v-if="!node" class="empty">在上方 DAG 里点一个节点查看详情。</div>

    <div v-else class="content">
      <div class="editor">
        <div class="sectionTitle">{{ hasKv ? '设定词典（KV）' : '备忘录（版本）' }}</div>
        <div class="memo">
          <div class="memoRow">
            <select class="select" :disabled="!projectId" :value="selectedVersionId" @change="onSelectVersion">
              <option value="">（选择版本）</option>
              <option v-for="v in versions" :key="v.id" :value="v.id">
                v{{ v.versionIndex }}{{ v.adopted ? '（已采纳）' : '' }}
              </option>
            </select>
            <button class="btn" :disabled="!projectId || !selectedVersionId" @click="adoptSelected">
              采纳
            </button>
            <button class="btn" :disabled="!projectId" @click="saveVersion">保存新版本</button>
          </div>

          <template v-if="hasKv">
            <div class="kvList">
              <div class="kvRow" v-for="(it, idx) in kvItems" :key="idx">
                <input class="kvKey" v-model="it.k" placeholder="Key" />
                <textarea class="kvVal" v-model="it.v" placeholder="Value" spellcheck="false" />
                <button class="btn" type="button" @click="removeKv(idx)">删</button>
              </div>
              <button class="btn" type="button" @click="addKv">添加条目</button>
            </div>
            <div class="hint">KV：以卡片/列表维护设定词典；保存会创建新版本并自动采纳。</div>
          </template>

          <template v-else>
            <textarea v-model="memoText" class="memoArea" spellcheck="false" />
            <div class="hint">备忘录：保存会创建新版本并自动采纳；可随时切回旧版本。</div>
          </template>
        </div>

        <template v-if="hasSandbox">
          <div class="sectionTitle">节点沙箱（HTML / CSS / JS）</div>
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
            <button class="btn" @click="applyToNode">应用到节点</button>
            <div class="hint">提示：第一期默认沙箱 CSP 禁止网络请求，仅允许 data/blob 图片。</div>
          </div>
        </template>
      </div>

      <div v-if="hasSandbox" class="preview">
        <div class="sectionTitle">预览</div>
        <div class="frameWrap">
          <SandboxFrame :html="draftHtml" :css="draftCss" :js="draftJs" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, watchEffect, ref } from 'vue'

import { usePipelineStore, type NodeSandbox } from '../stores/pipeline'
import { useProjectsStore } from '../stores/projects'
import SandboxFrame from './SandboxFrame.vue'

const pipeline = usePipelineStore()
const projects = useProjectsStore()

const projectId = computed(() => projects.active?.id || '')

const node = computed(() => pipeline.selectedNode)

const hasKv = computed(() => (node.value?.uiBlocks ?? []).some((b) => b.type === 'kv'))
const hasSandbox = computed(() => (node.value?.uiBlocks ?? []).some((b) => b.type === 'sandbox'))

type MemoVersion = {
  id: string
  versionIndex: number
  contentType: string
  contentText: string | null
  contentJson: any
  adopted: boolean
  createdAt: number
}

const memoText = ref('')
const versions = ref<MemoVersion[]>([])
const selectedVersionId = ref('')
const kvItems = ref<Array<{ k: string; v: string }>>([])

const draftHtml = ref('')
const draftCss = ref('')
const draftJs = ref('')

watchEffect(() => {
  const n = node.value
  const sandbox = n?.sandbox
  draftHtml.value = sandbox?.html ?? '<div style="padding:12px;font-family:system-ui">（暂无渲染）</div>'
  draftCss.value = sandbox?.css ?? ''
  draftJs.value = sandbox?.js ?? ''
})

watch(
  [projectId, () => node.value?.id],
  async ([pid, stepId]) => {
    if (!pid || !stepId) {
      versions.value = []
      selectedVersionId.value = ''
      memoText.value = ''
      return
    }

    const api = window.storyteller?.artifacts
    if (!api?.listVersions || !api.getAdopted) return

    const [list, adopted] = await Promise.all([api.listVersions(pid, stepId), api.getAdopted(pid, stepId)])
    versions.value = (Array.isArray(list) ? list : []).map((v: any) => ({
      id: String(v.id),
      versionIndex: Number(v.versionIndex),
      contentType: String(v.contentType || ''),
      contentText: v.contentText != null ? String(v.contentText) : null,
      contentJson: v.contentJson ?? null,
      adopted: Boolean(v.adopted),
      createdAt: Number(v.createdAt)
    }))

    const adoptedId = adopted?.id ? String(adopted.id) : ''
    const newest = versions.value[0]
    const chosen = adoptedId ? versions.value.find((v) => v.id === adoptedId) : newest

    selectedVersionId.value = chosen?.id || ''
    if (hasKv.value) {
      const items = Array.isArray((chosen as any)?.contentJson?.items) ? (chosen as any).contentJson.items : []
      kvItems.value = items.map((x: any) => ({ k: String(x?.k ?? ''), v: String(x?.v ?? '') }))
      memoText.value = ''
    } else {
      memoText.value = chosen?.contentText ?? ''
      kvItems.value = []
    }
  },
  { immediate: true }
)

function statusText(status: string) {
  switch (status) {
    case 'running':
      return '生成中'
    case 'succeeded':
      return '成功'
    case 'failed':
      return '失败'
    default:
      return '未开始'
  }
}

function applyToNode() {
  const n = node.value
  if (!n) return
  const sandbox: NodeSandbox = {
    html: draftHtml.value,
    css: draftCss.value,
    js: draftJs.value
  }
  pipeline.updateNodeSandbox(n.id, sandbox)
}

async function onSelectVersion(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  selectedVersionId.value = id
  const v = versions.value.find((x) => x.id === id)
  if (!v) return
  if (hasKv.value) {
    const items = Array.isArray((v as any).contentJson?.items) ? (v as any).contentJson.items : []
    kvItems.value = items.map((x: any) => ({ k: String(x?.k ?? ''), v: String(x?.v ?? '') }))
    memoText.value = ''
  } else {
    memoText.value = v.contentText ?? ''
  }
}

async function saveVersion() {
  const pid = projectId.value
  const stepId = node.value?.id
  if (!pid || !stepId) return

  const apiA = window.storyteller?.artifacts
  const apiP = window.storyteller?.pipeline
  if (!apiA?.listVersions || !apiA.getAdopted || !apiP?.runStep) return

  if (hasKv.value) {
    const clean = kvItems.value
      .map((x) => ({ k: String(x.k ?? '').trim(), v: String(x.v ?? '') }))
      .filter((x) => x.k)
    await apiP.runStep({ projectId: pid, stepId, mode: 'run', contentJson: { items: clean } })
  } else {
    await apiP.runStep({ projectId: pid, stepId, mode: 'run', contentText: memoText.value })
  }

  const [list, adopted] = await Promise.all([apiA.listVersions(pid, stepId), apiA.getAdopted(pid, stepId)])
  versions.value = (Array.isArray(list) ? list : []).map((v: any) => ({
    id: String(v.id),
    versionIndex: Number(v.versionIndex),
    contentType: String(v.contentType || ''),
    contentText: v.contentText != null ? String(v.contentText) : null,
    contentJson: v.contentJson ?? null,
    adopted: Boolean(v.adopted),
    createdAt: Number(v.createdAt)
  }))

  const adoptedId = adopted?.id ? String(adopted.id) : ''
  selectedVersionId.value = adoptedId || versions.value[0]?.id || ''

  // 刷新步骤摘要/采纳状态
  await pipeline.loadFromProject(pid)
}

async function adoptSelected() {
  const pid = projectId.value
  const stepId = node.value?.id
  const vid = selectedVersionId.value
  if (!pid || !stepId || !vid) return

  const api = window.storyteller?.artifacts
  if (!api?.adoptVersion || !api.listVersions) return

  await api.adoptVersion(pid, stepId, vid)
  const list = await api.listVersions(pid, stepId)
  versions.value = (Array.isArray(list) ? list : []).map((v: any) => ({
    id: String(v.id),
    versionIndex: Number(v.versionIndex),
    contentType: String(v.contentType || ''),
    contentText: v.contentText != null ? String(v.contentText) : null,
    contentJson: v.contentJson ?? null,
    adopted: Boolean(v.adopted),
    createdAt: Number(v.createdAt)
  }))
  await pipeline.loadFromProject(pid)
}

function addKv() {
  kvItems.value = [...kvItems.value, { k: '', v: '' }]
}

function removeKv(idx: number) {
  kvItems.value = kvItems.value.filter((_, i) => i !== idx)
}

function applyExample() {
  const n = node.value
  if (!n) return

  draftHtml.value = '<div id="root"></div>'
  draftCss.value =
    'body{margin:0;font-family:system-ui;} .wrap{padding:12px} .h{font-weight:700;margin-bottom:6px} .p{font-size:12px;color:#555} .box{height:120px;border:1px dashed #bbb;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-top:10px}'
  draftJs.value =
    "const root=document.getElementById('root');\nroot.innerHTML=`<div class='wrap'><div class='h'>节点渲染示例</div><div class='p'>这段脚本在 sandbox iframe 中执行，可用于渲染表格/图片/自定义 UI。</div><div class='box' id='box'>点击变色</div></div>`;\nconst box=document.getElementById('box');\nbox.addEventListener('click',()=>{box.style.background='rgba(59,130,246,0.18)'; box.textContent='OK ' + new Date().toLocaleTimeString();});\nif (window.storyteller?.log) window.storyteller.log('example mounted');"

  applyToNode()
}
</script>

<style scoped>
.wrap {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
}

.header {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  color: #111;
}

.title .name {
  font-weight: 700;
}

.title .sub {
  font-size: 12px;
  color: #555;
  margin-top: 2px;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: #f6f6f6;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty {
  padding: 18px;
  color: #111;
  background: #fff;
}

.content {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
  background: #f3f4f6;
}

.editor,
.preview {
  min-width: 0;
  min-height: 0;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
}

.sectionTitle {
  padding: 10px 12px;
  font-weight: 700;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.grid {
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.memo {
  padding: 12px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
}

.memoRow {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.kvList {
  display: grid;
  gap: 10px;
}

.kvRow {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: 8px;
  align-items: start;
}

.kvKey {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
}

.kvVal {
  width: 100%;
  min-height: 80px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  resize: vertical;
}

.select {
  width: 100%;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: #fff;
}

.memoArea {
  width: 100%;
  min-height: 140px;
  resize: vertical;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  font-size: 12px;
  box-sizing: border-box;
}

.labelTitle {
  font-size: 12px;
  color: #444;
  margin-bottom: 6px;
}

textarea {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  font-size: 12px;
  box-sizing: border-box;
}

.editorActions {
  padding: 10px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hint {
  font-size: 12px;
  color: #555;
}

.frameWrap {
  min-height: 0;
}

.frameWrap {
  height: 100%;
}
</style>
