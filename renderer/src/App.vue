<template>
  <div class="appRoot">
    <div class="topbar">
      <div class="brand">Storyteller</div>
      <div class="tabs">
        <button class="tab" :class="{ active: view === 'studio' }" @click="view = 'studio'">工作台</button>
        <button class="tab" :class="{ active: view === 'settings' }" @click="view = 'settings'">
          设置
        </button>
      </div>
    </div>

    <div class="body" :class="{ settings: view === 'settings' }">
      <template v-if="view === 'settings'">
        <SettingsPane />
      </template>

      <template v-else>
        <div class="leftPane">
          <ProjectsPane />
          <ChatPane />
        </div>

        <div class="rightPane">
          <div class="rightTop">
            <DagPane />
          </div>
          <div class="rightBottom">
            <NodeInspector />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import ChatPane from './components/ChatPane.vue'
import DagPane from './components/DagPane.vue'
import NodeInspector from './components/NodeInspector.vue'
import ProjectsPane from './components/ProjectsPane.vue'
import SettingsPane from './components/SettingsPane.vue'

const view = ref<'studio' | 'settings'>('studio')
</script>

<style scoped>
.appRoot {
  height: 100vh;
  width: 100vw;
  background: #0b0f14;
  color: #e6edf3;
  display: grid;
  grid-template-rows: 46px 1fr;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand {
  font-weight: 800;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #e6edf3;
  cursor: pointer;
}

.tab.active {
  background: rgba(59, 130, 246, 0.2);
}

.body {
  min-height: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: 380px 1fr;
}

.body.settings {
  grid-template-columns: 1fr;
}

.leftPane {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  min-width: 340px;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
}

.rightPane {
  display: grid;
  grid-template-rows: 1fr 340px;
  min-width: 0;
}

.rightTop {
  min-height: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.rightBottom {
  min-height: 0;
}
</style>
