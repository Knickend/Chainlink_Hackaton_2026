

## Portfolio Rebalancer (Pro Only)

### What You'll Get

A rebalancing system that compares your **actual** portfolio allocation (from real asset values) against your **target** allocation (from your Investment Strategy preferences). When the drift exceeds your chosen threshold, you'll see a notification with specific trade suggestions to get back on track.

### User Experience

**In the Investment Preferences dialog** (the "Edit" button on Investment Strategy):
- New "Rebalance Settings" section at the bottom with:
  - Drift threshold slider (5%, 10%, 15%, 20%) -- how far off before you get notified
  - Check frequency selector (Daily, Weekly, Monthly)

**On the dashboard** (below the Investment Strategy card):
- A **Rebalance Card** appears when any category drifts beyond your threshold
- Shows side-by-side comparison: target % vs actual % per category
- Color-coded drift indicators (green = on track, amber = drifting, red = over threshold)
- Specific suggestions like "Consider selling ~$500 of Crypto and buying ~$500 of Stocks"
- Dismiss button to clear the alert until next check

**Persistent alerts** via a background job that checks drift on your chosen schedule and stores alerts so they survive page refreshes.

### Pro Gating

The rebalancer will only appear for Pro users. Non-Pro users will not see the rebalance card or settings. This follows the existing pattern where `InvestmentStrategyCard` itself is already Pro-gated in `Index.tsx`.

---

### Technical Details

**Database Migration -- 2 changes:**

1. Add columns to `user_investment_preferences`:
   - `rebalance_threshold` (integer, default 10, not null)
   - `rebalance_frequency` (text, default 'weekly', not null)
   - `last_rebalance_check` (timestamptz, nullable)

2. Create `rebalance_alerts` table:
   - `id` (uuid, PK, default gen_random_uuid())
   - `user_id` (uuid, not null, references auth.users on delete cascade)
   - `created_at` (timestamptz, default now())
   - `drift_data` (jsonb, not null) -- array of `{category, target, actual, diff}`
   - `max_drift` (numeric, not null) -- largest absolute drift for quick filtering
   - `is_dismissed` (boolean, default false)
   - RLS: users can only SELECT, UPDATE, DELETE their own alerts

**New Files:**

| File | Purpose |
|------|---------|
| `src/hooks/useRebalancer.ts` | Computes actual vs target drift from assets + preferences. Maps asset categories to allocation categories (crypto -> Crypto, stocks -> Stocks/ETFs, commodities -> Commodities, banking+realestate -> Emergency Fund/Cash). Returns drift array, whether threshold exceeded, and trade suggestions. Also fetches/dismisses `rebalance_alerts`. |
| `src/components/RebalanceCard.tsx` | Visual card showing target vs actual bars, drift percentages, and trade suggestions. Includes dismiss button. Only rendered when drift exceeds threshold or an undismissed alert exists. |
| `supabase/functions/check-rebalance/index.ts` | Scheduled edge function: queries users with rebalance settings, computes drift from their assets, inserts `rebalance_alerts` when threshold exceeded and respecting frequency. Triggered by pg_cron. |

**Modified Files:**

| File | Change |
|------|---------|
| `src/hooks/useInvestmentPreferences.ts` | Add `rebalance_threshold` and `rebalance_frequency` to the `InvestmentPreferences` interface and `savePreferences` function. |
| `src/components/InvestmentPreferencesDialog.tsx` | Add "Rebalance Settings" section with threshold slider (5-20%, step 5) and frequency dropdown (daily/weekly/monthly). |
| `src/components/InvestmentStrategyCard.tsx` | Import and render `RebalanceCard` below the allocations section, passing assets and preferences. |
| `src/pages/Index.tsx` | Pass `assets` prop to `InvestmentStrategyCard` so it can compute actual allocation percentages. |

**Drift Calculation (in `useRebalancer`):**

```text
categoryMap:
  crypto assets     -> "Crypto" target
  stocks assets     -> "Stocks/ETFs" target
  commodities assets -> "Commodities" target
  banking assets    -> "Emergency Fund" target (cash reserve proxy)

For each mapped category:
  actual_pct = (category_total_value / total_portfolio_value) * 100
  target_pct = user's preference percentage
  drift = actual_pct - target_pct
  
Threshold exceeded = any |drift| > rebalance_threshold
```

**Trade Suggestions:**

```text
overweight:  "Consider selling ~$X of [Category]"
underweight: "Consider buying ~$X of [Category]"
where $X = |drift_pct / 100| * total_portfolio_value
```

**Background Job (check-rebalance edge function):**

- Uses service_role to query all users with investment preferences
- For each user: fetches assets, computes category totals in USD, compares against targets
- If max drift > threshold AND no undismissed alert exists AND last check respects frequency: inserts new `rebalance_alerts` row
- Scheduled via pg_cron (runs daily; the function itself filters by each user's chosen frequency)

