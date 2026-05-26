CREATE TABLE IF NOT EXISTS substeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  target_date DATE,
  is_complete BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES users(id),
  order_index SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_substeps_card ON substeps(card_id, order_index);
