
-- Fix 1: Add auth checks to aggregated stats functions
CREATE OR REPLACE FUNCTION public.get_aggregated_portfolio_stats()
 RETURNS TABLE(category text, asset_count bigint, total_value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  RETURN QUERY SELECT s.category, s.asset_count, s.total_value FROM extensions.aggregated_portfolio_stats s;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_aggregated_yield_stats()
 RETURNS TABLE(category text, asset_count bigint, total_value numeric, weighted_yield_sum numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  RETURN QUERY SELECT s.category, s.asset_count, s.total_value, s.weighted_yield_sum FROM extensions.aggregated_yield_stats s;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_aggregated_debt_stats()
 RETURNS TABLE(debt_type text, debt_count bigint, avg_interest_rate numeric, total_principal numeric, total_monthly_payments numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  RETURN QUERY SELECT s.debt_type, s.debt_count, s.avg_interest_rate, s.total_principal, s.total_monthly_payments FROM extensions.aggregated_debt_stats s;
END;
$function$;

-- Restrict refresh to service role or admin
CREATE OR REPLACE FUNCTION public.refresh_aggregated_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  REFRESH MATERIALIZED VIEW extensions.aggregated_portfolio_stats;
  REFRESH MATERIALIZED VIEW extensions.aggregated_yield_stats;
  REFRESH MATERIALIZED VIEW extensions.aggregated_debt_stats;
END;
$function$;

-- Fix 2: Replace anonymous price_cache read with authenticated-only
DROP POLICY IF EXISTS "Anyone can read price cache" ON price_cache;
CREATE POLICY "Authenticated users can read price cache"
  ON price_cache FOR SELECT
  TO authenticated
  USING (true);
