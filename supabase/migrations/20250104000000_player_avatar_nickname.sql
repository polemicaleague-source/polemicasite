-- Add soprannome and avatar_url columns to players
ALTER TABLE players ADD COLUMN soprannome text;
ALTER TABLE players ADD COLUMN avatar_url text;

-- Create storage bucket for player avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read avatars
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

-- Allow authenticated (admin) to upload/update/delete avatars
CREATE POLICY "Admin upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Admin update avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Admin delete avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
