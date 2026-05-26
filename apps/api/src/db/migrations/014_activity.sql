CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_activity_card ON activity_logs(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_history ON card_history(card_id, entered_at);
