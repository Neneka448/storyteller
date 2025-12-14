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
  const allNodes = pipeline.nodes
  const byId = new Map(allNodes.map((n) => [String(n.id), n]))

  // Build children map from parentId
  const childrenByParent = new Map<string, string[]>()
  for (const n of allNodes) {
    const p = n.parentId
    if (!p) continue
    const key = String(p)
    const arr = childrenByParent.get(key) ?? []
    arr.push(String(n.id))
    childrenByParent.set(key, arr)
  }

  // Roots = nodes whose parent is not in display list
  const nodeIds = new Set(allNodes.map((n) => String(n.id)))
  const roots = allNodes
    .filter((n) => !n.parentId || !nodeIds.has(String(n.parentId)))
    .sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0))
    .map((n) => String(n.id))

  // Visible set: hide descendants of collapsed nodes
  const visible = new Set<string>()
  const visitVisible = (id: string) => {
    visible.add(id)
    if (pipeline.collapsedById[id] === true) return
    const children = childrenByParent.get(id) ?? []
    for (const c of children) visitVisible(c)
  }
  for (const r of roots) visitVisible(r)

  const nodes = allNodes.filter((n) => visible.has(String(n.id)))

  // Simple deterministic layout (left-to-right by depth; top-to-bottom by traversal order)
  const xGap = 260
  const yGap = 110
  const startX = 60
  const startY = 60

  const positions = new Map<string, { x: number; y: number }>()
  let cursorY = 0

  const visit = (id: string, depth: number) => {
    if (!visible.has(id)) return
    const y = startY + cursorY * yGap
    const x = startX + depth * xGap
    positions.set(id, { x, y })
    cursorY += 1

    const children = (childrenByParent.get(id) ?? [])
      .map((cid) => byId.get(cid))
      .filter(Boolean) as any[]
    children.sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0))
    if (pipeline.collapsedById[id] === true) return
    for (const c of children) visit(String(c.id), depth + 1)
  }

  for (const r of roots) visit(r, 0)

  return nodes.map((n) => {
    const pos = positions.get(String(n.id)) ?? { x: startX, y: startY }
    return {
      id: n.id,
      type: 'step',
      position: pos,
      data: {
        id: n.id,
        title: n.title,
        status: n.status,
        artifactSummary: n.artifactSummary || '',
        selected: n.id === pipeline.selectedNodeId
      },
      draggable: false,
      selectable: true
    }
  })
})

const flowEdges = computed<Edge[]>(() => {
  const nodes = pipeline.nodes
  const nodeIds = new Set(nodes.map((n) => String(n.id)))

  const childrenByParent = new Map<string, string[]>()
  for (const n of nodes) {
    const p = n.parentId
    if (!p) continue
    const key = String(p)
    const arr = childrenByParent.get(key) ?? []
    arr.push(String(n.id))
    childrenByParent.set(key, arr)
  }

  const roots = nodes
    .filter((n) => !n.parentId || !nodeIds.has(String(n.parentId)))
    .sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0))
    .map((n) => String(n.id))

  const visible = new Set<string>()
  const visit = (id: string) => {
    visible.add(id)
    if (pipeline.collapsedById[id] === true) return
    for (const c of childrenByParent.get(id) ?? []) visit(c)
  }
  for (const r of roots) visit(r)

  const isVisible = (id: string) => visible.has(String(id))
  return pipeline.edges
    .filter(([source, target]) => isVisible(source) && isVisible(target))
    .map(([source, target], idx) => ({
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
