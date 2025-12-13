import { randomUUID } from 'node:crypto'

import { getDb } from '../../db/sqlite'
import type { NodeEntity, NodeStatus, NodeTreeRepository } from '../contracts'

function now() {
    return Date.now()
}

function parseCapabilitiesJson(value: any): string[] {
    try {
        const arr = JSON.parse(String(value ?? '[]'))
        return Array.isArray(arr) ? arr.map(String) : []
    } catch {
        return []
    }
}

function toRow(n: NodeEntity) {
    return {
        id: n.id,
        project_id: n.projectId,
        parent_id: n.parentId,
        order_index: n.orderIndex,
        title: n.title,
        type: n.type,
        capabilities_json: JSON.stringify(n.capabilities ?? []),
        status: n.status ?? 'idle',
        created_at: n.createdAt,
        updated_at: n.updatedAt
    }
}

function parseStatus(value: any): NodeStatus {
    const s = String(value ?? 'idle')
    if (s === 'running' || s === 'succeeded' || s === 'failed') return s
    return 'idle'
}

export class SqliteNodeTreeRepository implements NodeTreeRepository {
    constructor(private readonly userDataPath: string) { }

    private db() {
        return getDb({ userDataPath: this.userDataPath })
    }

    async listChildren(args: { projectId: string; parentId: string | null }): Promise<NodeEntity[]> {
        const rows = this.db()
            .prepare(
                'SELECT id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at\n' +
                'FROM nodes WHERE project_id = ? AND parent_id IS ? ORDER BY order_index ASC'
            )
            .all(args.projectId, args.parentId)

        return rows.map((r: any) => ({
            id: String(r.id),
            projectId: String(r.project_id),
            parentId: r.parent_id != null ? String(r.parent_id) : null,
            orderIndex: Number(r.order_index),
            title: String(r.title),
            type: String(r.type),
            capabilities: parseCapabilitiesJson(r.capabilities_json),
            status: parseStatus(r.status),
            createdAt: Number(r.created_at),
            updatedAt: Number(r.updated_at)
        }))
    }

    async getById(args: { projectId: string; nodeId: string }): Promise<NodeEntity | null> {
        const r = this.db()
            .prepare(
                'SELECT id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at\n' +
                'FROM nodes WHERE project_id = ? AND id = ?'
            )
            .get(args.projectId, args.nodeId)

        if (!r) return null

        return {
            id: String(r.id),
            projectId: String(r.project_id),
            parentId: r.parent_id != null ? String(r.parent_id) : null,
            orderIndex: Number(r.order_index),
            title: String(r.title),
            type: String(r.type),
            capabilities: parseCapabilitiesJson(r.capabilities_json),
            status: parseStatus(r.status),
            createdAt: Number(r.created_at),
            updatedAt: Number(r.updated_at)
        }
    }

    async createNode(args: {
        projectId: string
        parentId: string | null
        title: string
        type: string
        capabilities?: string[]
        orderIndex?: number
        status?: NodeStatus
    }): Promise<NodeEntity> {
        const ts = now()
        const id = randomUUID()

        const orderIndex = typeof args.orderIndex === 'number' ? args.orderIndex : ts
        const node: NodeEntity = {
            id,
            projectId: args.projectId,
            parentId: args.parentId,
            orderIndex,
            title: String(args.title),
            type: String(args.type),
            capabilities: (args.capabilities ?? []).map(String),
            status: args.status ?? 'idle',
            createdAt: ts,
            updatedAt: ts
        }

        const row = toRow(node)
        this.db()
            .prepare(
                'INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n' +
                'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
            .run(
                row.id,
                row.project_id,
                row.parent_id,
                row.order_index,
                row.title,
                row.type,
                row.capabilities_json,
                row.status,
                row.created_at,
                row.updated_at
            )

        return node
    }

    async moveNode(args: {
        projectId: string
        nodeId: string
        newParentId: string | null
        newOrderIndex: number
    }): Promise<{ ok: true }> {
        this.db()
            .prepare('UPDATE nodes SET parent_id = ?, order_index = ?, updated_at = ? WHERE project_id = ? AND id = ?')
            .run(args.newParentId, args.newOrderIndex, now(), args.projectId, args.nodeId)
        return { ok: true }
    }

    async updateNode(args: {
        projectId: string
        nodeId: string
        title?: string
        type?: string
        capabilities?: string[]
        status?: NodeStatus
    }): Promise<NodeEntity> {
        const current = await this.getById({ projectId: args.projectId, nodeId: args.nodeId })
        if (!current) throw new Error('node not found')

        const next: NodeEntity = {
            ...current,
            title: args.title != null ? String(args.title) : current.title,
            type: args.type != null ? String(args.type) : current.type,
            capabilities: args.capabilities != null ? args.capabilities.map(String) : current.capabilities,
            status: args.status != null ? args.status : current.status,
            updatedAt: now()
        }

        this.db()
            .prepare(
                'UPDATE nodes SET title = ?, type = ?, capabilities_json = ?, status = ?, updated_at = ? WHERE project_id = ? AND id = ?'
            )
            .run(
                next.title,
                next.type,
                JSON.stringify(next.capabilities ?? []),
                next.status,
                next.updatedAt,
                args.projectId,
                args.nodeId
            )

        return next
    }

    async deleteNode(args: { projectId: string; nodeId: string }): Promise<{ ok: true }> {
        // Full delete subtree is not implemented yet; for now hard-delete the single node.
        this.db().prepare('DELETE FROM nodes WHERE project_id = ? AND id = ?').run(args.projectId, args.nodeId)
        return { ok: true }
    }
}
