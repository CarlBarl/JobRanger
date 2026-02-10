-- ============================================
-- SUPABASE STORAGE RLS POLICIES FOR DOCUMENTS BUCKET
-- ============================================
-- Run this in Supabase Dashboard -> SQL Editor.
--
-- These policies allow authenticated users to access only files
-- inside their own folder in the "documents" bucket:
--   <auth.uid()>/<filename>
-- ============================================
-- Note: In Supabase, storage.objects typically has RLS enabled already.
-- Enabling RLS here can fail for non-owner DB roles ("must be owner of table objects"),
-- so this script manages policies only.

-- Cleanup so this script can be re-run safely.
DROP POLICY IF EXISTS "Users can view own documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents in storage" ON storage.objects;

-- Read only own files
CREATE POLICY "Users can view own documents in storage"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upload only into own folder
CREATE POLICY "Users can upload own documents in storage"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update only own files
CREATE POLICY "Users can update own documents in storage"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete only own files
CREATE POLICY "Users can delete own documents in storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
