-- ==============================================================================
-- Migration: Győri Skatemap Scheduled Events & Announcements
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create skatemap_events table
CREATE TABLE IF NOT EXISTS public.skatemap_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 60),
  message TEXT NOT NULL CHECK (char_length(message) <= 250),
  icon TEXT DEFAULT '🏆',
  link_url TEXT,
  link_text TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_skatemap_events_active_schedule 
  ON public.skatemap_events (is_active, start_at, end_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.skatemap_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies:
-- A) Public (anon) can read ONLY active events currently within the scheduled timeframe
DROP POLICY IF EXISTS "Public can view active scheduled events" ON public.skatemap_events;
CREATE POLICY "Public can view active scheduled events"
  ON public.skatemap_events FOR SELECT
  TO anon
  USING (
    is_active = true 
    AND now() >= start_at 
    AND now() <= end_at
  );

-- B) Authenticated admins have full CRUD access
DROP POLICY IF EXISTS "Admins full access on skatemap_events" ON public.skatemap_events;
CREATE POLICY "Admins full access on skatemap_events"
  ON public.skatemap_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Insert initial sample event for Győr skaters
INSERT INTO public.skatemap_events (title, message, icon, link_url, link_text, start_at, end_at, is_active)
VALUES (
  'Győri Tavaszi Skate Jam',
  'Találkozzunk a Radó-szigeten szombat délután 15:00-tól! Best trick contest, zene és jó hangulat várunk mindenkit.',
  '🏆',
  'https://www.instagram.com',
  'Részletek Instagramon',
  now() - INTERVAL '1 hour',
  now() + INTERVAL '7 days',
  true
)
ON CONFLICT DO NOTHING;
