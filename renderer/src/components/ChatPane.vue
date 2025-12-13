<template>
  <div class="chatWrap">
    <div class="chatBody">
      <vue-advanced-chat ref="chatEl" theme="dark" height="100%" />
    </div>

    <div class="composer">
      <div class="toolbar">
        <button class="tbtn" type="button" @click="send('继续')">继续</button>
        <button class="tbtn" type="button" @click="send('重做当前步')">重做</button>
        <button class="tbtn" type="button" @click="send('回退到上一步')">回退</button>
        <div class="spacer" />
        <button class="tbtn" type="button" @click="send('注入')">注入示例</button>
      </div>

      <textarea
        v-model="draft"
        class="input"
        rows="3"
        placeholder="输入消息…（Enter 换行，Cmd+Enter 发送）"
        @keydown="onKeydown"
      />

      <div class="composerBottom">
        <div class="hint">Enter 换行，Cmd+Enter 发送</div>
        <button class="sendBtn" type="button" :disabled="!draft.trim()" @click="send(draft)">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watchEffect } from 'vue'

import { useChatStore } from '../stores/chat'
import { usePipelineStore } from '../stores/pipeline'

import { getMainAgentClient } from '../agent/mainAgentClient'

const chat = useChatStore()
const pipeline = usePipelineStore()

const chatEl = ref<any | null>(null)
const draft = ref('')

const mainAgent = getMainAgentClient()
let offDelta: null | (() => void) = null
let offDone: null | (() => void) = null
let offError: null | (() => void) = null
let offToolCall: null | (() => void) = null

// streamId -> messageId
const streamToMessage = new Map<string, string>()

onMounted(() => {
  // 初始化时标记已加载，避免组件一直转圈
  chat.messagesLoaded = true

  if (!mainAgent) return

  offDelta = mainAgent.onDelta((e) => {
    const mid = streamToMessage.get(e.streamId)
    if (!mid) return
    chat.appendMessageDelta(mid, e.delta)
  })

  offDone = mainAgent.onDone((e) => {
    streamToMessage.delete(e.streamId)
  })

  offError = mainAgent.onError((e) => {
    const mid = streamToMessage.get(e.streamId)
    if (mid) chat.appendMessageDelta(mid, `\n\n[agent error] ${e.error}`)
    streamToMessage.delete(e.streamId)
  })

  offToolCall = mainAgent.onToolCall((e) => {
    // 在当前 assistant 回复中插入一行工具调用提示（可一眼确认“真的调用了工具”）
    const mid = streamToMessage.get(e.streamId)
    const argsPreview = (() => {
      try {
        const s = JSON.stringify(e.args ?? {})
        return s.length > 180 ? s.slice(0, 180) + '…' : s
      } catch {
        return String(e.args ?? '')
      }
    })()
    const tip = `\n\n[tool] 已调用 ${e.name} args=${argsPreview}\n`
    if (mid) chat.appendMessageDelta(mid, tip)
    else chat.addAssistantMessage(tip)

    // 最小闭环：收到工具调用事件 -> 执行本地 UI 动作
    if (e.name === 'injectStoryboardSandbox') {
      const targetId = pipeline.selectedNodeId || 'step_storyboard'
      pipeline.updateNodeSandbox(targetId, {
        html: '<div id="root"></div>',
        css: 'body{margin:0;font-family:system-ui;} .wrap{padding:12px} .pill{display:inline-block;padding:4px 8px;border-radius:999px;background:#111827;color:#e5e7eb;font-size:12px;margin-right:8px} .hint{color:#6b7280;font-size:12px;margin:8px 0} button{padding:6px 10px;font-size:12px}',
        js: "const root=document.getElementById('root');\nroot.innerHTML = `\n  <div class='wrap'>\n    <div>\n      <span class='pill'>AI 注入渲染</span>\n      <span class='pill'>sandbox iframe</span>\n    </div>\n    <div class='hint'>这段 JS 在节点沙箱里执行。默认禁止网络请求（CSP）。</div>\n    <button id='btn'>点我</button>\n    <div id='out' class='hint'></div>\n  </div>\n`;\ndocument.getElementById('btn').addEventListener('click', () => {\n  document.getElementById('out').textContent = '点击已捕获：' + new Date().toLocaleString();\n});"
      })
    }
  })
})

onBeforeUnmount(() => {
  offDelta?.()
  offDone?.()
  offError?.()
  offToolCall?.()
})

watchEffect(() => {
  const el = chatEl.value
  if (!el) return

  // 通过 DOM property 直接赋值，绕开 custom element props 传递差异
  el.currentUserId = chat.currentUserId
  el.roomId = chat.roomId
  el.rooms = chat.rooms
  el.messages = chat.messages
  el.messagesLoaded = chat.messagesLoaded
  el.roomsLoaded = true

  // 禁用不需要的 UI（表情/语音/附件/搜索/加房间等）
  el.singleRoom = true
  el.showSearch = false
  el.showAddRoom = false
  el.showFiles = false
  el.showAudio = false
  el.showEmojis = false
  el.showFooter = false
})

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return

  // Cmd+Enter 发送；Enter 换行
  if (e.metaKey) {
    e.preventDefault()
    send(draft.value)
  }
}

async function send(text: string) {
  const msg = String(text ?? '').trim()
  if (!msg) return

  draft.value = ''
  chat.addUserMessage(msg)

  // 通过主进程 Agent 进行流式回复（LangChain）
  if (!mainAgent) {
    await chat.streamAssistant('（Agent 未就绪：preload 未暴露 window.storyteller.agent）')
    return
  }

  const history = chat.messages
    .filter((m) => String(m.content ?? '').trim())
    .slice(-20)
    .map((m) => ({
      role: m.senderId === 'ai' ? ('assistant' as const) : ('user' as const),
      content: String(m.content)
    }))

  const assistantId = chat.startAssistantMessage()

  const streamId = await mainAgent.start({ messages: history })
  streamToMessage.set(streamId, assistantId)
}
</script>

<style scoped>
.chatWrap {
  height: 100%;
  width: 100%;
  background: #0b0f14;
  display: grid;
  grid-template-rows: 1fr auto;
  overflow: hidden;
}

.chatBody {
  min-height: 0;
}

.composer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 8px;
}

.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.spacer {
  flex: 1;
}

.tbtn {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #e6edf3;
  cursor: pointer;
}

.tbtn:hover {
  background: rgba(255, 255, 255, 0.09);
}

.input {
  width: 100%;
  resize: none;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: #e6edf3;
  padding: 10px;
  box-sizing: border-box;
  font-size: 13px;
  line-height: 1.4;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
    "Apple Color Emoji", "Segoe UI Emoji";
}

.composerBottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.hint {
  font-size: 12px;
  color: rgba(230, 237, 243, 0.7);
}

.sendBtn {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(59, 130, 246, 0.2);
  color: #e6edf3;
  cursor: pointer;
}

.sendBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* vue-advanced-chat 是 web component，外层尽量只负责尺寸 */
</style>
