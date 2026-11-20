ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 10 CHECK (stock_quantity >= 0),
  ADD COLUMN IF NOT EXISTS colors text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS width_cm text NULL,
  ADD COLUMN IF NOT EXISTS dimensions text NULL;

UPDATE public.products
SET stock_quantity = CASE availability_status
  WHEN 'out_of_stock' THEN 0
  WHEN 'low_stock' THEN 3
  WHEN 'made_to_order' THEN 5
  ELSE 12
END
WHERE stock_quantity = 10;

UPDATE public.products p
SET
  colors = CASE
    WHEN c.slug = 'women' THEN ARRAY['#D993A6', '#8E3A59', '#D4B483']
    WHEN c.slug = 'men' THEN ARRAY['#1E293B', '#78350F', '#D4B483']
    ELSE ARRAY['#F5ECE3', '#C87A8D', '#A68A64']
  END,
  sizes = CASE
    WHEN c.slug = 'women' THEN ARRAY['30ml', '50ml', '100ml']
    WHEN c.slug = 'men' THEN ARRAY['50ml', '100ml', '150ml']
    ELSE ARRAY['S', 'M', 'L']
  END,
  width_cm = CASE
    WHEN c.slug = 'handmade' THEN '35 × 40 cm'
    ELSE NULL
  END
FROM public.collections c
WHERE p.collection_id = c.id
  AND array_length(p.colors, 1) IS NULL;
