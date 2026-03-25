-- ============================================================
-- Polemica League — Initial Schema
-- ============================================================

-- 1. PLAYERS (dimension)
CREATE TABLE players (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  er         NUMERIC,           -- current overall ER
  tratto     TEXT,               -- tratto distintivo
  tenore_fisico TEXT,
  base_rating   NUMERIC,
  last_er       NUMERIC,
  delta_rating  NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PLAYER_ROLES (dimension, up to 4 per player)
CREATE TABLE player_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  ruolo      TEXT NOT NULL CHECK (ruolo IN ('CC','TD','ATT','TS','DC','CS','POR','CD')),
  ordine     INT  NOT NULL CHECK (ordine BETWEEN 1 AND 4),
  UNIQUE (player_id, ordine)
);

-- 3. PLAYER_ER_HISTORY (dimension, one row per giornata per player)
CREATE TABLE player_er_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  giornata   INT  NOT NULL,
  er         NUMERIC,
  UNIQUE (player_id, giornata)
);

-- 4. MATCH_DETAILS (fact table)
CREATE TABLE match_details (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data              DATE NOT NULL,
  giornata          INT  NOT NULL,
  campo             TEXT,
  ora               TIME,
  squadra           TEXT NOT NULL CHECK (squadra IN ('A','B')),
  player_id         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  er                NUMERIC,          -- NULL if missing
  gol               INT  NOT NULL DEFAULT 0,
  autogol           INT  NOT NULL DEFAULT 0,
  assist            INT  NOT NULL DEFAULT 0,
  voto              NUMERIC,          -- NULL if missing
  gol_squadra       INT  NOT NULL,
  gol_avversari     INT  NOT NULL,
  risultato         TEXT NOT NULL CHECK (risultato IN ('V','P','S')),
  differenza_reti   INT  NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. RIVALRIES (dimension)
CREATE TABLE rivalries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tag               TEXT CHECK (tag IN ('LA SFIDA MAESTRA','DERBY D''ITALIA')),
  partite_insieme   INT NOT NULL DEFAULT 0,
  vittorie_insieme  INT NOT NULL DEFAULT 0,
  sconfitte_insieme INT NOT NULL DEFAULT 0,
  partite_contro    INT NOT NULL DEFAULT 0,
  vittorie_g1       INT NOT NULL DEFAULT 0,
  vittorie_g2       INT NOT NULL DEFAULT 0,
  totale_partite    INT NOT NULL DEFAULT 0,
  UNIQUE (player1_id, player2_id),
  CHECK  (player1_id <> player2_id)
);

-- 6. NEWS (dimension)
CREATE TABLE news (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giornata   INT  NOT NULL,
  data       DATE,
  posizione  INT,
  titolo     TEXT NOT NULL,
  corpo      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. MANIFESTO (dimension)
CREATE TABLE manifesto (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articolo        TEXT NOT NULL UNIQUE,   -- e.g. '3bis'
  nome_articolo   TEXT NOT NULL,
  corpo           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_match_details_player   ON match_details(player_id);
CREATE INDEX idx_match_details_giornata ON match_details(giornata);
CREATE INDEX idx_match_details_squadra  ON match_details(squadra);
CREATE INDEX idx_player_roles_player    ON player_roles(player_id);
CREATE INDEX idx_player_er_history_player ON player_er_history(player_id);
CREATE INDEX idx_rivalries_player1      ON rivalries(player1_id);
CREATE INDEX idx_rivalries_player2      ON rivalries(player2_id);
CREATE INDEX idx_news_giornata          ON news(giornata);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on every table
ALTER TABLE players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_er_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rivalries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE news              ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifesto         ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all tables
CREATE POLICY "Authenticated read" ON players
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON player_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON player_er_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON match_details
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON rivalries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON news
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON manifesto
  FOR SELECT TO authenticated USING (true);

-- Only admin can INSERT/UPDATE/DELETE
CREATE POLICY "Admin insert" ON players
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin update" ON players
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin delete" ON players
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin insert" ON player_roles
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin update" ON player_roles
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin delete" ON player_roles
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin insert" ON player_er_history
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin update" ON player_er_history
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin delete" ON player_er_history
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin insert" ON match_details
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin update" ON match_details
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin delete" ON match_details
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin insert" ON rivalries
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin update" ON rivalries
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin delete" ON rivalries
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin insert" ON news
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin update" ON news
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin delete" ON news
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin insert" ON manifesto
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin update" ON manifesto
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admin delete" ON manifesto
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================
-- RUNTIME VIEWS (never stored, always computed)
-- ============================================================

-- GCP ranking view
CREATE VIEW v_gcp AS
SELECT
  p.id,
  p.nome,
  COUNT(*)                                          AS presenze,
  SUM(md.gol)                                       AS gol_totali,
  SUM(md.assist)                                    AS assist_totali,
  ROUND(AVG(md.voto)::numeric, 2)                   AS media_voto,
  ROUND(
    SUM(md.gol + md.assist)::numeric /
    NULLIF(SUM(CASE WHEN md.er IS NOT NULL AND md.er > 0 THEN md.er END), 0),
    3
  )                                                  AS gcp,
  SUM(md.differenza_reti)                            AS plus_minus
FROM match_details md
JOIN players p ON p.id = md.player_id
GROUP BY p.id, p.nome;

-- Per-match trend view (for player charts)
CREATE VIEW v_player_trend AS
SELECT
  player_id,
  giornata,
  data,
  er,
  voto,
  gol,
  assist,
  risultato,
  differenza_reti
FROM match_details
ORDER BY player_id, giornata;
