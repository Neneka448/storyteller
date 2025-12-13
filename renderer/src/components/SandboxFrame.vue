<template>
  <div class="wrap">
    <iframe
      ref="frame"
      class="frame"
      sandbox="allow-scripts"
      :srcdoc="srcdoc"
      title="node-sandbox"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Props = {
  html: string
  css: string
  js: string
}

const props = defineProps<Props>()

const frame = ref<HTMLIFrameElement | null>(null)

const srcdoc = computed(() => {
  // 默认严格 CSP：
  // - 禁止网络请求（connect-src 'none'）
  // - 允许内联 style/script（用于注入渲染）
  // - 允许 data/blob 图片（用于后续展示生成结果）
  const csp = [
    "default-src 'none'",
    "img-src data: blob:",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "connect-src 'none'",
    "font-src data:",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ')

  const bridge = `
    <script>
      (function(){
        const send = (type, payload) => {
          try {
            parent.postMessage({ __storyteller: true, type, payload }, '*');
          } catch (e) {}
        };

        window.storyteller = {
          log: (msg) => send('log', { msg: String(msg) }),
          request: (name, payload) => send('request', { name, payload })
        };

        send('ready', {});
      })();
    <\/script>
  `

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${props.css ?? ''}</style>
  </head>
  <body>
    ${props.html ?? ''}
    ${bridge}
    <script>
      try {
        ${props.js ?? ''}
      } catch (e) {
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.padding = '12px';
        pre.textContent = 'Sandbox script error: ' + (e && e.stack ? e.stack : String(e));
        document.body.appendChild(pre);
      }
    <\/script>
  </body>
</html>`
})

function onMessage(event: MessageEvent) {
  if (!frame.value?.contentWindow) return
  if (event.source !== frame.value.contentWindow) return

  const data: any = event.data
  if (!data || data.__storyteller !== true) return

  if (data.type === 'log') {
    // eslint-disable-next-line no-console
    console.log('[sandbox]', data.payload?.msg)
  }

  // 预留：后续可做 request/response 白名单桥接（Artifact 查询等）
}

onMounted(() => {
  window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})
</script>

<style scoped>
.wrap {
  height: 100%;
  width: 100%;
  background: #fff;
}

.frame {
  height: 100%;
  width: 100%;
  border: 0;
  display: block;
}
</style>
