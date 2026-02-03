-- Add fund flow tracking columns to asset_transactions
ALTER TABLE public.asset_transactions
ADD COLUMN fund_flow_mode text DEFAULT 'none',
ADD COLUMN source_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
ADD COLUMN source_label text,
ADD COLUMN source_currency text,
ADD COLUMN source_amount numeric,
ADD COLUMN destination_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
ADD COLUMN destination_label text,
ADD COLUMN destination_currency text,
ADD COLUMN destination_amount numeric,
ADD COLUMN exchange_rate numeric;

-- Add index for efficient lookups
CREATE INDEX idx_asset_transactions_source_asset ON public.asset_transactions(source_asset_id) WHERE source_asset_id IS NOT NULL;
CREATE INDEX idx_asset_transactions_destination_asset ON public.asset_transactions(destination_asset_id) WHERE destination_asset_id IS NOT NULL;