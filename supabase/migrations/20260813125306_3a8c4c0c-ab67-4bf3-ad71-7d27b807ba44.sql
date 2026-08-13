DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

CREATE POLICY "Authenticated read avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');