"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteNodeTreeRepository = void 0;
const node_crypto_1 = require("node:crypto");
const sqlite_1 = require("../../db/sqlite");
function now() {
    return Date.now();
}
function parseCapabilitiesJson(value) {
    try {
        const arr = JSON.parse(String(value ?? '[]'));
        return Array.isArray(arr) ? arr.map(String) : [];
    }
    catch {
        return [];
    }
}
function toRow(n) {
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
    };
}
function parseStatus(value) {
    const s = String(value ?? 'idle');
    if (s === 'running' || s === 'succeeded' || s === 'failed')
        return s;
    return 'idle';
}
class SqliteNodeTreeRepository {
    userDataPath;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    db() {
        return (0, sqlite_1.getDb)({ userDataPath: this.userDataPath });
    }
    async listChildren(args) {
        const rows = this.db()
            .prepare('SELECT id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at\n' +
            'FROM nodes WHERE project_id = ? AND parent_id IS ? ORDER BY order_index ASC')
            .all(args.projectId, args.parentId);
        return rows.map((r) => ({
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
        }));
    }
    async getById(args) {
        const r = this.db()
            .prepare('SELECT id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at\n' +
            'FROM nodes WHERE project_id = ? AND id = ?')
            .get(args.projectId, args.nodeId);
        if (!r)
            return null;
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
        };
    }
    async createNode(args) {
        const ts = now();
        const id = (0, node_crypto_1.randomUUID)();
        const orderIndex = typeof args.orderIndex === 'number' ? args.orderIndex : ts;
        const node = {
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
        };
        const row = toRow(node);
        this.db()
            .prepare('INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n' +
            'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(row.id, row.project_id, row.parent_id, row.order_index, row.title, row.type, row.capabilities_json, row.status, row.created_at, row.updated_at);
        return node;
    }
    async moveNode(args) {
        this.db()
            .prepare('UPDATE nodes SET parent_id = ?, order_index = ?, updated_at = ? WHERE project_id = ? AND id = ?')
            .run(args.newParentId, args.newOrderIndex, now(), args.projectId, args.nodeId);
        return { ok: true };
    }
    async updateNode(args) {
        const current = await this.getById({ projectId: args.projectId, nodeId: args.nodeId });
        if (!current)
            throw new Error('node not found');
        const next = {
            ...current,
            title: args.title != null ? String(args.title) : current.title,
            type: args.type != null ? String(args.type) : current.type,
            capabilities: args.capabilities != null ? args.capabilities.map(String) : current.capabilities,
            status: args.status != null ? args.status : current.status,
            updatedAt: now()
        };
        this.db()
            .prepare('UPDATE nodes SET title = ?, type = ?, capabilities_json = ?, status = ?, updated_at = ? WHERE project_id = ? AND id = ?')
            .run(next.title, next.type, JSON.stringify(next.capabilities ?? []), next.status, next.updatedAt, args.projectId, args.nodeId);
        return next;
    }
    async deleteNode(args) {
        // Full delete subtree is not implemented yet; for now hard-delete the single node.
        this.db().prepare('DELETE FROM nodes WHERE project_id = ? AND id = ?').run(args.projectId, args.nodeId);
        return { ok: true };
    }
}
exports.SqliteNodeTreeRepository = SqliteNodeTreeRepository;
