import { defineStore } from 'pinia'

export type NodeSandbox = {
    html: string
    css: string
    js: string
}

export type StepNode = {
    id: string
    title: string
    parentId?: string | null
    orderIndex?: number
    type?: string
    capabilities?: string[]
    status: 'idle' | 'running' | 'succeeded' | 'failed'
    artifactSummary?: string
    sandbox?: NodeSandbox
}

function summarizeCapabilities(capabilities: string[] | undefined): string {
    const caps = Array.isArray(capabilities) ? capabilities : []
    if (caps.length === 0) return '分类'

    const tags: string[] = []
    if (caps.includes('kv')) tags.push('KV')
    if (caps.includes('memo')) tags.push('文本')
    if (caps.includes('storyboard')) tags.push('分镜')
    if (caps.includes('sandbox')) tags.push('渲染')
    if (caps.includes('image')) tags.push('图片')
    return tags.length ? `${tags.join('+')}（待生成）` : '内容（待生成）'
}

export const usePipelineStore = defineStore('pipeline', {
    state: () => ({
        selectedNodeId: 'step_storyboard',
        collapsedById: {} as Record<string, boolean>,
        nodes: [
            {
                id: 'step_world',
                title: '世界观草案',
                status: 'idle',
                artifactSummary: '文本（待生成）'
            },
            {
                id: 'step_character',
                title: '角色草案',
                status: 'idle',
                artifactSummary: '文本（待生成）'
            },
            {
                id: 'step_outline',
                title: '大纲',
                status: 'idle',
                artifactSummary: '文本（待生成）'
            },
            {
                id: 'step_script',
                title: '剧本',
                status: 'idle',
                artifactSummary: '文本（待生成）'
            },
            {
                id: 'step_storyboard',
                title: '分镜（镜头列表）',
                status: 'succeeded',
                artifactSummary: '表格（示例数据）',
                sandbox: {
                    html: '<div id="root"></div>',
                    css: 'body{margin:0;font-family:system-ui;} .card{padding:12px} .title{font-weight:700;margin-bottom:8px} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:6px;font-size:12px} th{background:#f6f6f6}',
                    js: "const root=document.getElementById('root'); root.innerHTML=`<div class='card'><div class='title'>分镜预览（节点脚本渲染）</div><table><thead><tr><th>Shot</th><th>景别</th><th>画面</th></tr></thead><tbody><tr><td>#01</td><td>远景</td><td>城市雨夜，霓虹反射</td></tr><tr><td>#02</td><td>近景</td><td>主角抬头，眼神坚定</td></tr></tbody></table></div>`;"
                }
            },
            {
                id: 'step_char_image',
                title: '角色设定图',
                status: 'idle',
                artifactSummary: '图片（待生成）'
            },
            {
                id: 'step_keyframes',
                title: '关键帧',
                status: 'idle',
                artifactSummary: '图片（待生成）'
            }
        ] as StepNode[],
        edges: [
            ['step_world', 'step_character'],
            ['step_character', 'step_outline'],
            ['step_outline', 'step_script'],
            ['step_script', 'step_storyboard'],
            ['step_storyboard', 'step_char_image'],
            ['step_char_image', 'step_keyframes']
        ] as Array<[string, string]>
    }),
    getters: {
        selectedNode(state): StepNode | undefined {
            return state.nodes.find((n) => n.id === state.selectedNodeId)
        }
    },
    actions: {
        toggleCollapsed(id: string) {
            const key = String(id)
            const next = !(this.collapsedById[key] === true)
            this.collapsedById = { ...this.collapsedById, [key]: next }

            // If collapsing hides the currently selected node, fall back to the collapsed node.
            if (next === true && this.selectedNodeId && this.selectedNodeId !== key) {
                const byId = new Map(this.nodes.map((n) => [String(n.id), n]))
                let cur: any = byId.get(String(this.selectedNodeId))
                while (cur && cur.parentId) {
                    const pid = String(cur.parentId)
                    if (pid === key) {
                        this.selectedNodeId = key
                        break
                    }
                    cur = byId.get(pid)
                }
            }
        },
        setCollapsed(id: string, collapsed: boolean) {
            const key = String(id)
            this.collapsedById = { ...this.collapsedById, [key]: Boolean(collapsed) }
        },
        async loadFromProject(projectId: string) {
            const api = window.storyteller?.nodes
            if (!api?.list) return

            const rows = await api.list(projectId)
            if (!Array.isArray(rows) || rows.length === 0) return

            const rootIds = new Set(
                rows
                    .filter((r: any) => r && (r.parentId == null || String(r.type) === 'root'))
                    .map((r: any) => String(r.nodeId))
            )

            // Keep all non-root nodes for display.
            const items = rows.filter((r: any) => r && String(r.type) !== 'root')
            items.sort((a: any, b: any) => Number(a.orderIndex) - Number(b.orderIndex))

            const byId = new Map(this.nodes.map((n) => [n.id, n]))
            this.nodes = items.map((r: any) => {
                const id = String(r.nodeId)
                const prev = byId.get(id)

                const capabilities = Array.isArray(r.capabilities) ? r.capabilities.map(String) : []
                return {
                    id,
                    title: String(r.title),
                    parentId: r.parentId != null ? String(r.parentId) : null,
                    orderIndex: Number(r.orderIndex),
                    type: String(r.type),
                    capabilities,
                    status: (String(r.status) as any) || 'idle',
                    artifactSummary: prev?.artifactSummary ?? summarizeCapabilities(capabilities),
                    sandbox: prev?.sandbox
                }
            })

            const ids = new Set(this.nodes.map((n) => n.id))
            // Tree edges: parentId -> childId (skip root edges)
            this.edges = this.nodes
                .filter((n) => n.parentId && !rootIds.has(String(n.parentId)) && ids.has(String(n.parentId)))
                .sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0))
                .map((n) => [String(n.parentId), String(n.id)] as [string, string])

            // 选中节点尽量保持；如果不存在则退回第一个
            if (!this.nodes.find((n) => n.id === this.selectedNodeId)) {
                this.selectedNodeId = this.nodes[0]?.id || this.selectedNodeId
            }

            // Cleanup collapsed state for removed nodes
            const nodeIdSet = new Set(this.nodes.map((n) => String(n.id)))
            const nextCollapsed: Record<string, boolean> = {}
            for (const [k, v] of Object.entries(this.collapsedById)) {
                if (nodeIdSet.has(String(k)) && v === true) nextCollapsed[k] = true
            }
            this.collapsedById = nextCollapsed
        },
        selectNode(id: string) {
            this.selectedNodeId = id
        },
        updateNodeSandbox(id: string, sandbox: NodeSandbox) {
            this.nodes = this.nodes.map((n) => (n.id === id ? { ...n, sandbox } : n))
        },
        setNodeStatus(id: string, status: StepNode['status']) {
            this.nodes = this.nodes.map((n) => (n.id === id ? { ...n, status } : n))
        },
        setNodeArtifactSummary(id: string, artifactSummary: string) {
            this.nodes = this.nodes.map((n) => (n.id === id ? { ...n, artifactSummary } : n))
        }
    }
})
