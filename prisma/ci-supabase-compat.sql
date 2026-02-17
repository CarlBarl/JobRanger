-- CI-only: minimal Supabase compatibility layer so RLS policies can be exercised
-- against a plain Postgres instance (no Supabase services).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  -- Login role used by integration tests (not superuser) so RLS is actually enforced.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

-- Allow app_user to assume anon/authenticated for RLS simulation.
GRANT anon TO app_user;
GRANT authenticated TO app_user;

CREATE SCHEMA IF NOT EXISTS auth;

-- Supabase exposes auth.uid() which reads from the JWT claim `sub`.
-- We simulate that via `request.jwt.claim.sub` GUC (same key Supabase uses).
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, app_user;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, app_user;

GRANT USAGE ON SCHEMA public TO anon, authenticated, app_user;

-- In Supabase, table privileges are granted broadly and RLS does the restricting.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

