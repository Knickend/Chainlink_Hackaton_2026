-- Add monthly_debt_payments column to portfolio_snapshots for accurate historical Net Cash Flow
ALTER TABLE public.portfolio_snapshots 
ADD COLUMN IF NOT EXISTS monthly_debt_payments numeric DEFAULT 0 NOT NULL;