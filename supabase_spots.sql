-- ==============================================================================
-- Migration: Győri Skatemap Spots Table & Row Level Security (RLS)
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create spots table
CREATE TABLE IF NOT EXISTS public.spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
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
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_title_length_check;
ALTER TABLE public.spots ADD CONSTRAINT spots_title_length_check CHECK (char_length(title) <= 100);
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_description_length_check;
ALTER TABLE public.spots ADD CONSTRAINT spots_description_length_check CHECK (description IS NULL OR char_length(description) <= 1000);

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

-- A) Anyone can view approved spots (and pending spots during insertion/verification)
DROP POLICY IF EXISTS "Allow public to read approved spots" ON public.spots;
DROP POLICY IF EXISTS "Allow public to read spots" ON public.spots;
CREATE POLICY "Allow public to read spots"
  ON public.spots FOR SELECT
  USING (true);

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

-- 6. Insert initial Győr spots into cloud database
INSERT INTO public.spots (id, title, description, spot_type, features, latitude, longitude, images, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Radó-sziget Skatepark',
    'Győr egyik legnépszerűbb skateparkja a Radó-szigeten. Beton elemek, quarter pipe, funbox és flat rail a Rába partján.',
    'skatepark',
    '["rail", "ledge", "gap"]'::jsonb,
    47.6892,
    17.6294,
    '["https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    'approved'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Barátság Park Skatepark',
    'Marcalvárosi beton skatepark, miniramp, ledgek és lépcsők. Street és park stílushoz is kiváló.',
    'skatepark',
    '["ledge", "gap", "stairs"]'::jsonb,
    47.6695,
    17.6438,
    '["https://images.unsplash.com/photo-1564982752979-3f7bc974d29a?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    'approved'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Dunakapu tér Street Spot',
    'Tágas belvárosi tér a Mosoni-Duna partján, sima gránit burkolat, padkák és lépcsők. Csak este ajánlott, amikor nincs tömeg.',
    'street_spot',
    '["ledge", "gap", "flatground", "stairs"]'::jsonb,
    47.6908,
    17.6342,
    '["https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    'approved'
  )
ON CONFLICT (id) DO NOTHING;
