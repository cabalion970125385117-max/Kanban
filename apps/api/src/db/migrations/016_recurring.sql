CREATE TABLE IF NOT EXISTS recurring_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id),
  cron_expression VARCHAR(100) NOT NULL,
  next_run_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  max_occurrences INTEGER,
  occurrence_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);
