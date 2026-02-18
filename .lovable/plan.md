

# Fix Subscription Tier Counts to Match Total Users

## Problem
The `get_platform_analytics()` function counts `total_users` using a JOIN with `profiles` (correctly getting 4), but the individual tier counts (`subscription_free`, `subscription_standard`, `subscription_pro`) query `user_subscriptions` without that JOIN, so they include orphaned records (4+1+3=8).

## Fix

### Database Migration: Update `get_platform_analytics()`

Change the three tier count queries to also JOIN with `profiles`:

```text
-- Before (broken):
SELECT COUNT(*) INTO sub_free FROM user_subscriptions WHERE tier = 'free';

-- After (fixed):
SELECT COUNT(*) INTO sub_free
FROM user_subscriptions us
INNER JOIN profiles p ON us.user_id = p.user_id
WHERE us.tier = 'free';
```

Same pattern for `sub_standard` and `sub_pro`.

No frontend changes needed -- the data will simply be correct now.

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Update tier count queries in `get_platform_analytics()` to JOIN with profiles |

