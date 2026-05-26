CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  colour VARCHAR(7) DEFAULT '#5B4FCF',
  order_index SMALLINT NOT NULL DEFAULT 0,
  wip_limit SMALLINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id, order_index);
