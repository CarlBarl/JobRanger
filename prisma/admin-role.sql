-- Promote an existing app user to ADMIN role.
-- Replace the email in the WHERE clause before running.

UPDATE "User"
SET "role" = 'ADMIN'
WHERE "email" = 'replace-with-admin-email@example.com';
