<template>
  <div class="tpl">
    <template v-for="(s, idx) in template.sections" :key="`${template.id}:${idx}:${s.type}`">
      <ChildrenListSection
        v-if="s.type === 'childrenList'"
        :title="s.title"
        :empty-hint="s.emptyHint"
        :node-id="nodeId"
        :project-id="projectId"
      />

      <MemoBlockSection
        v-else-if="s.type === 'memoBlock'"
        :title="s.title"
        :prompt="s.prompt"
        :project-id="projectId"
        :node-id="nodeId"
        :capability-id="s.capabilityId"
        :refresh-seq="refreshSeq"
        :enabled="hasCapability(s.capabilityId)"
      />

      <KvGroupSection
        v-else-if="s.type === 'kvGroup'"
        :title="s.title"
        :fields="s.fields"
        :show-other-fields="Boolean(s.showOtherFields)"
        :project-id="projectId"
        :node-id="nodeId"
        :capability-id="s.capabilityId"
        :refresh-seq="refreshSeq"
        :enabled="hasCapability(s.capabilityId)"
      />

      <CapabilityPanelSection
        v-else-if="s.type === 'capabilityPanel'"
        :title="s.title"
        :project-id="projectId"
        :node-id="nodeId"
        :capability-id="s.capabilityId"
        :refresh-seq="refreshSeq"
        :enabled="hasCapability(s.capabilityId)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { NodeTemplate } from '../../templates/types'

import ChildrenListSection from './sections/ChildrenListSection.vue'
import CapabilityPanelSection from './sections/CapabilityPanelSection.vue'
import KvGroupSection from './sections/KvGroupSection.vue'
import MemoBlockSection from './sections/MemoBlockSection.vue'

const props = defineProps<{
  template: NodeTemplate
  projectId: string
  nodeId: string
  nodeCapabilities: string[]
  refreshSeq?: number
}>()

const capSet = computed(() => new Set((props.nodeCapabilities ?? []).map(String)))

function hasCapability(id: string) {
  return capSet.value.has(String(id))
}
</script>

<style scoped>
.tpl {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
</style>
