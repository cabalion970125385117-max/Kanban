CREATE TABLE IF NOT EXISTS card_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  blocked_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  UNIQUE (blocking_card_id, blocked_card_id)
);
