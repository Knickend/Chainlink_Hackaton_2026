-- Create price cache table
CREATE TABLE public.price_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  change NUMERIC,
  change_percent NUMERIC,
  price_unit TEXT,
  asset_type TEXT NOT NULL DEFAULT 'crypto',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_price_cache_symbol ON public.price_cache(symbol);
CREATE INDEX idx_price_cache_updated_at ON public.price_cache(updated_at);

-- Enable RLS but allow public read access (prices are public data)
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price cache"
ON public.price_cache
FOR SELECT
USING (true);

-- Only service role can insert/update (edge functions)
CREATE POLICY "Service role can manage price cache"
ON public.price_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');