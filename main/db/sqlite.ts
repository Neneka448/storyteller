import path from 'node:path'

import { initSchema } from './schema'

// better-sqlite3 is CJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3') as any

type Db = any

let db: Db | null = null

/**
 * Singleton better-sqlite3 instance.
 * DB path: <userData>/storyteller.db
 */
export function getDb(opts: { userDataPath: string }): Db {
    if (db) return db

    const dbPath = path.join(opts.userDataPath, 'storyteller.db')
    db = new Database(dbPath)
    initSchema(db)
    return db
}
