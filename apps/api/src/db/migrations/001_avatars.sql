CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype VARCHAR(50) NOT NULL,
  variant SMALLINT NOT NULL CHECK (variant BETWEEN 1 AND 4),
  sprite_url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  UNIQUE (archetype, variant)
);
