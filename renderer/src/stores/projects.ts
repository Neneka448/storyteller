import { defineStore } from 'pinia'

export type Project = { id: string; name: string; createdAt: number; updatedAt: number }

export const useProjectsStore = defineStore('projects', {
    state: () => ({
        projects: [] as Project[],
        active: null as Project | null,
        loaded: false
    }),
    actions: {
        async refresh() {
            const api = window.storyteller?.projects
            if (!api?.list) return

            const list = await api.list()
            this.projects = Array.isArray(list) ? list : []

            if (api.getActive) {
                this.active = await api.getActive()
            }

            this.loaded = true
        },
        async ensureActive() {
            await this.refresh()
            if (this.active) return

            const api = window.storyteller?.projects
            if (!api?.create) return

            const p = await api.create('默认项目')
            this.active = p
            await this.refresh()
        },
        async setActive(id: string) {
            const api = window.storyteller?.projects
            if (!api?.setActive) return
            await api.setActive(id)
            await this.refresh()
        },
        async create(name?: string) {
            const api = window.storyteller?.projects
            if (!api?.create) return null
            const p = await api.create(name)
            await this.refresh()
            return p
        },
        async remove(id: string) {
            const api = window.storyteller?.projects
            if (!api?.delete) return
            await api.delete(id)
            await this.refresh()
        }
    }
})
