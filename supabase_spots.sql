-- ==============================================================================
-- Migration: Győri Skatemap Spots Table & Row Level Security (RLS)
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create spots table
CREATE TABLE IF NOT EXISTS public.spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  spot_type TEXT NOT NULL DEFAULT 'street_spot',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for existing tables:
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS spot_type TEXT NOT NULL DEFAULT 'street_spot';
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_spots_updated_at ON public.spots;
CREATE TRIGGER set_spots_updated_at
BEFORE UPDATE ON public.spots
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies:

-- A) Anyone (including anonymous users) can view approved spots on the public map
DROP POLICY IF EXISTS "Allow public to read approved spots" ON public.spots;
CREATE POLICY "Allow public to read approved spots"
  ON public.spots FOR SELECT
  USING (status = 'approved');

-- B) Anonymous users can submit new spots ONLY with status = 'pending'
-- This prevents attackers from spoofing a POST request with status = 'approved'
DROP POLICY IF EXISTS "Allow public to insert pending spots" ON public.spots;
CREATE POLICY "Allow public to insert pending spots"
  ON public.spots FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending'
  );

-- C) Authenticated admins have full access (view all including pending, approve, edit, delete)
DROP POLICY IF EXISTS "Allow admins full access" ON public.spots;
CREATE POLICY "Allow admins full access"
  ON public.spots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Create storage bucket for spot images (optional if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-images', 'spot-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Public read access
DROP POLICY IF EXISTS "Public read spot-images" ON storage.objects;
CREATE POLICY "Public read spot-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'spot-images');

-- Storage policies: Anonymous upload to spot-images
DROP POLICY IF EXISTS "Anonymous upload spot-images" ON storage.objects;
CREATE POLICY "Anonymous upload spot-images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'spot-images');

-- Storage policies: Authenticated manage spot-images
DROP POLICY IF EXISTS "Admins manage spot-images" ON storage.objects;
CREATE POLICY "Admins manage spot-images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'spot-images')
  WITH CHECK (bucket_id = 'spot-images');
