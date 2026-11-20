ALTER TABLE public.homepage_banners
  DROP CONSTRAINT IF EXISTS homepage_banners_placement_check;

ALTER TABLE public.homepage_banners
  ADD CONSTRAINT homepage_banners_placement_check
  CHECK (placement = ANY (ARRAY['hero'::text, 'promo'::text, 'offer'::text, 'video_ad'::text]));

ALTER TABLE public.homepage_banners
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
