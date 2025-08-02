CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  last_used INTEGER,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL
);
