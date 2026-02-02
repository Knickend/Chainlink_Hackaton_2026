-- Drop the existing CHECK constraint on income type
ALTER TABLE public.income DROP CONSTRAINT IF EXISTS income_type_check;

-- Add updated CHECK constraint including 'other'
ALTER TABLE public.income ADD CONSTRAINT income_type_check 
CHECK (type IN ('work', 'passive', 'investment', 'mining', 'other'));