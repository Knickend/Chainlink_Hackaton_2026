-- Add currency column to assets table for supporting non-USD stocks
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Update existing Colombian stocks to COP (based on their symbols)
UPDATE public.assets 
SET currency = 'COP' 
WHERE category = 'stocks' 
  AND symbol IN ('CELSIA', 'PEI', 'MSA', 'MNSAF')
  AND (currency IS NULL OR currency = 'USD');

-- Ensure all other stocks default to USD
UPDATE public.assets 
SET currency = 'USD' 
WHERE category = 'stocks' AND (currency IS NULL OR currency = '');