-- ==============================================================================
-- Migration: Győri Skatemap Spots Reporting & Anti-Spam Security
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Mezők hozzáadása a spots táblához
ALTER TABLE public.spots
ADD COLUMN IF NOT EXISTS is_reported BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS report_reason TEXT,
ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;

-- 2. Index a bejelentett spotok gyors lekérdezéséhez az admin felületen
CREATE INDEX IF NOT EXISTS idx_spots_is_reported ON public.spots(is_reported) WHERE is_reported = true;

-- 3. Biztonságos RPC függvény anonim bejelentéshez (SECURITY DEFINER)
-- Ez megakadályozza, hogy az anonim felhasználóknak közvetlen UPDATE jogot kelljen adni a táblára.
CREATE OR REPLACE FUNCTION public.report_spot(p_spot_id TEXT, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_reported BOOLEAN;
  v_trimmed_reason TEXT;
BEGIN
  v_trimmed_reason := trim(p_reason);
  
  -- Validáció: legalább 5 karakteres indoklás
  IF length(v_trimmed_reason) < 5 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Az indoklásnak legalább 5 karakterből kell állnia.');
  END IF;

  -- Spot létezésének és állapotának ellenőrzése
  SELECT is_reported INTO v_already_reported
  FROM public.spots
  WHERE id::text = p_spot_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'A megadott spot nem található vagy nem jóváhagyott.');
  END IF;

  -- Ha már be van jelentve, sikeresnek tekintjük, de nem terheljük a szervert és nem írjuk felül
  IF v_already_reported IS TRUE THEN
    RETURN jsonb_build_object('success', true, 'alreadyReported', true);
  END IF;

  -- Bejelentés rögzítése
  UPDATE public.spots
  SET 
    is_reported = true,
    report_reason = v_trimmed_reason,
    reported_at = NOW()
  WHERE id::text = p_spot_id;

  RETURN jsonb_build_object('success', true, 'alreadyReported', false);
END;
$$;

-- Függvény futtatási jog megadása az anonim és hitelesített felhasználóknak
GRANT EXECUTE ON FUNCTION public.report_spot(TEXT, TEXT) TO anon, authenticated;
