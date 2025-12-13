type Db = any

export function initSchema(db: Db) {
    db.pragma('journal_mode = WAL')

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

    -- Step state for a project (fixed chain in v0.1)
    CREATE TABLE IF NOT EXISTS steps (
      project_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      artifact_summary TEXT NOT NULL,
      adopted_artifact_version_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (project_id, step_id)
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
      step_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifact_versions (
      id TEXT PRIMARY KEY,
      artifact_id TEXT NOT NULL,
      version_index INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      content_text TEXT,
      content_json TEXT,
      meta_json TEXT,
      prompt_summary TEXT,
      adopted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(artifact_id, version_index)
    );

    CREATE INDEX IF NOT EXISTS idx_steps_project ON steps(project_id);
    CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_project_step ON artifacts(project_id, step_id);
    CREATE INDEX IF NOT EXISTS idx_versions_artifact ON artifact_versions(artifact_id);
  `)
}
