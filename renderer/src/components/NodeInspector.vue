<template>
  <div class="wrap">
    <div class="header">
      <div class="title">
        <div class="name">{{ node?.title ?? '未选择节点' }}</div>
        <div class="sub">
          {{ node ? `状态：${statusText(node.status)}｜${node.type ?? ''}` : '' }}
          <template v-if="node && lastRunText">｜最近：{{ lastRunText }}</template>
        </div>
        <div v-if="node && lastErrorText" class="sub error">失败原因：{{ lastErrorText }}</div>
        <div v-if="node && renderSummary" class="sub">render：{{ renderSummary }}</div>
      </div>
    </div>

    <div v-if="!node" class="empty">在上方 DAG 里点一个节点查看详情。</div>

    <div v-else class="content">
      <TemplateRenderer
        v-if="activeTemplate"
        :template="activeTemplate"
        :project-id="projectId"
        :node-id="String(node?.id || '')"
        :node-capabilities="(node?.capabilities ?? []) as any"
        :refresh-seq="refreshSeq"
      />

      <template v-else>
        <component
          v-for="p in panels"
          :key="p.key"
          :is="p.component"
          :project-id="projectId"
          :node-id="String(node?.id || '')"
          :capability-id="p.capabilityId"
          :component-name="p.componentName"
          :refresh-seq="refreshSeq"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { usePipelineStore } from '../stores/pipeline'
import { useProjectsStore } from '../stores/projects'

import { capabilityComponentRegistry } from './capabilityComponentRegistry'

import TemplateRenderer from './template/TemplateRenderer.vue'
import { resolveTemplate } from '../templates/registry'

const pipeline = usePipelineStore()
const projects = useProjectsStore()

const projectId = computed(() => projects.active?.id || '')

const node = computed(() => pipeline.selectedNode)

const activeTemplate = computed(() => {
  const t = String(node.value?.type ?? '')
  if (!t) return null
  return resolveTemplate(t)
})

type CapabilityView = { id: string; render: { componentName: string; uiOptions?: Record<string, any> } | null }

const capabilities = ref<CapabilityView[]>([])

const refreshSeq = ref(0)
const lastRunText = ref('')
const lastErrorText = ref('')
let offAppEvents: null | (() => void) = null

onMounted(async () => {
  const api = window.storyteller?.capabilities
  if (api?.list) {
    const list = await api.list().catch(() => [])
    capabilities.value = Array.isArray(list) ? list : []
  }

  const events = window.storyteller?.events
  if (events?.on) {
    offAppEvents = events.on((e) => {
      const type = String(e?.type ?? '')
      const payload = e?.payload ?? {}
      const selectedNodeId = String(node.value?.id ?? '')

      if (payload?.nodeId && String(payload.nodeId) !== selectedNodeId) return

      if (type === 'data:changed') {
        refreshSeq.value += 1
        return
      }

      if (type === 'run:start') {
        lastRunText.value = `run:${String(payload?.runId ?? '')} 运行中（${String(payload?.capabilityId ?? '')}）`
        lastErrorText.value = ''
        return
      }

      if (type === 'run:succeeded') {
        lastRunText.value = `run:${String(payload?.runId ?? '')} 成功（${String(payload?.capabilityId ?? '')}）`
        lastErrorText.value = ''
        return
      }

      if (type === 'run:failed') {
        lastRunText.value = `run:${String(payload?.runId ?? '')} 失败（${String(payload?.capabilityId ?? '')}）`
        lastErrorText.value = String(payload?.error ?? '')
        return
      }
    })
  }
})

onBeforeUnmount(() => {
  offAppEvents?.()
})

const panels = computed(() => {
  const capIds = Array.isArray(node.value?.capabilities) ? node.value!.capabilities! : []
  const byId = new Map(capabilities.value.map((c) => [String(c.id), c]))

  return capIds.map((capabilityId) => {
    const c = byId.get(String(capabilityId))
    const componentName = c?.render?.componentName ?? null
    const component = (componentName && capabilityComponentRegistry[componentName]) || capabilityComponentRegistry.UnknownPanel
    return {
      key: `${String(capabilityId)}:${String(componentName || 'UnknownPanel')}`,
      capabilityId: String(capabilityId),
      componentName,
      component
    }
  })
})

const renderSummary = computed(() => {
  if (!node.value) return ''
  if (activeTemplate.value) return `${activeTemplate.value.label}（template）`
  if (!panels.value.length) return ''
  return panels.value
    .map((p) => {
      const name = p.componentName ? String(p.componentName) : 'UnknownPanel'
      return `${String(p.capabilityId)}→${name}`
    })
    .join('｜')
})

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
</script>

<style src="./nodeInspector.css"></style>
