<template>
  <div class="wrap">
    <div class="row">
      <select class="select" :value="activeId" @change="onChange">
        <option v-for="p in projects.projects" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>
      <button class="btn" type="button" @click="onCreate">新建</button>
      <button class="btn danger" type="button" :disabled="!activeId" @click="onDelete">删除</button>
    </div>
    <div class="hint" v-if="projects.active">当前项目：{{ projects.active.name }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'

import { useProjectsStore } from '../stores/projects'
import { usePipelineStore } from '../stores/pipeline'

const projects = useProjectsStore()
const pipeline = usePipelineStore()

const activeId = computed(() => projects.active?.id || '')

onMounted(async () => {
  await projects.ensureActive()
  if (projects.active?.id) {
    await pipeline.loadFromProject(projects.active.id)
  }
})

async function onChange(e: Event) {
  const id = String((e.target as HTMLSelectElement).value || '')
  if (!id) return
  await projects.setActive(id)
  if (projects.active?.id) {
    await pipeline.loadFromProject(projects.active.id)
  }
}

async function onCreate() {
  const name = window.prompt('项目名称：', `新项目 ${new Date().toLocaleDateString('zh-CN')}`)
  if (name == null) return
  await projects.create(name)
  if (projects.active?.id) {
    await pipeline.loadFromProject(projects.active.id)
  }
}

async function onDelete() {
  const id = projects.active?.id
  if (!id) return
  const ok = window.confirm('确定删除当前项目？该操作不可恢复。')
  if (!ok) return
  await projects.remove(id)
  await projects.ensureActive()
  if (projects.active?.id) {
    await pipeline.loadFromProject(projects.active.id)
  }
}
</script>

<style scoped>
.wrap {
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
}

.row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.select {
  width: 100%;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #e6edf3;
}

.btn {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #e6edf3;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.danger {
  border-color: rgba(239, 68, 68, 0.4);
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(230, 237, 243, 0.7);
}
</style>
