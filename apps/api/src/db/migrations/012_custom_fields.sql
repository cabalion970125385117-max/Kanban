CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  field_type VARCHAR(20) CHECK (field_type IN ('text','number','dropdown','checkbox','date','url','email','person')),
  is_required BOOLEAN DEFAULT FALSE,
  options JSONB,
  order_index SMALLINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS card_custom_values (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  field_id UUID REFERENCES custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number DECIMAL(12,4),
  value_date DATE,
  value_bool BOOLEAN,
  value_user_id UUID REFERENCES users(id),
  PRIMARY KEY (card_id, field_id)
);
