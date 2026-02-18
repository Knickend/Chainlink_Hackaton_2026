

# Improve Admin Dashboard: Subscription Breakdown and Agent Wallet Stats

## Summary
Add two new data points to the admin dashboard overview:
1. **Users per subscription tier** (Free / Standard / Pro) with counts
2. **Users with an agentic wallet** count

## Approach

All new data will be added to the existing `get_platform_analytics` SECURITY DEFINER function so no individual user data is exposed via the API. The frontend will consume the new fields and render them in the existing "User & Platform Analytics" section of the Overview tab.

### 1. Database Migration: Extend `get_platform_analytics()`

Add to the returned JSONB object:
- `subscription_free`: count of users on `free` tier
- `subscription_standard`: count of users on `standard` tier  
- `subscription_pro`: count of users on `pro` tier
- `agent_wallet_count`: count of rows in `agent_wallets` (users who have generated a wallet)

```text
SELECT COUNT(*) FROM user_subscriptions WHERE tier = 'free'
SELECT COUNT(*) FROM user_subscriptions WHERE tier = 'standard'
SELECT COUNT(*) FROM user_subscriptions WHERE tier = 'pro'
SELECT COUNT(*) FROM agent_wallets
```

### 2. Update `useAdminAnalytics.ts`

- Extend the `platformData` type to include the four new fields
- Pass them through to the `AdminAnalytics.platform` object
- Add to the `AdminAnalytics` interface: `subscriptionFree`, `subscriptionStandard`, `subscriptionPro`, `agentWalletCount`

### 3. Update `AdminOverview.tsx`

Add new stat cards to the "User & Platform Analytics" section:
- **Free Users** (Users icon, primary color)
- **Standard Users** (CreditCard icon, warning color)
- **Pro Users** (Crown/Star icon, success color)
- **Agent Wallets** (Wallet icon, primary color)

These will render alongside the existing Total Portfolio Value and Total Tracked Debt cards in the same grid.

### 4. Update `types.ts`

The Supabase types file will auto-update after the migration. No manual edit needed.

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Extend `get_platform_analytics()` with subscription + wallet counts |
| `src/hooks/useAdminAnalytics.ts` | Add new fields to interface and data flow |
| `src/components/admin/AdminOverview.tsx` | Add 4 new stat cards |

