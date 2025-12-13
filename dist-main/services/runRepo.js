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
}
exports.RunRepo = RunRepo;
