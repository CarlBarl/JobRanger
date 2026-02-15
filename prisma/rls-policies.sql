-- ============================================
-- ROW LEVEL SECURITY POLICIES FOR JOBMATCH
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
--
-- Your Prisma server-side queries will still work
-- because the postgres role bypasses RLS.
-- These policies block direct client-side access.
-- ============================================

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedLetter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageEvent" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. USER TABLE POLICIES
-- ============================================

-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON "User"
  FOR SELECT
  USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON "User"
  FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Users can insert their own profile (for initial creation)
CREATE POLICY "Users can insert own profile"
  ON "User"
  FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- Users cannot delete profiles (admin only via service role)
-- No DELETE policy = no client-side deletes

-- ============================================
-- 3. DOCUMENT TABLE POLICIES
-- ============================================

-- Users can only view their own documents
CREATE POLICY "Users can view own documents"
  ON "Document"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents"
  ON "Document"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
  ON "Document"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
  ON "Document"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- ============================================
-- 4. SAVEDJOB TABLE POLICIES
-- ============================================

-- Users can only view their own saved jobs
CREATE POLICY "Users can view own saved jobs"
  ON "SavedJob"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Users can insert their own saved jobs
CREATE POLICY "Users can insert own saved jobs"
  ON "SavedJob"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own saved jobs
CREATE POLICY "Users can update own saved jobs"
  ON "SavedJob"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Users can delete their own saved jobs
CREATE POLICY "Users can delete own saved jobs"
  ON "SavedJob"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- ============================================
-- 5. GENERATEDLETTER TABLE POLICIES
-- ============================================

-- Users can only view their own letters
CREATE POLICY "Users can view own letters"
  ON "GeneratedLetter"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Users can insert their own letters
CREATE POLICY "Users can insert own letters"
  ON "GeneratedLetter"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own letters
CREATE POLICY "Users can update own letters"
  ON "GeneratedLetter"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Users can delete their own letters
CREATE POLICY "Users can delete own letters"
  ON "GeneratedLetter"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- ============================================
-- 6. USAGEEVENT TABLE POLICIES
-- ============================================

-- Allow users to read only their own usage events
DROP POLICY IF EXISTS "Users can view own usage events" ON "UsageEvent";
CREATE POLICY "Users can view own usage events"
  ON "UsageEvent"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Intentionally no INSERT/UPDATE/DELETE policy for authenticated clients.
-- Usage events are server-managed for quota accounting integrity.

-- ============================================
-- 7. VERIFY RLS IS ENABLED
-- ============================================

-- Run this to verify RLS status:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public';

-- ============================================
-- NOTES:
-- ============================================
-- - auth.uid() returns the Supabase Auth user ID
-- - Your User.id must match auth.uid() for policies to work
-- - Service role key bypasses all RLS (for admin operations)
-- - Prisma with postgres connection bypasses RLS (server-side)
-- - Anon key respects RLS (client-side protection)
