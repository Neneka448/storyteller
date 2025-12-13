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
    pipelineRegistry;
    nodeRegistry;
    defaultPipelineId;
    constructor(userDataPath, pipelineRegistry, nodeRegistry, defaultPipelineId) {
        this.userDataPath = userDataPath;
        this.pipelineRegistry = pipelineRegistry;
        this.nodeRegistry = nodeRegistry;
        this.defaultPipelineId = defaultPipelineId;
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
        const pipeline = this.pipelineRegistry.get(this.defaultPipelineId).definition();
        const db = this.db();
        const tx = db.transaction(() => {
            db.prepare('INSERT INTO projects(id, name, created_at, updated_at) VALUES(?, ?, ?, ?)').run(id, projectName, ts, ts);
            for (const s of pipeline.steps) {
                db.prepare('INSERT INTO steps(project_id, step_id, title, status, artifact_summary, adopted_artifact_version_id, created_at, updated_at)\n           VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(id, s.stepId, s.title, 'idle', s.initialArtifactSummary, null, ts, ts);
                // 由节点实现决定如何 seed（例如 memo：创建 artifact + 初始版本）
                s.node.seed?.({ projectId: id, stepId: s.stepId, title: s.title }, s.params);
            }
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
            db.prepare('DELETE FROM steps WHERE project_id = ?').run(projectId);
            db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
            const active = this.getActiveProjectId();
            if (active === projectId) {
                this.setActiveProjectId('');
            }
        });
        tx();
    }
    listSteps(projectId) {
        const pipeline = this.pipelineRegistry.get(this.defaultPipelineId).definition();
        const rows = this.db()
            .prepare('SELECT project_id, step_id, title, status, artifact_summary, adopted_artifact_version_id, created_at, updated_at\n         FROM steps WHERE project_id = ? ORDER BY created_at ASC')
            .all(projectId);
        return rows.map((r) => ({
            nodeType: pipeline.steps.find((s) => s.stepId === r.step_id)?.node.type ?? null,
            uiBlocks: pipeline.steps.find((s) => s.stepId === r.step_id)?.node.ui.blocks ?? [],
            projectId: r.project_id,
            stepId: r.step_id,
            title: r.title,
            status: r.status,
            artifactSummary: r.artifact_summary,
            adoptedArtifactVersionId: r.adopted_artifact_version_id ?? null,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    }
}
exports.ProjectService = ProjectService;
