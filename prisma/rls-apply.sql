-- Idempotent RLS + privilege script for JobRanger / Jobmatch tables.
-- Run in Supabase Dashboard → SQL Editor.
--
-- Notes:
-- - Requires tables to exist (run `npx prisma db push` first).
-- - RLS can’t restrict columns, so we also tighten UPDATE privileges on "User"
--   to prevent client-side tier updates.

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SavedJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "GeneratedLetter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "UsageEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "BillingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SecurityEvent" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. USER TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON "User";
CREATE POLICY "Users can view own profile"
  ON "User"
  FOR SELECT
  USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own profile" ON "User";
CREATE POLICY "Users can update own profile"
  ON "User"
  FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Prevent authenticated clients from updating server-managed fields like tier/role.
-- RLS cannot restrict columns, so tighten column privileges as well.
REVOKE UPDATE ON "User" FROM anon, authenticated;
GRANT UPDATE ("name", "letterGuidanceDefault", "country") ON "User" TO authenticated;

DROP POLICY IF EXISTS "Users can insert own profile" ON "User";
CREATE POLICY "Users can insert own profile"
  ON "User"
  FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- Users cannot delete profiles (admin only via service role)
-- No DELETE policy = no client-side deletes

-- ============================================
-- 3. DOCUMENT TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own documents" ON "Document";
CREATE POLICY "Users can view own documents"
  ON "Document"
  FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can insert own documents" ON "Document";
CREATE POLICY "Users can insert own documents"
  ON "Document"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update own documents" ON "Document";
CREATE POLICY "Users can update own documents"
  ON "Document"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can delete own documents" ON "Document";
CREATE POLICY "Users can delete own documents"
  ON "Document"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- ============================================
-- 4. SAVEDJOB TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own saved jobs" ON "SavedJob";
CREATE POLICY "Users can view own saved jobs"
  ON "SavedJob"
  FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can insert own saved jobs" ON "SavedJob";
CREATE POLICY "Users can insert own saved jobs"
  ON "SavedJob"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update own saved jobs" ON "SavedJob";
CREATE POLICY "Users can update own saved jobs"
  ON "SavedJob"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can delete own saved jobs" ON "SavedJob";
CREATE POLICY "Users can delete own saved jobs"
  ON "SavedJob"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- ============================================
-- 5. GENERATEDLETTER TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own letters" ON "GeneratedLetter";
CREATE POLICY "Users can view own letters"
  ON "GeneratedLetter"
  FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can insert own letters" ON "GeneratedLetter";
CREATE POLICY "Users can insert own letters"
  ON "GeneratedLetter"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update own letters" ON "GeneratedLetter";
CREATE POLICY "Users can update own letters"
  ON "GeneratedLetter"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can delete own letters" ON "GeneratedLetter";
CREATE POLICY "Users can delete own letters"
  ON "GeneratedLetter"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- ============================================
-- 6. USAGEEVENT TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own usage events" ON "UsageEvent";
CREATE POLICY "Users can view own usage events"
  ON "UsageEvent"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Intentionally no INSERT/UPDATE/DELETE policy for authenticated clients.
-- Usage events are server-managed for quota accounting integrity.

-- ============================================
-- 7. SUBSCRIPTION TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own subscription" ON "Subscription";
CREATE POLICY "Users can view own subscription"
  ON "Subscription"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- Intentionally no INSERT/UPDATE/DELETE policy for authenticated clients.
-- Subscription state is server-managed via billing webhooks.

-- ============================================
-- 8. BILLINGEVENT TABLE POLICIES
-- ============================================

-- Intentionally no policies for BillingEvent (no client access).

-- ============================================
-- 9. SECURITYEVENT TABLE POLICIES
-- ============================================

-- Intentionally no policies for SecurityEvent (no client access).
