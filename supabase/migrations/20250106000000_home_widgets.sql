-- Editable widgets shown on the public Home page
CREATE TABLE home_widgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       TEXT NOT NULL UNIQUE,  -- e.g. 'prossima_partita'
  attivo     BOOLEAN NOT NULL DEFAULT false,
  payload    JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the "prossima partita" widget
INSERT INTO home_widgets (tipo, attivo, payload) VALUES (
  'prossima_partita',
  false,
  '{"data": "", "ora": "", "luogo": "", "nome": ""}'
);

-- RLS
ALTER TABLE home_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read home_widgets" ON home_widgets
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin update home_widgets" ON home_widgets
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
