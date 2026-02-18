
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  total_portfolio_val numeric;
  total_debt_val numeric;
  active_user_count integer;
  total_user_count integer;
  sub_free integer;
  sub_standard integer;
  sub_pro integer;
  wallet_count integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Total users: only count subscriptions that have a matching profile
  SELECT COUNT(DISTINCT us.user_id) INTO total_user_count
  FROM user_subscriptions us
  INNER JOIN profiles p ON us.user_id = p.user_id;

  -- Portfolio value with currency conversion to USD
  SELECT COALESCE(SUM(
    CASE
      WHEN a.currency IS NULL OR a.currency = 'USD' THEN a.value
      ELSE a.value / NULLIF(pc.price, 0)
    END
  ), 0) INTO total_portfolio_val
  FROM assets a
  LEFT JOIN price_cache pc ON pc.symbol = a.currency AND pc.asset_type = 'forex';

  -- Debt value with currency conversion to USD
  SELECT COALESCE(SUM(
    CASE
      WHEN d.currency IS NULL OR d.currency = 'USD' THEN d.principal_amount
      ELSE d.principal_amount / NULLIF(pc.price, 0)
    END
  ), 0) INTO total_debt_val
  FROM debts d
  LEFT JOIN price_cache pc ON pc.symbol = d.currency AND pc.asset_type = 'forex';

  SELECT COUNT(DISTINCT user_id) INTO active_user_count FROM assets WHERE updated_at >= NOW() - INTERVAL '30 days';

  SELECT COUNT(*) INTO sub_free FROM user_subscriptions WHERE tier = 'free';
  SELECT COUNT(*) INTO sub_standard FROM user_subscriptions WHERE tier = 'standard';
  SELECT COUNT(*) INTO sub_pro FROM user_subscriptions WHERE tier = 'pro';
  SELECT COUNT(*) INTO wallet_count FROM agent_wallets;

  result := jsonb_build_object(
    'total_portfolio_value', total_portfolio_val,
    'total_tracked_debt', total_debt_val,
    'active_users', active_user_count,
    'total_users', total_user_count,
    'subscription_free', sub_free,
    'subscription_standard', sub_standard,
    'subscription_pro', sub_pro,
    'agent_wallet_count', wallet_count
  );

  RETURN result;
END;
$function$;
