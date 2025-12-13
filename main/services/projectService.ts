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

function defaultNodes(): Array<{ title: string; type: string; capabilities: CapabilityId[] }> {
    return [
        { title: '世界观草案', type: 'memo.world', capabilities: ['memo', 'kv'] },
        { title: '角色草案', type: 'kv.character', capabilities: ['kv', 'memo'] },
        { title: '大纲', type: 'memo.outline', capabilities: ['memo'] },
        { title: '剧本', type: 'memo.script', capabilities: ['memo'] },
        { title: '分镜（镜头列表）', type: 'storyboard.main', capabilities: ['storyboard', 'sandbox'] },
        { title: '角色设定图', type: 'image.character', capabilities: ['image'] },
        { title: '关键帧', type: 'image.keyframes', capabilities: ['image'] }
    ]
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

            defaultNodes().forEach((n, idx) => {
                db.prepare(
                    'INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n           VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                ).run(
                    randomUUID(),
                    id,
                    rootId,
                    idx + 1,
                    n.title,
                    n.type,
                    JSON.stringify(n.capabilities),
                    'idle',
                    ts,
                    ts
                )
            })

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

            defaultNodes().forEach((n, idx) => {
                db.prepare(
                    'INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                ).run(
                    randomUUID(),
                    projectId,
                    rootId,
                    idx + 1,
                    n.title,
                    n.type,
                    JSON.stringify(n.capabilities),
                    'idle',
                    ts,
                    ts
                )
            })
        })

        tx()
    }

    listNodes(projectId: string) {
        this.ensureDefaultNodeTree(projectId)

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
