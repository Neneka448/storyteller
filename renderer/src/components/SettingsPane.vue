<template>
  <div class="wrap">
    <div class="header">
      <div class="title">设置</div>
      <div class="sub">大模型（OpenAI-compatible）连接信息</div>
    </div>

    <div class="body">
      <label class="field">
        <div class="label">Base URL</div>
        <input v-model="baseUrl" class="input" placeholder="https://openrouter.ai/api" />
      </label>

      <label class="field">
        <div class="label">Path</div>
        <input v-model="pathPrefix" class="input" placeholder="(可选) 例如 /v1（不留空就完全按你填写）" />
        <div class="hint">留空时默认补 /v1；不留空时不会自动修正或追加。</div>
      </label>

      <div class="preview">
        <div class="previewLabel">最终请求</div>
        <div class="previewValue">{{ chatCompletionsUrl }}</div>
      </div>

      <label class="field">
        <div class="label">Model</div>
        <input v-model="model" class="input" placeholder="gpt-4.1-mini" />
      </label>

      <label class="field">
        <div class="label">API Key</div>
        <input v-model="apiKey" class="input" placeholder="sk-..." type="password" />
        <div class="hint">保存在本机 SQLite（userData/storyteller.db），不会上传。</div>
      </label>

      <div class="actions">
        <button class="btn" :disabled="saving" @click="save">保存</button>
        <button class="btn" :disabled="testing" @click="test">测试连接</button>
        <div class="status">{{ status }}</div>
      </div>

      <div v-if="testResult" class="testBox">
        <div class="testLine">URL: {{ testResult.url }}</div>
        <div class="testLine">HTTP: {{ testResult.status }}（ok={{ testResult.ok }}）</div>
        <pre class="testPre">{{ testResult.bodyPreview }}</pre>
      </div>

      <div class="divider" />

      <div class="help">
        <div class="helpTitle">连接测试</div>
        <div class="helpText">保存后回到工作台，发送任意消息将触发主进程 Agent 调用模型并流式返回。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const baseUrl = ref('')
const pathPrefix = ref('')
const model = ref('')
const apiKey = ref('')

const saving = ref(false)
const testing = ref(false)
const status = ref('')
const testResult = ref<null | { ok: boolean; status: number; url: string; bodyPreview: string }>(null)

onMounted(async () => {
  const s = await window.storyteller?.settings?.get?.()
  baseUrl.value = s?.baseUrl ?? 'https://api.openai.com'
  pathPrefix.value = s?.pathPrefix ?? ''
  model.value = s?.model ?? 'gpt-4.1-mini'
  apiKey.value = s?.apiKey ?? ''
})

function normalizeBaseUrlForPreview(raw: string) {
  const input = String(raw || '').trim()
  if (!input) return ''
  try {
    const u = new URL(input)
    const pathname = (u.pathname || '').replace(/\/$/, '')
    return `${u.protocol}//${u.host}${pathname}`
  } catch {
    return input
  }
}

function normalizePathPrefixForPreview(raw: string) {
  // 不留空时：完全按用户输入，仅 trim
  return String(raw || '').trim()
}

function joinPath(base: string, prefix: string, suffix: string) {
  const b = String(base || '').replace(/\/$/, '')
  const p = String(prefix || '').replace(/\/$/, '')
  const s = String(suffix || '')
  const mid = p ? p : ''
  return `${b}${mid}${s.startsWith('/') ? s : `/${s}`}`
}

const chatCompletionsUrl = computed(() => {
  const base = normalizeBaseUrlForPreview(baseUrl.value)
  const p = normalizePathPrefixForPreview(pathPrefix.value)
  // Path 不留空：完全照抄
  if (p) return joinPath(base, p, '/chat/completions')

  // Path 留空：默认补 /v1（若 baseUrl 已包含 /v1，则不再重复追加）
  const alreadyHasV1 = (() => {
    try {
      const u = new URL(base)
      return /(^|\/)v1(\/|$)/.test(u.pathname || '')
    } catch {
      return false
    }
  })()

  return alreadyHasV1 ? joinPath(base, '', '/chat/completions') : joinPath(base, '/v1', '/chat/completions')
})

async function save() {
  saving.value = true
  status.value = ''
  try {
    await window.storyteller?.settings?.set?.({
      baseUrl: baseUrl.value,
      pathPrefix: pathPrefix.value,
      model: model.value,
      apiKey: apiKey.value
    })
    status.value = '已保存'
  } catch (e) {
    status.value = `保存失败：${e instanceof Error ? e.message : String(e)}`
  } finally {
    saving.value = false
  }
}

async function test() {
  testing.value = true
  status.value = ''
  testResult.value = null
  try {
    const r = await window.storyteller?.settings?.testConnection?.()
    if (!r) throw new Error('testConnection not available')
    testResult.value = r
    status.value = r.ok ? '连接正常' : '连接失败'
  } catch (e) {
    status.value = `测试失败：${e instanceof Error ? e.message : String(e)}`
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.wrap {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  background: #0b0f14;
  color: #e6edf3;
}

.header {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.title {
  font-weight: 800;
  font-size: 16px;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(230, 237, 243, 0.7);
}

.body {
  padding: 16px;
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 12px;
  color: rgba(230, 237, 243, 0.75);
}

.input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: #e6edf3;
}

.hint {
  font-size: 12px;
  color: rgba(230, 237, 243, 0.6);
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(59, 130, 246, 0.2);
  color: #e6edf3;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  font-size: 12px;
  color: rgba(230, 237, 243, 0.7);
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 8px 0;
}

.preview {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.18);
}

.previewLabel {
  font-size: 12px;
  color: rgba(230, 237, 243, 0.6);
}

.previewValue {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(230, 237, 243, 0.85);
  word-break: break-word;
}

.testBox {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
}

.testLine {
  font-size: 12px;
  color: rgba(230, 237, 243, 0.75);
  margin-bottom: 6px;
}

.testPre {
  margin: 0;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(230, 237, 243, 0.85);
}

.helpTitle {
  font-weight: 700;
}

.helpText {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(230, 237, 243, 0.7);
}
</style>
