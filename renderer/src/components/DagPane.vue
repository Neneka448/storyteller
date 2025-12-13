<template>
  <div class="dagWrap">
    <VueFlow
      :nodes="flowNodes"
      :edges="flowEdges"
      fit-view-on-init
      :node-types="nodeTypes"
      :min-zoom="0.2"
      :max-zoom="1.5"
      @node-click="onNodeClick"
    >
      <Background pattern-color="#aaa" :gap="18" :size="1" />
      <Controls />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import {
  VueFlow,
  type Edge,
  type Node,
  type NodeMouseEvent,
  type NodeTypesObject
} from '@vue-flow/core'

import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

import { usePipelineStore } from '../stores/pipeline'
import StepNode from './StepNode.vue'

const pipeline = usePipelineStore()

const nodeTypes: NodeTypesObject = {
  step: markRaw(StepNode) as any
}

const flowNodes = computed<Node[]>(() => {
  const nodes = pipeline.nodes

  // 简单布局：横向排布
  const startX = 60
  const startY = 80
  const gapX = 220

  return nodes.map((n, idx) => ({
    id: n.id,
    type: 'step',
    position: { x: startX + idx * gapX, y: startY },
    data: {
      title: n.title,
      status: n.status,
      artifactSummary: n.artifactSummary,
      selected: n.id === pipeline.selectedNodeId
    },
    draggable: false,
    selectable: true
  }))
})

const flowEdges = computed<Edge[]>(() => {
  return pipeline.edges.map(([source, target], idx) => ({
    id: `e_${idx}_${source}_${target}`,
    source,
    target,
    animated: false
  }))
})

function onNodeClick(e: NodeMouseEvent) {
  const id = String(e.node.id)
  pipeline.selectNode(id)
}
</script>

<style scoped>
.dagWrap {
  height: 100%;
  width: 100%;
}
</style>
