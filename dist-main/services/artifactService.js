"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactService = void 0;
const node_crypto_1 = require("node:crypto");
const sqlite_1 = require("../db/sqlite");
function now() {
    return Date.now();
}
function json(value) {
    return JSON.stringify(value ?? null);
}
class ArtifactService {
    userDataPath;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    db() {
        return (0, sqlite_1.getDb)({ userDataPath: this.userDataPath });
    }
    getArtifactId(projectId, stepId) {
        const row = this.db()
            .prepare('SELECT id FROM artifacts WHERE project_id = ? AND step_id = ? LIMIT 1')
            .get(projectId, stepId);
        return row?.id ? String(row.id) : null;
    }
    listVersions(projectId, stepId) {
        const artifactId = this.getArtifactId(projectId, stepId);
        if (!artifactId)
            return [];
        const rows = this.db()
            .prepare('SELECT id, version_index, content_type, content_text, content_json, adopted, created_at, updated_at\n         FROM artifact_versions WHERE artifact_id = ? ORDER BY version_index DESC')
            .all(artifactId);
        return rows.map((r) => ({
            id: String(r.id),
            versionIndex: Number(r.version_index),
            contentType: String(r.content_type),
            contentText: r.content_text != null ? String(r.content_text) : null,
            contentJson: r.content_json ? JSON.parse(String(r.content_json)) : null,
            adopted: Boolean(r.adopted),
            createdAt: Number(r.created_at),
            updatedAt: Number(r.updated_at)
        }));
    }
    getAdopted(projectId, stepId) {
        const db = this.db();
        const stepRow = db
            .prepare('SELECT adopted_artifact_version_id FROM steps WHERE project_id = ? AND step_id = ?')
            .get(projectId, stepId);
        const adoptedId = stepRow?.adopted_artifact_version_id;
        if (!adoptedId)
            return null;
        const v = db
            .prepare('SELECT id, version_index, content_type, content_text, content_json, adopted, created_at, updated_at\n         FROM artifact_versions WHERE id = ?')
            .get(adoptedId);
        if (!v)
            return null;
        return {
            id: String(v.id),
            versionIndex: Number(v.version_index),
            contentType: String(v.content_type),
            contentText: v.content_text != null ? String(v.content_text) : null,
            contentJson: v.content_json ? JSON.parse(String(v.content_json)) : null,
            adopted: Boolean(v.adopted),
            createdAt: Number(v.created_at),
            updatedAt: Number(v.updated_at)
        };
    }
    getVersionById(projectId, stepId, versionId) {
        const artifactId = this.getArtifactId(projectId, stepId);
        if (!artifactId)
            return null;
        const v = this.db()
            .prepare('SELECT id, artifact_id, version_index, content_type, content_text, content_json, adopted, created_at, updated_at\n         FROM artifact_versions WHERE id = ?')
            .get(String(versionId));
        if (!v)
            return null;
        if (String(v.artifact_id) !== String(artifactId))
            return null;
        return {
            id: String(v.id),
            versionIndex: Number(v.version_index),
            contentType: String(v.content_type),
            contentText: v.content_text != null ? String(v.content_text) : null,
            contentJson: v.content_json ? JSON.parse(String(v.content_json)) : null,
            adopted: Boolean(v.adopted),
            createdAt: Number(v.created_at),
            updatedAt: Number(v.updated_at)
        };
    }
    appendTextVersion(projectId, stepId, contentText) {
        const db = this.db();
        const artifactId = this.getArtifactId(projectId, stepId);
        if (!artifactId)
            throw new Error('artifact not found');
        const maxRow = db
            .prepare('SELECT MAX(version_index) AS m FROM artifact_versions WHERE artifact_id = ?')
            .get(artifactId);
        const nextIndex = Number(maxRow?.m || 0) + 1;
        const id = (0, node_crypto_1.randomUUID)();
        const ts = now();
        db.prepare('INSERT INTO artifact_versions(id, artifact_id, version_index, content_type, content_text, content_json, meta_json, prompt_summary, adopted, created_at, updated_at)\n       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, artifactId, nextIndex, 'text', String(contentText ?? ''), null, null, null, 0, ts, ts);
        return {
            id,
            versionIndex: nextIndex,
            contentType: 'text',
            contentText: String(contentText ?? ''),
            contentJson: null,
            adopted: false,
            createdAt: ts,
            updatedAt: ts
        };
    }
    appendJsonVersion(projectId, stepId, contentJson) {
        const db = this.db();
        const artifactId = this.getArtifactId(projectId, stepId);
        if (!artifactId)
            throw new Error('artifact not found');
        const maxRow = db
            .prepare('SELECT MAX(version_index) AS m FROM artifact_versions WHERE artifact_id = ?')
            .get(artifactId);
        const nextIndex = Number(maxRow?.m || 0) + 1;
        const id = (0, node_crypto_1.randomUUID)();
        const ts = now();
        db.prepare('INSERT INTO artifact_versions(id, artifact_id, version_index, content_type, content_text, content_json, meta_json, prompt_summary, adopted, created_at, updated_at)\n       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, artifactId, nextIndex, 'json', null, JSON.stringify(contentJson ?? null), null, null, 0, ts, ts);
        return {
            id,
            versionIndex: nextIndex,
            contentType: 'json',
            contentText: null,
            contentJson: contentJson ?? null,
            adopted: false,
            createdAt: ts,
            updatedAt: ts
        };
    }
    adoptVersion(projectId, stepId, versionId) {
        const db = this.db();
        const artifactId = this.getArtifactId(projectId, stepId);
        if (!artifactId)
            throw new Error('artifact not found');
        const tx = db.transaction(() => {
            db.prepare('UPDATE artifact_versions SET adopted = 0, updated_at = ? WHERE artifact_id = ?').run(now(), artifactId);
            db.prepare('UPDATE artifact_versions SET adopted = 1, updated_at = ? WHERE id = ?').run(now(), versionId);
            db.prepare('UPDATE steps SET adopted_artifact_version_id = ?, updated_at = ? WHERE project_id = ? AND step_id = ?').run(String(versionId), now(), projectId, stepId);
        });
        tx();
        return { ok: true };
    }
}
exports.ArtifactService = ArtifactService;
