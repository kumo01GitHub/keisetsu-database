PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS deck_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT DEFAULT '',
  category TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cards_term ON cards(term);
CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category);