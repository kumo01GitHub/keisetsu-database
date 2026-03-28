-- Table definition for deck_metadata
-- Stores metadata for each deck (display name, file name, timestamps)
CREATE TABLE IF NOT EXISTS deck_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Unique identifier for the deck metadata (always 1)
  display_name TEXT NOT NULL,            -- Human-readable name of the deck
  file_name TEXT NOT NULL,               -- File name associated with the deck
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the record was created
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP  -- Timestamp when the record was last updated
);
