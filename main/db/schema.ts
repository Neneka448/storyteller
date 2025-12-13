type Db = any

export function initSchema(db: Db) {
    db.pragma('journal_mode = WAL')

    // NOTE: This is a full refactor schema reset (no compatibility/rollback).
    // We intentionally drop legacy tables to avoid carrying old abstractions.
    db.exec(`
    DROP TABLE IF EXISTS artifact_versions;
    DROP TABLE IF EXISTS artifacts;
    DROP TABLE IF EXISTS steps;
  `)

    // kv: settings / small blobs
    db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      order_index REAL NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      capabilities_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      input_json TEXT NOT NULL,
      error TEXT,
      started_at INTEGER,
      finished_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      type TEXT NOT NULL,
      ts INTEGER NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      capability_id TEXT NOT NULL,
      type TEXT NOT NULL,
      adopted_version_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(project_id, node_id, capability_id)
    );

    CREATE TABLE IF NOT EXISTS artifact_versions (
      id TEXT PRIMARY KEY,
      artifact_id TEXT NOT NULL,
      version_index INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      content_text TEXT,
      content_json TEXT,
      content_url TEXT,
      meta_json TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(artifact_id, version_index)
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_project_parent ON nodes(project_id, parent_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_project_node ON artifacts(project_id, node_id, capability_id);
    CREATE INDEX IF NOT EXISTS idx_versions_artifact ON artifact_versions(artifact_id);
  `)
}
