-- Store user preferences (theme, fontSize) as JSON text
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings TEXT;
