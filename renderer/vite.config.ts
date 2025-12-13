import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    root: __dirname,
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    isCustomElement: (tag) => tag === 'vue-advanced-chat' || tag === 'emoji-picker'
                }
            }
        })
    ],
    server: {
        strictPort: true,
        port: 5173,
        host: '127.0.0.1'
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
})
