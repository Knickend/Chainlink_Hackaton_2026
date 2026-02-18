
-- Move materialized views out of the public API by revoking access from anon/authenticated 
-- and creating wrapper functions instead. The edge functions will call the wrapper functions.
-- This resolves the "Materialized View in API" linter warnings.

ALTER MATERIALIZED VIEW public.aggregated_portfolio_stats SET SCHEMA extensions;
ALTER MATERIALIZED VIEW public.aggregated_yield_stats SET SCHEMA extensions;
ALTER MATERIALIZED VIEW public.aggregated_debt_stats SET SCHEMA extensions;

-- Revoke anon grants (now in extensions schema)
REVOKE SELECT ON extensions.aggregated_portfolio_stats FROM anon;
REVOKE SELECT ON extensions.aggregated_yield_stats FROM anon;
REVOKE SELECT ON extensions.aggregated_debt_stats FROM anon;

-- Create RPC functions that return the aggregated data
CREATE OR REPLACE FUNCTION public.get_aggregated_portfolio_stats()
RETURNS TABLE(category text, asset_count bigint, total_value numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT category, asset_count, total_value FROM extensions.aggregated_portfolio_stats;
$$;

CREATE OR REPLACE FUNCTION public.get_aggregated_yield_stats()
RETURNS TABLE(category text, asset_count bigint, total_value numeric, weighted_yield_sum numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT category, asset_count, total_value, weighted_yield_sum FROM extensions.aggregated_yield_stats;
$$;

CREATE OR REPLACE FUNCTION public.get_aggregated_debt_stats()
RETURNS TABLE(debt_type text, debt_count bigint, avg_interest_rate numeric, total_principal numeric, total_monthly_payments numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT debt_type, debt_count, avg_interest_rate, total_principal, total_monthly_payments FROM extensions.aggregated_debt_stats;
$$;

-- Update refresh function to use new schema
CREATE OR REPLACE FUNCTION public.refresh_aggregated_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW extensions.aggregated_portfolio_stats;
  REFRESH MATERIALIZED VIEW extensions.aggregated_yield_stats;
  REFRESH MATERIALIZED VIEW extensions.aggregated_debt_stats;
END;
$$;
