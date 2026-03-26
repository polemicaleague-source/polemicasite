-- Add expected_rating column to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS expected_rating NUMERIC;

-- Function to recalculate expected_rating for given players (or all if empty array)
CREATE OR REPLACE FUNCTION recalc_expected_rating(p_ids uuid[] DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE players p
  SET expected_rating = sub.expected
  FROM (
    SELECT
      pl.id,
      CASE
        WHEN pl.base_rating IS NULL THEN NULL
        WHEN cnt = 0 THEN NULL
        ELSE ROUND((0.8 * pl.base_rating + 0.2 * weighted_avg)::numeric, 2)
      END AS expected
    FROM players pl
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(voto * peso) / NULLIF(SUM(peso), 0), NULL) AS weighted_avg,
        COUNT(*) AS cnt
      FROM (
        SELECT
          voto,
          ROW_NUMBER() OVER (ORDER BY giornata ASC) AS peso
        FROM (
          SELECT voto, giornata
          FROM match_details md
          WHERE md.player_id = pl.id AND md.voto IS NOT NULL
          ORDER BY giornata DESC
          LIMIT 6
        ) last6
      ) weighted
    ) w ON true
    WHERE CASE WHEN array_length(p_ids, 1) IS NOT NULL THEN pl.id = ANY(p_ids) ELSE true END
  ) sub
  WHERE p.id = sub.id;
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION recalc_expected_rating(uuid[]) TO anon, authenticated;

-- Backfill: calculate for all existing players
SELECT recalc_expected_rating();
