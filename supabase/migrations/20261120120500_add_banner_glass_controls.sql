-- Add dashboard-controlled transparent glassy blur effect settings to homepage_banners
-- and allow video/mp4 + video/webm banner uploads (up to 50 MB) in boutique-media bucket.

begin;

alter table public.homepage_banners
  add column if not exists glass_enabled boolean not null default true,
  add column if not exists glass_blur_px integer not null default 12 check (glass_blur_px between 0 and 40),
  add column if not exists glass_opacity integer not null default 35 check (glass_opacity between 0 and 90);

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm'
  ]
where id = 'boutique-media';

commit;
