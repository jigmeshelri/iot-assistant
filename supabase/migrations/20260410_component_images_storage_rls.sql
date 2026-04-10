-- Storage RLS for the component-images bucket.
-- Path convention: {user_id}/{component_id}/{filename}
-- Only the owner (user whose id matches the first folder) can read/write their files.
--
-- Context: TECHNICAL_SPEC documented these policies but they were never applied
-- to the remote database, causing every upload from #25's image-persistence
-- feature to fail with "new row violates row-level security policy".

CREATE POLICY "component_images_owner_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'component-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "component_images_owner_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'component-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "component_images_owner_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'component-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'component-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "component_images_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'component-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
