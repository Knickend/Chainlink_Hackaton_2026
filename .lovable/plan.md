
# Fix Admin Dashboard: User Count Mismatch and Currency Conversion

## Issues Found

### 1. Total Users vs Subscription Counts
- "Total Users" = 4 (from `profiles` table)
- Subscription breakdown: 4 free + 1 standard + 3 pro = 8 (from `user_subscriptions` table)
- Root cause: 4 orphaned subscription records exist for users who no longer have profiles (deleted accounts or test data)
- **Fix**: Change the "Total Users" stat to be derived from the sum of subscription tier counts (from `get_platform_analytics`), so the numbers are always consistent. Also add a `total_users` field to the RPC function that counts distinct users in `user_subscriptions` who also have a profile.

### 2. Total Portfolio Value Currency Bug
- The SQL does `SUM(value)` across ALL assets regardless of currency
- 62.7M COP + 2.8M USD = "$65.5M" -- this is wrong
- **Fix**: Join with `price_cache` forex rates to convert non-USD values to USD before summing. Assets with no currency or USD currency use their value directly. Non-USD assets are divided by the forex rate (which represents units of foreign currency per 1 USD).

## Changes

### 1. Database Migration: Update `get_platform_analytics()`

Update the SQL function to:
- Add `total_users` count from `user_subscriptions` joined with `profiles`
- Convert asset values to USD using `price_cache` forex rates before summing
- Similarly convert debt values to USD

```text
-- Total users: only count subscriptions that have a matching profile
SELECT COUNT(*) INTO total_user_count
FROM user_subscriptions us
INNER JOIN profiles p ON us.user_id = p.user_id;

-- Portfolio value with currency conversion
SELECT COALESCE(SUM(
  CASE
    WHEN a.currency IS NULL OR a.currency = 'USD' THEN a.value
    ELSE a.value / NULLIF(pc.price, 0)
  END
), 0) INTO total_portfolio_value
FROM assets a
LEFT JOIN price_cache pc ON pc.symbol = a.currency AND pc.asset_type = 'forex';
```

### 2. Update `useAdminAnalytics.ts`

- Add `totalUsers` to the platform data interface
- Use `platform.totalUsers` for the "Total Users" stat instead of `profiles.length`

### 3. Update `AdminOverview.tsx`

- Change "Total Users" stat to use `platform.totalUsers` from the RPC function instead of `users.total`

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Update `get_platform_analytics()` with currency conversion and total users count |
| `src/hooks/useAdminAnalytics.ts` | Add `totalUsers` to platform interface and data mapping |
| `src/components/admin/AdminOverview.tsx` | Use `platform.totalUsers` for total user count |
