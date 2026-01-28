
# Investment Strategy Advisor (Pro Feature)

## Overview
Create a Pro-only feature that generates personalized monthly investment allocation recommendations based on the user's free monthly income and their risk/preference profile for different asset classes.

## User Experience Flow

1. **Access Point**: New card in the dashboard (visible only to Pro users) with a "Create Strategy" button
2. **Preference Setup**: Dialog/form where users set their allocation preferences (sliders or percentages for stocks, ETFs, crypto, commodities)
3. **Strategy Display**: Shows monthly dollar amounts to invest in each category based on preferences and available income

## Technical Implementation

### 1. Database Schema
Create a `user_investment_preferences` table to persist user preferences:
- `user_id` (UUID, references auth.users)
- `stocks_allocation` (numeric, 0-100)
- `crypto_allocation` (numeric, 0-100)
- `commodities_allocation` (numeric, 0-100)
- `emergency_fund_target` (numeric, optional - percentage to keep as cash)
- RLS policies for user-owned data access

### 2. New Hook: `useInvestmentPreferences`
- Fetch/save user allocation preferences
- Calculate recommended amounts based on `adjustedMonthlyNet`
- Handle validation (allocations sum to 100%)

### 3. New Components

**InvestmentStrategyCard** (Dashboard card)
- Shows current strategy summary if preferences are set
- Displays monthly allocation amounts for each category
- "Edit Preferences" button to modify allocations

**InvestmentPreferencesDialog**
- Sliders for each asset category (Stocks/ETFs, Crypto, Commodities)
- Visual pie chart preview of allocation
- Validation that percentages sum to 100%
- Option to set an emergency fund percentage (kept as cash)

### 4. Strategy Calculation Logic
```
freeIncome = totalIncome - totalExpenses - monthlyDebtPayments
investableAmount = freeIncome * (1 - emergencyFundPercentage)

stocksAmount = investableAmount * (stocksAllocation / 100)
cryptoAmount = investableAmount * (cryptoAllocation / 100)
commoditiesAmount = investableAmount * (commoditiesAllocation / 100)
```

### 5. Dashboard Integration
- Add `InvestmentStrategyCard` below the Charts Row, gated by `isPro`
- Pass `adjustedMonthlyNet` and `formatValue` to the component

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/..._investment_preferences.sql` | Create | New table with RLS policies |
| `src/hooks/useInvestmentPreferences.ts` | Create | Data fetching and strategy calculations |
| `src/components/InvestmentStrategyCard.tsx` | Create | Dashboard card showing the strategy |
| `src/components/InvestmentPreferencesDialog.tsx` | Create | Preferences setup form with sliders |
| `src/lib/types.ts` | Modify | Add `InvestmentPreferences` interface |
| `src/lib/subscription.ts` | Modify | Add feature to Pro plan features list |
| `src/pages/Index.tsx` | Modify | Import and render strategy card for Pro users |

## UI Mockup (Strategy Card)

```text
+------------------------------------------+
|  Investment Strategy         [Edit]       |
|  Based on $X,XXX/mo free income          |
+------------------------------------------+
|                                          |
|  [====] Stocks/ETFs     $XXX  (40%)     |
|  [===]  Crypto          $XXX  (30%)     |
|  [==]   Commodities     $XXX  (20%)     |
|  [=]    Emergency Fund  $XXX  (10%)     |
|                                          |
|  Total Investable: $X,XXX/month         |
+------------------------------------------+
```

## Edge Cases Handled
- **Negative free income**: Show warning that debt/expenses exceed income
- **No preferences set**: Prompt to set up allocation preferences
- **Preferences don't sum to 100%**: Validation error in dialog
- **Zero free income**: Suggest reviewing expenses before investing
