
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  total_portfolio_value numeric;
  total_debt numeric;
  active_user_count integer;
  sub_free integer;
  sub_standard integer;
  sub_pro integer;
  wallet_count integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COALESCE(SUM(value), 0) INTO total_portfolio_value FROM assets;
  SELECT COALESCE(SUM(principal_amount), 0) INTO total_debt FROM debts;
  SELECT COUNT(DISTINCT user_id) INTO active_user_count FROM assets WHERE updated_at >= NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO sub_free FROM user_subscriptions WHERE tier = 'free';
  SELECT COUNT(*) INTO sub_standard FROM user_subscriptions WHERE tier = 'standard';
  SELECT COUNT(*) INTO sub_pro FROM user_subscriptions WHERE tier = 'pro';
  SELECT COUNT(*) INTO wallet_count FROM agent_wallets;

  result := jsonb_build_object(
    'total_portfolio_value', total_portfolio_value,
    'total_tracked_debt', total_debt,
    'active_users', active_user_count,
    'subscription_free', sub_free,
    'subscription_standard', sub_standard,
    'subscription_pro', sub_pro,
    'agent_wallet_count', wallet_count
  );

  RETURN result;
END;
$function$;
