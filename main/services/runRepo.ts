import { randomUUID } from 'node:crypto'

import { getDb } from '../db/sqlite'

function now() {
    return Date.now()
}

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

export class RunRepo {
    constructor(private readonly userDataPath: string) { }

    private db() {
        return getDb({ userDataPath: this.userDataPath })
    }

    createRun(args: { projectId: string; kind: string; inputJson: any }): string {
        const id = randomUUID()
        const ts = now()
        this.db()
            .prepare(
                'INSERT INTO runs(id, project_id, kind, status, input_json, error, started_at, finished_at, created_at, updated_at)\n         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )
            .run(
                id,
                args.projectId,
                args.kind,
                'running',
                JSON.stringify(args.inputJson ?? null),
                null,
                ts,
                null,
                ts,
                ts
            )
        return id
    }

    setRunStatus(args: { runId: string; status: RunStatus; error?: string | null }) {
        const ts = now()
        const finishedAt = args.status === 'running' || args.status === 'queued' ? null : ts

        this.db()
            .prepare('UPDATE runs SET status = ?, error = ?, finished_at = ?, updated_at = ? WHERE id = ?')
            .run(args.status, args.error ?? null, finishedAt, ts, args.runId)
    }

    addEvent(args: { runId: string; type: string; payloadJson: any }) {
        const id = randomUUID()
        const ts = now()
        this.db()
            .prepare('INSERT INTO events(id, run_id, type, ts, payload_json) VALUES(?, ?, ?, ?, ?)')
            .run(id, args.runId, args.type, ts, JSON.stringify(args.payloadJson ?? null))
        return id
    }
}
