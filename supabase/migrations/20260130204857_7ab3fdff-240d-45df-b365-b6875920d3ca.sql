-- Create the aggregate-only analytics function
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_portfolio_value numeric;
  total_debt numeric;
  active_user_count integer;
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get aggregated portfolio value (no individual data exposed)
  SELECT COALESCE(SUM(value), 0) INTO total_portfolio_value FROM assets;
  
  -- Get aggregated debt total
  SELECT COALESCE(SUM(principal_amount), 0) INTO total_debt FROM debts;
  
  -- Count active users (assets updated in last 30 days)
  SELECT COUNT(DISTINCT user_id) INTO active_user_count
  FROM assets
  WHERE updated_at >= NOW() - INTERVAL '30 days';

  -- Return aggregated data only
  result := jsonb_build_object(
    'total_portfolio_value', total_portfolio_value,
    'total_tracked_debt', total_debt,
    'active_users', active_user_count
  );
  
  RETURN result;
END;
$$;

-- Drop the existing admin SELECT policies (security improvement)
DROP POLICY IF EXISTS "Admins can view all assets for analytics" ON assets;
DROP POLICY IF EXISTS "Admins can view all debts for analytics" ON debts;