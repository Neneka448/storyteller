<template>
  <component
    v-if="enabled && component"
    :is="component"
    :project-id="projectId"
    :node-id="nodeId"
    :capability-id="capabilityId"
    :refresh-seq="refreshSeq"
  />

  <div v-else class="editor">
    <div class="sectionTitle">{{ title }}</div>
    <div class="body">
      <div class="disabled">该节点未启用 {{ capabilityId }} 能力。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import KvPanel from '../../panels/KvPanel.vue'
import MemoPanel from '../../panels/MemoPanel.vue'
import ImagePanel from '../../panels/ImagePanel.vue'
import SandboxPanel from '../../panels/SandboxPanel.vue'
import StoryboardPanel from '../../panels/StoryboardPanel.vue'

const props = defineProps<{
  title: string
  projectId: string
  nodeId: string
  capabilityId: string
  refreshSeq?: number
  enabled: boolean
}>()

const component = computed(() => {
  switch (String(props.capabilityId)) {
    case 'kv':
      return KvPanel as any
    case 'memo':
      return MemoPanel as any
    case 'image':
      return ImagePanel as any
    case 'sandbox':
      return SandboxPanel as any
    case 'storyboard':
      return StoryboardPanel as any
    default:
      return null
  }
})
</script>

<style scoped>
.body {
  padding: 12px;
}

.disabled {
  font-size: 12px;
  color: #555;
}
</style>
