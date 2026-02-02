-- Add cost basis columns to assets table
ALTER TABLE public.assets 
ADD COLUMN cost_basis numeric,
ADD COLUMN purchase_date date,
ADD COLUMN purchase_price_per_unit numeric;

-- Create asset_transactions table for tracking buys/sells
CREATE TABLE public.asset_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  symbol text NOT NULL,
  asset_name text NOT NULL,
  category text NOT NULL,
  quantity numeric NOT NULL,
  price_per_unit numeric NOT NULL,
  total_value numeric NOT NULL,
  realized_pnl numeric,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.asset_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions"
ON public.asset_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update their own transactions"
ON public.asset_transactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete their own transactions"
ON public.asset_transactions
FOR DELETE
USING (auth.uid() = user_id);