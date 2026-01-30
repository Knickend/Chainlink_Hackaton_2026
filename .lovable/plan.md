

# Secure Admin Analytics: Aggregate-Only Access

## Overview

This plan implements a secure database function that provides **only aggregated financial data** to administrators, completely eliminating access to individual user portfolio details. Instead of allowing admins to query raw `assets` and `debts` tables, we'll create a dedicated function that returns platform-wide totals and statistics.

## Current Security Issue

**Problem**: The current RLS policies on `assets` and `debts` tables allow admin users to run `SELECT` queries that expose individual user financial holdings:
- Investment values, quantities, and yields per user
- Debt amounts, interest rates, and payment schedules per user

**Risk**: If an admin account is compromised, attackers could view all customer investment portfolios and use this for targeted attacks or competitive intelligence.

## Solution: Aggregate-Only Analytics Function

### What Changes

1. **Remove** the direct admin `SELECT` policies from `assets` and `debts` tables
2. **Create** a new `SECURITY DEFINER` database function `get_platform_analytics()` that:
   - Verifies the caller is an admin
   - Returns only aggregate totals (sum of all portfolio values, sum of all debt)
   - Returns user activity counts (active users based on updated timestamps)
   - Never exposes individual user data

3. **Update** the frontend `useAdminAnalytics` hook to:
   - Call the new database function instead of querying tables directly
   - Continue displaying the same aggregated statistics in the admin dashboard

### Data Flow Comparison

**Before (vulnerable):**
```text
Admin Dashboard --> Supabase Client --> assets table (all rows visible)
                                    --> debts table (all rows visible)
```

**After (secure):**
```text
Admin Dashboard --> Supabase Client --> get_platform_analytics() function
                                            |
                                            +--> Internally aggregates assets (SUM only)
                                            +--> Internally aggregates debts (SUM only)
                                            +--> Returns only totals, no individual data
```

## Implementation Steps

### Step 1: Database Migration

Create a new database function and update RLS policies:

```sql
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
```

### Step 2: Update Frontend Hook

Modify `src/hooks/useAdminAnalytics.ts` to:

1. Remove direct queries to `assets` and `debts` tables
2. Add a new query that calls the `get_platform_analytics()` database function
3. Extract `total_portfolio_value`, `total_tracked_debt`, and `active_users` from the function response
4. Continue computing user activity from the assets' `updated_at` timestamps via the function

### Step 3: Update Security Finding

Mark the `assets_admin_access_financial_data` security finding as resolved since individual portfolio data is no longer accessible.

## What Admins Can Still See

| Data | Still Visible | Removed |
|------|--------------|---------|
| Total Platform Portfolio Value | Yes | - |
| Total Platform Debt | Yes | - |
| Active User Count | Yes | - |
| Individual User Assets | - | Yes |
| Individual User Debt Details | - | Yes |
| User Investment Strategies | - | Yes |

## Technical Details

### Database Function Security

- Uses `SECURITY DEFINER` to run with elevated privileges internally
- Explicitly checks `has_role(auth.uid(), 'admin')` before executing
- Uses `SET search_path = public` to prevent search path attacks
- Returns `jsonb` containing only aggregated values

### Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/[new].sql` | Add function, drop old RLS policies |
| `src/hooks/useAdminAnalytics.ts` | Call new function instead of table queries |

### RLS Policy Changes

**Removed:**
- `"Admins can view all assets for analytics"` on `assets` table
- `"Admins can view all debts for analytics"` on `debts` table

**Result:** Admin users can no longer run arbitrary `SELECT` queries on these tables. They can only access pre-defined aggregates through the secure function.

