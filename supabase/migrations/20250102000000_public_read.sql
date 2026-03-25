-- Allow anonymous (non-authenticated) users to read public tables
-- The anon role is used by unauthenticated requests via PostgREST

CREATE POLICY "Public read" ON players
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public read" ON player_roles
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public read" ON player_er_history
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public read" ON match_details
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public read" ON rivalries
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public read" ON news
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public read" ON manifesto
  FOR SELECT TO anon USING (true);
