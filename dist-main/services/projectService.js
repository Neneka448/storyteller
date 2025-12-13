"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const node_crypto_1 = require("node:crypto");
const sqlite_1 = require("../db/sqlite");
function now() {
    return Date.now();
}
class ProjectService {
    userDataPath;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    db() {
        return (0, sqlite_1.getDb)({ userDataPath: this.userDataPath });
    }
    listProjects() {
        const rows = this.db()
            .prepare('SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC')
            .all();
        return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at }));
    }
    getActiveProjectId() {
        const row = this.db().prepare('SELECT value FROM kv WHERE key = ?').get('projects.activeId');
        if (!row?.value)
            return null;
        return String(row.value);
    }
    setActiveProjectId(projectId) {
        this.db()
            .prepare('INSERT INTO kv(key, value, updated_at) VALUES(?, ?, ?)\n         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at')
            .run('projects.activeId', String(projectId), now());
    }
    getProject(projectId) {
        const r = this.db()
            .prepare('SELECT id, name, created_at, updated_at FROM projects WHERE id = ?')
            .get(projectId);
        if (!r)
            return null;
        return { id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at };
    }
    createProject(name) {
        const id = (0, node_crypto_1.randomUUID)();
        const ts = now();
        const projectName = String(name || '').trim() || `新项目 ${new Date().toLocaleDateString('zh-CN')}`;
        const defaultNodes = [
            { nodeId: 'node_world', title: '世界观草案', type: 'memo.world', capabilities: ['memo'] },
            { nodeId: 'node_character', title: '角色草案（KV）', type: 'kv.character', capabilities: ['kv'] },
            { nodeId: 'node_outline', title: '大纲', type: 'memo.outline', capabilities: ['memo'] },
            { nodeId: 'node_script', title: '剧本', type: 'memo.script', capabilities: ['memo'] },
            { nodeId: 'node_storyboard', title: '分镜（镜头列表）', type: 'memo.storyboard', capabilities: ['memo', 'sandbox'] },
            { nodeId: 'node_char_image', title: '角色设定图', type: 'image.character', capabilities: ['image'] },
            { nodeId: 'node_keyframes', title: '关键帧', type: 'image.keyframes', capabilities: ['image'] }
        ];
        const db = this.db();
        const tx = db.transaction(() => {
            db.prepare('INSERT INTO projects(id, name, created_at, updated_at) VALUES(?, ?, ?, ?)').run(id, projectName, ts, ts);
            const rootId = (0, node_crypto_1.randomUUID)();
            db.prepare('INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(rootId, id, null, 0, 'Root', 'root', JSON.stringify(['folder']), 'idle', ts, ts);
            defaultNodes.forEach((n, idx) => {
                db.prepare('INSERT INTO nodes(id, project_id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at)\n           VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run((0, node_crypto_1.randomUUID)(), id, rootId, idx + 1, n.title, n.type, JSON.stringify(n.capabilities), 'idle', ts, ts);
            });
            this.setActiveProjectId(id);
        });
        tx();
        return this.getProject(id);
    }
    deleteProject(projectId) {
        const db = this.db();
        const tx = db.transaction(() => {
            db.prepare('DELETE FROM artifact_versions WHERE artifact_id IN (SELECT id FROM artifacts WHERE project_id = ?)').run(projectId);
            db.prepare('DELETE FROM artifacts WHERE project_id = ?').run(projectId);
            db.prepare('DELETE FROM events WHERE run_id IN (SELECT id FROM runs WHERE project_id = ?)').run(projectId);
            db.prepare('DELETE FROM runs WHERE project_id = ?').run(projectId);
            db.prepare('DELETE FROM nodes WHERE project_id = ?').run(projectId);
            db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
            const active = this.getActiveProjectId();
            if (active === projectId) {
                this.setActiveProjectId('');
            }
        });
        tx();
    }
    listNodes(projectId) {
        const rows = this.db()
            .prepare('SELECT project_id, id, parent_id, order_index, title, type, capabilities_json, status, created_at, updated_at\n' +
            'FROM nodes WHERE project_id = ? ORDER BY order_index ASC')
            .all(projectId);
        return rows.map((r) => ({
            projectId: String(r.project_id),
            nodeId: String(r.id),
            parentId: r.parent_id != null ? String(r.parent_id) : null,
            orderIndex: Number(r.order_index),
            title: String(r.title),
            type: String(r.type),
            capabilities: JSON.parse(String(r.capabilities_json ?? '[]')),
            status: String(r.status),
            createdAt: Number(r.created_at),
            updatedAt: Number(r.updated_at)
        }));
    }
}
exports.ProjectService = ProjectService;
