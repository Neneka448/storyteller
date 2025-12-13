import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { register } from 'vue-advanced-chat'

import App from './App.vue'

register()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
