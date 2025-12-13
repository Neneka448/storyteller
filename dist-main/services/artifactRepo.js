"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactRepo = void 0;
const node_crypto_1 = require("node:crypto");
const sqlite_1 = require("../db/sqlite");
function now() {
    return Date.now();
}
/**
 * ArtifactRepo：更底层的“产物表操作”，供 Node.seed / PipelineRunner 使用。
 * 未来可以扩展：image/video uri、hash、meta 等。
 */
class ArtifactRepo {
    userDataPath;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    db() {
        return (0, sqlite_1.getDb)({ userDataPath: this.userDataPath });
    }
    ensureTextArtifactSeeded(projectId, stepId) {
        const db = this.db();
        const existing = db
            .prepare('SELECT id FROM artifacts WHERE project_id = ? AND step_id = ? LIMIT 1')
            .get(projectId, stepId);
        if (existing?.id)
            return String(existing.id);
        const ts = now();
        const artifactId = (0, node_crypto_1.randomUUID)();
        db.prepare('INSERT INTO artifacts(id, project_id, step_id, type, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)').run(artifactId, projectId, stepId, 'text', ts, ts);
        db.prepare('INSERT INTO artifact_versions(id, artifact_id, version_index, content_type, content_text, content_json, meta_json, prompt_summary, adopted, created_at, updated_at)\n       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run((0, node_crypto_1.randomUUID)(), artifactId, 1, 'text', '', null, null, null, 0, ts, ts);
        return artifactId;
    }
    ensureJsonArtifactSeeded(projectId, stepId, initialJson = { items: [] }) {
        const db = this.db();
        const existing = db
            .prepare('SELECT id FROM artifacts WHERE project_id = ? AND step_id = ? LIMIT 1')
            .get(projectId, stepId);
        if (existing?.id)
            return String(existing.id);
        const ts = now();
        const artifactId = (0, node_crypto_1.randomUUID)();
        db.prepare('INSERT INTO artifacts(id, project_id, step_id, type, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)').run(artifactId, projectId, stepId, 'json', ts, ts);
        db.prepare('INSERT INTO artifact_versions(id, artifact_id, version_index, content_type, content_text, content_json, meta_json, prompt_summary, adopted, created_at, updated_at)\n       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run((0, node_crypto_1.randomUUID)(), artifactId, 1, 'json', null, JSON.stringify(initialJson ?? null), null, null, 0, ts, ts);
        return artifactId;
    }
}
exports.ArtifactRepo = ArtifactRepo;
