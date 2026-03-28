-- Table definition for cards
-- Stores individual card data for each deck (term, summary, detail, category, timestamps)
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY, -- Unique identifier for the card
  term TEXT NOT NULL, -- The main term or question
  summary TEXT NOT NULL, -- Short answer or summary
  detail TEXT DEFAULT '', -- Detailed explanation or description
  category TEXT DEFAULT '', -- Category or tag for the card
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP -- Last update timestamp
);

-- Indexes for fast lookup by term and category
CREATE INDEX IF NOT EXISTS idx_cards_term ON cards(term);
CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category);
