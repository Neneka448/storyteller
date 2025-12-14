<template>
  <div class="node" :class="{ selected: data.selected }">
    <div class="titleRow">
      <div class="title">{{ data.title }}</div>
      <button v-if="hasChildren" class="toggle" type="button" @click="toggle">
        {{ isCollapsed ? '▸' : '▾' }}
      </button>
    </div>
    <div class="meta">
      <span class="status" :data-status="data.status">{{ statusText }}</span>
      <span class="summary">{{ data.artifactSummary }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { usePipelineStore } from '../stores/pipeline'

type Props = {
  data: {
    id: string
    title: string
    status: 'idle' | 'running' | 'succeeded' | 'failed'
    artifactSummary: string
    selected: boolean
  }
}

const props = defineProps<Props>()

const pipeline = usePipelineStore()

const hasChildren = computed(() => {
  const nodeId = String((props as any).data?.id ?? '')
  if (!nodeId) return false
  return pipeline.nodes.some((n) => String(n.parentId ?? '') === nodeId)
})

const isCollapsed = computed(() => {
  const nodeId = String((props as any).data?.id ?? '')
  if (!nodeId) return false
  return pipeline.collapsedById[nodeId] === true
})

function toggle(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  const nodeId = String((props as any).data?.id ?? '')
  if (!nodeId) return
  pipeline.toggleCollapsed(nodeId)
}

const statusText = computed(() => {
  switch (props.data.status) {
    case 'running':
      return '生成中'
    case 'succeeded':
      return '成功'
    case 'failed':
      return '失败'
    default:
      return '未开始'
  }
})
</script>

<style scoped>
.node {
  width: 200px;
  padding: 10px 10px 8px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.92);
  color: #111;
}

.titleRow {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: start;
}

.toggle {
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  width: 26px;
  height: 22px;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
}

.node.selected {
  outline: 2px solid rgba(59, 130, 246, 0.75);
}

.title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 6px;
}

.meta {
  display: grid;
  grid-template-rows: auto auto;
  gap: 4px;
}

.status {
  font-size: 12px;
  color: #444;
}

.status[data-status='running'] {
  color: #b45309;
}

.status[data-status='succeeded'] {
  color: #047857;
}

.status[data-status='failed'] {
  color: #b91c1c;
}

.summary {
  font-size: 12px;
  color: #666;
}
</style>
