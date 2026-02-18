
-- Fix 1: Add missing UPDATE policy for chat_memories
CREATE POLICY "Users can update their own chat memories"
ON public.chat_memories
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix 2: Create materialized views for aggregated data so monetized APIs don't need service role access to raw user data

-- Aggregated portfolio stats (for api-portfolio-summary)
CREATE MATERIALIZED VIEW public.aggregated_portfolio_stats AS
SELECT 
  category,
  COUNT(*) as asset_count,
  SUM(value) as total_value
FROM public.assets
GROUP BY category;

-- Aggregated yield stats (for api-yield-analysis)
CREATE MATERIALIZED VIEW public.aggregated_yield_stats AS
SELECT
  category,
  COUNT(*) as asset_count,
  SUM(value) as total_value,
  SUM(yield * value) as weighted_yield_sum
FROM public.assets
WHERE yield IS NOT NULL AND yield > 0
GROUP BY category;

-- Aggregated debt stats (for api-debt-strategy)
CREATE MATERIALIZED VIEW public.aggregated_debt_stats AS
SELECT
  debt_type,
  COUNT(*) as debt_count,
  AVG(interest_rate) as avg_interest_rate,
  SUM(principal_amount) as total_principal,
  SUM(monthly_payment) as total_monthly_payments
FROM public.debts
GROUP BY debt_type;

-- Grant read access to anon role
GRANT SELECT ON public.aggregated_portfolio_stats TO anon;
GRANT SELECT ON public.aggregated_yield_stats TO anon;
GRANT SELECT ON public.aggregated_debt_stats TO anon;

-- Create a function to refresh all materialized views (can be called by cron)
CREATE OR REPLACE FUNCTION public.refresh_aggregated_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.aggregated_portfolio_stats;
  REFRESH MATERIALIZED VIEW public.aggregated_yield_stats;
  REFRESH MATERIALIZED VIEW public.aggregated_debt_stats;
END;
$$;
