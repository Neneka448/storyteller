import { randomUUID } from 'node:crypto'

import { getDb } from '../db/sqlite'

import type { CapabilityId } from '../core'

export type ProjectRow = {
    id: string
    name: string
    created_at: number
    updated_at: number
}

export type NodeRow = {
    project_id: string
    id: string
    parent_id: string | null
    order_index: number
    title: string
    type: string
    capabilities_json: string
    status: string
    created_at: number
    updated_at: number
}

function now() {
    return Date.now()
}

type SeedNode = {
    title: string
    type: string
    capabilities: CapabilityId[]
    children?: SeedNode[]
}

function defaultSeedTree(): SeedNode[] {
    // Align with docs/business/01-world-structure.md + 02-capabilities-interaction.md
    // - Composite nodes are just structural containers (capabilities: [])
    // - Leaf nodes carry content via capabilities (kv/memo/image/sandbox/storyboard)
    return [
        {
            title: '世界观设定',
            type: 'world.root',
            capabilities: ['kv', 'memo'],
            children: [
                {
                    title: '地理与环境',
                    type: 'world.category.geo',
                    capabilities: ['kv', 'memo'],
                    children: [
                        { title: '地形设定', type: 'world.geo.terrain', capabilities: ['kv'] },
                        { title: '世界地图', type: 'world.geo.map', capabilities: ['image'] },
                        { title: '气候与灾害', type: 'world.geo.climate', capabilities: ['kv'] }
                    ]
                },
                {
                    title: '社会与文明',
                    type: 'world.category.society',
                    capabilities: ['kv', 'memo'],
                    children: [
                        { title: '政治制度', type: 'world.society.politics', capabilities: ['kv'] },
                        { title: '经济贸易', type: 'world.society.economy', capabilities: ['kv'] },
                        { title: '势力关系图（可视化）', type: 'world.society.factions', capabilities: ['sandbox'] }
                    ]
                },
                {
                    title: '生物与生态',
                    type: 'world.category.ecology',
                    capabilities: ['kv', 'memo'],
                    children: [
                        { title: '植被大全', type: 'world.ecology.plants', capabilities: ['kv'] },
                        {
                            title: '怪物图鉴',
                            type: 'world.ecology.monsters',
                            capabilities: ['kv', 'memo'],
                            children: [
                                { title: '恐狼', type: 'char.card.wolf', capabilities: ['kv', 'memo', 'image'] },
                                { title: '巨龙', type: 'char.card.dragon', capabilities: ['kv', 'memo', 'image'] }
                            ]
                        }
                    ]
                },
                {
                    title: '历史与传承',
                    type: 'world.category.history',
                    capabilities: ['kv', 'memo'],
                    children: [
                        // Timeline capability is not implemented yet; use memo as MVP.
                        { title: '编年史', type: 'world.history.timeline', capabilities: ['memo'] },
                        { title: '英雄传说', type: 'world.history.legends', capabilities: ['memo'] }
                    ]
                }
            ]
        },
        // Creative workflow outputs (still top-level for MVP)
        { title: '角色草案', type: 'char.draft', capabilities: ['kv', 'memo', 'image'] },
        { title: '大纲', type: 'writing.outline', capabilities: ['memo'] },
        { title: '剧本', type: 'writing.script', capabilities: ['memo'] },
        { title: '分镜（镜头列表）', type: 'storyboard.main', capabilities: ['storyboard', 'sandbox'] }
    ]
}

function insertSeedNodes(args: {
    db: any
    projectId: string
    parentId: string
    nodes: SeedNode[]
    createdAt: number
}) {
    const { db, projectId, parentId, nodes, createdAt } = args

    nodes.forEach((n, idx) => {
        const id = randomUUID()
        db.prepare(
            'INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n' +
            'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
            id,
            projectId,
            parentId,
            idx + 1,
            n.title,
            n.type,
            JSON.stringify(n.capabilities ?? []),
            'idle',
            createdAt,
            createdAt
        )

        if (Array.isArray(n.children) && n.children.length > 0) {
            insertSeedNodes({ db, projectId, parentId: id, nodes: n.children, createdAt })
        }
    })
}

function ensureWorldCompositeCapabilities(db: any, projectId: string) {
    // For already-created projects (seeded before composites had any capability),
    // make composite nodes editable by attaching a default KV panel.
    const ts = now()
    const kvMemoJson = JSON.stringify(['kv', 'memo'])

    db.prepare(
        "UPDATE nodes SET capabilities_json = ?, updated_at = ? WHERE project_id = ? AND type = 'world.root' AND (capabilities_json = '[]' OR capabilities_json = '[\"kv\"]')"
    ).run(kvMemoJson, ts, projectId)

    db.prepare(
        "UPDATE nodes SET capabilities_json = ?, updated_at = ? WHERE project_id = ? AND type LIKE 'world.category.%' AND (capabilities_json = '[]' OR capabilities_json = '[\"kv\"]')"
    ).run(kvMemoJson, ts, projectId)

    db.prepare(
        "UPDATE nodes SET capabilities_json = ?, updated_at = ? WHERE project_id = ? AND type = 'world.ecology.monsters' AND (capabilities_json = '[]' OR capabilities_json = '[\"kv\"]')"
    ).run(kvMemoJson, ts, projectId)
}

export class ProjectService {
    constructor(private readonly userDataPath: string) { }

    private db() {
        return getDb({ userDataPath: this.userDataPath })
    }

    listProjects(): Array<{ id: string; name: string; createdAt: number; updatedAt: number }> {
        const rows: ProjectRow[] = this.db()
            .prepare('SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC')
            .all()

        return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at }))
    }

    getActiveProjectId(): string | null {
        const row = this.db().prepare('SELECT value FROM kv WHERE key = ?').get('projects.activeId') as any
        if (!row?.value) return null
        const v = String(row.value)
        return v ? v : null
    }

    setActiveProjectId(projectId: string) {
        this.db()
            .prepare(
                'INSERT INTO kv(key, value, updated_at) VALUES(?, ?, ?)\n         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'
            )
            .run('projects.activeId', String(projectId ?? ''), now())
    }

    getProject(projectId: string) {
        const r: ProjectRow | undefined = this.db()
            .prepare('SELECT id, name, created_at, updated_at FROM projects WHERE id = ?')
            .get(projectId)
        if (!r) return null
        return { id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at }
    }

    createProject(name?: string) {
        const id = randomUUID()
        const ts = now()
        const projectName = String(name || '').trim() || `新项目 ${new Date().toLocaleDateString('zh-CN')}`

        const db = this.db()
        const tx = db.transaction(() => {
            db.prepare('INSERT INTO projects(id, name, created_at, updated_at) VALUES(?, ?, ?, ?)').run(
                id,
                projectName,
                ts,
                ts
            )

            const rootId = randomUUID()
            db.prepare(
                'INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(rootId, id, null, 0, 'Root', 'root', JSON.stringify(['folder']), 'idle', ts, ts)

            insertSeedNodes({ db, projectId: id, parentId: rootId, nodes: defaultSeedTree(), createdAt: ts })

            this.setActiveProjectId(id)
        })

        tx()

        return { id, name: projectName, createdAt: ts, updatedAt: ts }
    }

    deleteProject(projectId: string) {
        const db = this.db()
        const tx = db.transaction(() => {
            db.prepare(
                'DELETE FROM artifact_versions WHERE artifact_id IN (SELECT id FROM artifacts WHERE project_id = ?)'
            ).run(projectId)
            db.prepare('DELETE FROM artifacts WHERE project_id = ?').run(projectId)
            db.prepare('DELETE FROM events WHERE run_id IN (SELECT id FROM runs WHERE project_id = ?)').run(projectId)
            db.prepare('DELETE FROM runs WHERE project_id = ?').run(projectId)
            db.prepare('DELETE FROM nodes WHERE project_id = ?').run(projectId)
            db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)

            const active = this.getActiveProjectId()
            if (active === projectId) {
                this.setActiveProjectId('')
            }
        })

        tx()
    }

    /**
     * Legacy upgrade helper: older projects may exist without nodes (created before node-tree refactor).
     * Seed a minimal default node tree so the renderer can show DAG + panels.
     */
    private ensureDefaultNodeTree(projectId: string) {
        const db = this.db()
        const existing = db.prepare('SELECT COUNT(1) AS c FROM nodes WHERE project_id = ?').get(projectId) as any
        const count = Number(existing?.c ?? 0)
        if (count > 0) return

        const ts = now()
        const rootId = randomUUID()

        const tx = db.transaction(() => {
            db.prepare(
                'INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(rootId, projectId, null, 0, 'Root', 'root', JSON.stringify(['folder']), 'idle', ts, ts)

            insertSeedNodes({ db, projectId, parentId: rootId, nodes: defaultSeedTree(), createdAt: ts })
        })

        tx()
    }

    listNodes(projectId: string) {
        this.ensureDefaultNodeTree(projectId)

        // Keep seeded projects usable: composites should not be empty.
        try {
            ensureWorldCompositeCapabilities(this.db(), projectId)
        } catch {
            // best-effort
        }

        const rows: NodeRow[] = this.db()
            .prepare(
                'SELECT project_id, id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at\n' +
                'FROM nodes WHERE project_id = ? ORDER BY order_index ASC'
            )
            .all(projectId)

        return rows.map((r) => ({
            projectId: String(r.project_id),
            nodeId: String(r.id),
            parentId: r.parent_id != null ? String(r.parent_id) : null,
            orderIndex: Number(r.order_index),
            title: String(r.title),
            type: String(r.type),
            capabilities: (() => {
                try {
                    const arr = JSON.parse(String(r.capabilities_json ?? '[]'))
                    return Array.isArray(arr) ? arr.map(String) : []
                } catch {
                    return []
                }
            })(),
            status: String(r.status),
            createdAt: Number(r.created_at),
            updatedAt: Number(r.updated_at)
        }))
    }
}
