"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteVersionedArtifactStore = void 0;
const node_crypto_1 = require("node:crypto");
const sqlite_1 = require("../../db/sqlite");
function now() {
    return Date.now();
}
function jsonStringify(value) {
    return JSON.stringify(value ?? null);
}
function jsonParse(value) {
    try {
        return JSON.parse(String(value));
    }
    catch {
        return null;
    }
}
function normalizeMeta(meta, ts) {
    const m = meta && typeof meta === 'object' ? { ...meta } : {};
    const author = m.author === 'agent' || m.author === 'system' || m.author === 'user' ? m.author : 'user';
    if (typeof m.createdAt !== 'number' || !Number.isFinite(m.createdAt))
        m.createdAt = ts;
    m.author = author;
    return m;
}
class SqliteVersionedArtifactStore {
    userDataPath;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    db() {
        return (0, sqlite_1.getDb)({ userDataPath: this.userDataPath });
    }
    async ensureArtifact(args) {
        const db = this.db();
        const existing = db
            .prepare('SELECT id, project_id, node_id, capability_id, type, adopted_version_id, created_at, updated_at\n' +
            'FROM artifacts WHERE project_id = ? AND node_id = ? AND capability_id = ?')
            .get(args.projectId, args.nodeId, args.capabilityId);
        if (existing) {
            return {
                id: String(existing.id),
                projectId: String(existing.project_id),
                nodeId: String(existing.node_id),
                capabilityId: String(existing.capability_id),
                type: String(existing.type),
                adoptedVersionId: existing.adopted_version_id != null ? String(existing.adopted_version_id) : null,
                createdAt: Number(existing.created_at),
                updatedAt: Number(existing.updated_at)
            };
        }
        const id = (0, node_crypto_1.randomUUID)();
        const ts = now();
        db.prepare('INSERT INTO artifacts(id, project_id, node_id, capability_id, type, adopted_version_id, created_at, updated_at)\n' +
            'VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(id, args.projectId, args.nodeId, args.capabilityId, args.type, null, ts, ts);
        return {
            id,
            projectId: args.projectId,
            nodeId: args.nodeId,
            capabilityId: args.capabilityId,
            type: args.type,
            adoptedVersionId: null,
            createdAt: ts,
            updatedAt: ts
        };
    }
    async listVersions(args) {
        const artifact = await this.ensureArtifact({
            projectId: args.projectId,
            nodeId: args.nodeId,
            capabilityId: args.capabilityId,
            type: 'json'
        });
        const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : 200;
        const rows = this.db()
            .prepare('SELECT id, artifact_id, version_index, content_type, content_text, content_json, content_url, meta_json, created_at\n' +
            'FROM artifact_versions WHERE artifact_id = ? ORDER BY version_index DESC LIMIT ?')
            .all(artifact.id, limit);
        return rows.map((r) => ({
            id: String(r.id),
            artifactId: String(r.artifact_id),
            versionIndex: Number(r.version_index),
            contentType: String(r.content_type),
            contentText: r.content_text != null ? String(r.content_text) : null,
            contentJson: r.content_json != null ? jsonParse(r.content_json) : null,
            contentUrl: r.content_url != null ? String(r.content_url) : null,
            meta: r.meta_json != null ? jsonParse(r.meta_json) : null,
            createdAt: Number(r.created_at)
        }));
    }
    async getAdopted(args) {
        const row = this.db()
            .prepare('SELECT adopted_version_id, id as artifact_id FROM artifacts WHERE project_id = ? AND node_id = ? AND capability_id = ?')
            .get(args.projectId, args.nodeId, args.capabilityId);
        if (!row?.adopted_version_id)
            return null;
        const v = this.db()
            .prepare('SELECT id, artifact_id, version_index, content_type, content_text, content_json, content_url, meta_json, created_at\n' +
            'FROM artifact_versions WHERE id = ?')
            .get(String(row.adopted_version_id));
        if (!v)
            return null;
        if (String(v.artifact_id) !== String(row.artifact_id))
            return null;
        return {
            id: String(v.id),
            artifactId: String(v.artifact_id),
            versionIndex: Number(v.version_index),
            contentType: String(v.content_type),
            contentText: v.content_text != null ? String(v.content_text) : null,
            contentJson: v.content_json != null ? jsonParse(v.content_json) : null,
            contentUrl: v.content_url != null ? String(v.content_url) : null,
            meta: v.meta_json != null ? jsonParse(v.meta_json) : null,
            createdAt: Number(v.created_at)
        };
    }
    async getVersionById(args) {
        const artifact = await this.ensureArtifact({
            projectId: args.projectId,
            nodeId: args.nodeId,
            capabilityId: args.capabilityId,
            type: 'json'
        });
        const v = this.db()
            .prepare('SELECT id, artifact_id, version_index, content_type, content_text, content_json, content_url, meta_json, created_at\n' +
            'FROM artifact_versions WHERE id = ?')
            .get(String(args.versionId));
        if (!v)
            return null;
        if (String(v.artifact_id) !== String(artifact.id))
            return null;
        return {
            id: String(v.id),
            artifactId: String(v.artifact_id),
            versionIndex: Number(v.version_index),
            contentType: String(v.content_type),
            contentText: v.content_text != null ? String(v.content_text) : null,
            contentJson: v.content_json != null ? jsonParse(v.content_json) : null,
            contentUrl: v.content_url != null ? String(v.content_url) : null,
            meta: v.meta_json != null ? jsonParse(v.meta_json) : null,
            createdAt: Number(v.created_at)
        };
    }
    async appendVersion(args) {
        const db = this.db();
        const artifact = await this.ensureArtifact({
            projectId: args.projectId,
            nodeId: args.nodeId,
            capabilityId: args.capabilityId,
            type: args.contentType
        });
        const maxRow = db
            .prepare('SELECT MAX(version_index) AS m FROM artifact_versions WHERE artifact_id = ?')
            .get(artifact.id);
        const nextIndex = Number(maxRow?.m || 0) + 1;
        const id = (0, node_crypto_1.randomUUID)();
        const ts = now();
        const contentText = args.contentText != null ? String(args.contentText) : null;
        const contentJson = args.contentJson !== undefined ? jsonStringify(args.contentJson) : null;
        const contentUrl = args.contentUrl != null ? String(args.contentUrl) : null;
        const meta = normalizeMeta(args.meta ?? null, ts);
        const metaJson = jsonStringify(meta);
        const tx = db.transaction(() => {
            db.prepare('INSERT INTO artifact_versions(id, artifact_id, version_index, content_type, content_text, content_json, content_url, meta_json, created_at)\n' +
                'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, artifact.id, nextIndex, args.contentType, contentText, contentJson, contentUrl, metaJson, ts);
            if (args.adopt) {
                db.prepare('UPDATE artifacts SET adopted_version_id = ?, updated_at = ? WHERE id = ?').run(id, ts, artifact.id);
            }
            else {
                db.prepare('UPDATE artifacts SET updated_at = ? WHERE id = ?').run(ts, artifact.id);
            }
        });
        tx();
        return {
            id,
            artifactId: artifact.id,
            versionIndex: nextIndex,
            contentType: args.contentType,
            contentText,
            contentJson: args.contentJson !== undefined ? args.contentJson : null,
            contentUrl,
            meta,
            createdAt: ts
        };
    }
    async adoptVersion(args) {
        const db = this.db();
        const artifact = await this.ensureArtifact({
            projectId: args.projectId,
            nodeId: args.nodeId,
            capabilityId: args.capabilityId,
            type: 'json'
        });
        db.prepare('UPDATE artifacts SET adopted_version_id = ?, updated_at = ? WHERE id = ?').run(String(args.versionId), now(), artifact.id);
        return { ok: true };
    }
}
exports.SqliteVersionedArtifactStore = SqliteVersionedArtifactStore;
