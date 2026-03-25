-- Allow anonymous users to read the aggregate views via PostgREST
GRANT SELECT ON v_gcp TO anon;
GRANT SELECT ON v_gcp TO authenticated;
GRANT SELECT ON v_player_trend TO anon;
GRANT SELECT ON v_player_trend TO authenticated;
