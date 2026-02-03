-- Add 'realestate' to the assets category check constraint
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_category_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_category_check 
  CHECK (category IN ('banking', 'crypto', 'stocks', 'commodities', 'metals', 'realestate'));