-- Drop the existing check constraint
ALTER TABLE public.income DROP CONSTRAINT IF EXISTS income_type_check;

-- Add updated check constraint with 'mining' included
ALTER TABLE public.income ADD CONSTRAINT income_type_check 
  CHECK (type IN ('work', 'passive', 'investment', 'mining'));