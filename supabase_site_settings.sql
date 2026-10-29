-- ==============================================================================
-- Migration: Site Settings Table for Lockdown & Global Configuration
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create site_settings table (key-value store for global toggles)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT 'false',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies:

-- A) Anyone can read site settings (needed for lockdown check on public pages)
DROP POLICY IF EXISTS "Allow public to read site_settings" ON public.site_settings;
CREATE POLICY "Allow public to read site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- B) Only authenticated admins can modify settings
DROP POLICY IF EXISTS "Allow admins to manage site_settings" ON public.site_settings;
CREATE POLICY "Allow admins to manage site_settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Insert default lockdown setting (off by default)
INSERT INTO public.site_settings (key, value, updated_at)
VALUES ('spot_submission_lockdown', 'false', now())
ON CONFLICT (key) DO NOTHING;

-- 5. Enable Realtime updates (so changes sync immediately across all open browsers)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
