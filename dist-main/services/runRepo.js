"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunRepo = void 0;
const node_crypto_1 = require("node:crypto");
const sqlite_1 = require("../db/sqlite");
function now() {
    return Date.now();
}
class RunRepo {
    userDataPath;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    db() {
        return (0, sqlite_1.getDb)({ userDataPath: this.userDataPath });
    }
    createRun(args) {
        const id = (0, node_crypto_1.randomUUID)();
        const ts = now();
        this.db()
            .prepare('INSERT INTO runs(id, project_id, kind, status, input_json, error, started_at, finished_at, created_at, updated_at)\n         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, args.projectId, args.kind, 'running', JSON.stringify(args.inputJson ?? null), null, ts, null, ts, ts);
        return id;
    }
    setRunStatus(args) {
        const ts = now();
        const finishedAt = args.status === 'running' || args.status === 'queued' ? null : ts;
        this.db()
            .prepare('UPDATE runs SET status = ?, error = ?, finished_at = ?, updated_at = ? WHERE id = ?')
            .run(args.status, args.error ?? null, finishedAt, ts, args.runId);
    }
    addEvent(args) {
        const id = (0, node_crypto_1.randomUUID)();
        const ts = now();
        this.db()
            .prepare('INSERT INTO events(id, run_id, type, ts, payload_json) VALUES(?, ?, ?, ?, ?)')
            .run(id, args.runId, args.type, ts, JSON.stringify(args.payloadJson ?? null));
        return id;
    }
    listRuns(args) {
        const limit = Math.max(1, Math.min(Number(args.limit ?? 50), 200));
        const rows = this.db()
            .prepare('SELECT id, project_id, kind, status, input_json, error, started_at, finished_at, created_at, updated_at FROM runs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?')
            .all(args.projectId, limit);
        return rows.map((r) => {
            let inputJson = null;
            try {
                inputJson = r.input_json ? JSON.parse(String(r.input_json)) : null;
            }
            catch {
                inputJson = null;
            }
            return {
                id: String(r.id),
                projectId: String(r.project_id),
                kind: String(r.kind),
                status: String(r.status),
                inputJson,
                error: r.error != null ? String(r.error) : null,
                startedAt: r.started_at != null ? Number(r.started_at) : null,
                finishedAt: r.finished_at != null ? Number(r.finished_at) : null,
                createdAt: Number(r.created_at),
                updatedAt: Number(r.updated_at)
            };
        });
    }
    listEvents(args) {
        const limit = Math.max(1, Math.min(Number(args.limit ?? 200), 2000));
        const rows = this.db()
            .prepare('SELECT id, run_id, type, ts, payload_json FROM events WHERE run_id = ? ORDER BY ts ASC LIMIT ?')
            .all(args.runId, limit);
        return rows.map((r) => {
            let payloadJson = null;
            try {
                payloadJson = r.payload_json ? JSON.parse(String(r.payload_json)) : null;
            }
            catch {
                payloadJson = null;
            }
            return {
                id: String(r.id),
                runId: String(r.run_id),
                type: String(r.type),
                ts: Number(r.ts),
                payloadJson
            };
        });
    }
}
exports.RunRepo = RunRepo;
