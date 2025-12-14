<template>
  <div class="editor">
    <div class="sectionTitle">{{ title }}</div>
    <div class="body">
      <div v-if="!children.length" class="emptyHint">{{ emptyHint || '暂无子节点。' }}</div>
      <div v-else class="list">
        <button v-for="c in children" :key="c.id" class="row" type="button" @click="select(c.id)">
          <div class="name">{{ c.title }}</div>
          <div class="meta">{{ c.type || '' }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { usePipelineStore } from '../../../stores/pipeline'

const props = defineProps<{
  title: string
  emptyHint?: string
  projectId: string
  nodeId: string
}>()

const pipeline = usePipelineStore()

const children = computed(() => {
  const pid = String(props.nodeId || '')
  if (!pid) return []
  return pipeline.nodes
    .filter((n) => String(n.parentId ?? '') === pid)
    .slice()
    .sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0))
})

function select(id: string) {
  pipeline.selectNode(String(id))
}
</script>

<style scoped>
.body {
  padding: 12px;
}

.emptyHint {
  font-size: 12px;
  color: #555;
}

.list {
  display: grid;
  gap: 8px;
}

.row {
  text-align: left;
  padding: 10px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fff;
  cursor: pointer;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: baseline;
}

.row:hover {
  background: rgba(0, 0, 0, 0.02);
}

.name {
  font-weight: 600;
  font-size: 13px;
  color: #111;
}

.meta {
  font-size: 12px;
  color: #666;
}
</style>
