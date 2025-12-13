<template>
  <div class="node" :class="{ selected: data.selected }">
    <div class="title">{{ data.title }}</div>
    <div class="meta">
      <span class="status" :data-status="data.status">{{ statusText }}</span>
      <span class="summary">{{ data.artifactSummary }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Props = {
  data: {
    title: string
    status: 'idle' | 'running' | 'succeeded' | 'failed'
    artifactSummary: string
    selected: boolean
  }
}

const props = defineProps<Props>()

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
