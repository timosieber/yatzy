CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('standard', 'blitz', 'maxi', 'free')),
  config JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_players (
  id BIGSERIAL PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  seat SMALLINT NOT NULL CHECK (seat BETWEEN 0 AND 7),
  player_name TEXT NOT NULL,
  player_key TEXT NOT NULL,
  scores JSONB NOT NULL,
  upper_total INTEGER NOT NULL,
  bonus INTEGER NOT NULL,
  lower_total INTEGER NOT NULL,
  total INTEGER NOT NULL,
  rank SMALLINT NOT NULL,
  UNIQUE (game_id, seat)
);

CREATE INDEX IF NOT EXISTS games_completed_at_idx ON games (completed_at DESC, id);
CREATE INDEX IF NOT EXISTS games_mode_idx ON games (mode, completed_at DESC);
CREATE INDEX IF NOT EXISTS game_players_player_key_idx ON game_players (player_key);
CREATE INDEX IF NOT EXISTS game_players_total_idx ON game_players (total DESC);
