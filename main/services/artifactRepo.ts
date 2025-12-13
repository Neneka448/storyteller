import { randomUUID } from 'node:crypto'

import { getDb } from '../db/sqlite'

function now() {
    return Date.now()
}

/**
 * ArtifactRepo：更底层的“产物表操作”，供 Node.seed / PipelineRunner 使用。
 * 未来可以扩展：image/video uri、hash、meta 等。
 */
export class ArtifactRepo {
    constructor(private readonly userDataPath: string) { }

    private db() {
        return getDb({ userDataPath: this.userDataPath })
    }

    ensureTextArtifactSeeded(projectId: string, stepId: string) {
        const db = this.db()
        const existing = db
            .prepare('SELECT id FROM artifacts WHERE project_id = ? AND step_id = ? LIMIT 1')
            .get(projectId, stepId)

        if (existing?.id) return String(existing.id)

        const ts = now()
        const artifactId = randomUUID()

        db.prepare(
            'INSERT INTO artifacts(id, project_id, step_id, type, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)'
        ).run(artifactId, projectId, stepId, 'text', ts, ts)

        db.prepare(
            'INSERT INTO artifact_versions(id, artifact_id, version_index, content_type, content_text, content_json, meta_json, prompt_summary, adopted, created_at, updated_at)\n       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(randomUUID(), artifactId, 1, 'text', '', null, null, null, 0, ts, ts)

        return artifactId
    }

    ensureJsonArtifactSeeded(projectId: string, stepId: string, initialJson: any = { items: [] }) {
        const db = this.db()
        const existing = db
            .prepare('SELECT id FROM artifacts WHERE project_id = ? AND step_id = ? LIMIT 1')
            .get(projectId, stepId)

        if (existing?.id) return String(existing.id)

        const ts = now()
        const artifactId = randomUUID()

        db.prepare(
            'INSERT INTO artifacts(id, project_id, step_id, type, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)'
        ).run(artifactId, projectId, stepId, 'json', ts, ts)

        db.prepare(
            'INSERT INTO artifact_versions(id, artifact_id, version_index, content_type, content_text, content_json, meta_json, prompt_summary, adopted, created_at, updated_at)\n       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(randomUUID(), artifactId, 1, 'json', null, JSON.stringify(initialJson ?? null), null, null, 0, ts, ts)

        return artifactId
    }
}
