-- PostgreSQL 14+ provides gen_random_uuid() natively.
-- citext gives case-insensitive email/slug comparison without lower() everywhere.
CREATE EXTENSION IF NOT EXISTS citext;

-- Shared trigger for maintaining updated_at.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
