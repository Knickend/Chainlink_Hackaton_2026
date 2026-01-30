

# Complete Subscription Tier Restructuring

## Overview

This plan consolidates all pricing changes discussed:
1. Change currency from USD ($) to EUR (€)
2. Add 50% first-month discount for monthly plans
3. Add annual billing option with ~17% discount (2 months free)
4. Limit Standard tier to 30 assets (from "Unlimited")
5. Remove 30-day money-back guarantee

## Final Pricing Structure

| Tier | Monthly | Annual | Savings |
|------|---------|--------|---------|
| Free | €0 | - | - |
| Standard | €4.99/mo (first month €2.50) | €49.90/year (€4.16/mo) | 2 months free |
| Pro | €9.99/mo (first month €5.00) | €99.90/year (€8.33/mo) | 2 months free |

**Note**: First-month 50% discount applies only to monthly billing; annual plans already have the 2-months-free discount.

## Feature Limits by Tier

| Feature | Free | Standard | Pro |
|---------|------|----------|-----|
| Assets | Up to 10 | Up to 30 | Unlimited |
| Real-time prices | Basic | Yes | Yes |
| Income/Expense | No | Yes | Yes |
| Allocation charts | No | Yes | Yes |
| Performance tracking | No | No | Yes |
| Debt calculator | No | No | Yes |
| Investment strategy | No | No | Yes |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/subscription.ts` | Add billing period types, annual pricing, currency, discounts |
| `src/components/landing/PricingSection.tsx` | EUR, billing toggle, discount badges, remove money-back |
| `src/components/SubscriptionDialog.tsx` | EUR, billing toggle, discount display |

## Implementation Details

### 1. `src/lib/subscription.ts` - Central Configuration

Add new types and update the plan structure:

```typescript
export type SubscriptionTier = 'free' | 'standard' | 'pro';
export type BillingPeriod = 'monthly' | 'annual';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  annualPrice: number;          // Total annual price (10 months worth)
  currency: string;             // 'EUR'
  firstMonthDiscount: number;   // 0.50 = 50% off first month (monthly only)
  features: string[];
  assetLimit?: number;          // undefined = unlimited
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'standard',
    name: 'Standard',
    monthlyPrice: 4.99,
    annualPrice: 49.90,         // 10 months (2 free)
    currency: 'EUR',
    firstMonthDiscount: 0.50,
    assetLimit: 30,
    features: [
      'Up to 30 assets',
      'Real-time price updates',
      'Income & expense tracking',
      'Asset allocation charts',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 9.99,
    annualPrice: 99.90,         // 10 months (2 free)
    currency: 'EUR',
    firstMonthDiscount: 0.50,
    isPopular: true,
    features: [
      'Unlimited asset tracking',
      'Everything in Standard',
      'Monthly performance tracking',
      'YTD overview & analytics',
      'Non-recurring expense tracking',
      'Debt payoff calculator',
      'Investment strategy advisor',
      'Priority support',
      'Early access to features',
    ],
  },
];

// Helper functions
export function getFirstMonthPrice(plan: SubscriptionPlan): number {
  return plan.monthlyPrice * (1 - plan.firstMonthDiscount);
}

export function getMonthlyEquivalent(plan: SubscriptionPlan): number {
  return Number((plan.annualPrice / 12).toFixed(2));
}

export function getAnnualSavings(plan: SubscriptionPlan): number {
  return (plan.monthlyPrice * 12) - plan.annualPrice;
}
```

### 2. `src/components/landing/PricingSection.tsx` - Landing Page

Key changes:
- Add monthly/annual billing toggle
- Update all prices to EUR (€)
- Show "50% OFF FIRST MONTH" badge on monthly plans
- Show "2 MONTHS FREE" badge on annual plans
- Remove money-back guarantee, keep "Cancel anytime • No hidden fees"
- Update Standard features to show "Up to 30 assets"

```text
Layout with billing toggle:

        [ Monthly ]  [ Annual - Save 17% ]
                         ↑ toggle

+------------+  +----------------+  +------------+
|   FREE     |  |   STANDARD     |  |    PRO     |
|            |  | 50% OFF 1ST MO |  |  POPULAR   |
|    €0      |  |                |  | 50% OFF    |
|            |  |    €4.99/mo    |  |            |
| 10 assets  |  |  First: €2.50  |  |  €9.99/mo  |
|            |  |   30 assets    |  | First: €5  |
+------------+  +----------------+  +------------+

When "Annual" is selected:

+------------+  +----------------+  +------------+
|   FREE     |  |   STANDARD     |  |    PRO     |
|            |  |  2 MONTHS FREE |  |  POPULAR   |
|    €0      |  |                |  | 2 MO FREE  |
|            |  |   €49.90/yr    |  |            |
| 10 assets  |  |  (€4.16/mo)    |  | €99.90/yr  |
|            |  |   30 assets    |  | (€8.33/mo) |
+------------+  +----------------+  +------------+
```

Footer update:
```
Before: "30-day money-back guarantee • Cancel anytime • No hidden fees"
After:  "Cancel anytime • No hidden fees"
```

### 3. `src/components/SubscriptionDialog.tsx` - In-App Upgrade

Key changes:
- Add billing period toggle (Monthly / Annual)
- Update all prices to EUR (€)
- Show appropriate discount based on billing period
- Update payment summary to show price breakdown

```text
Pricing step with billing toggle:

   Choose Your Plan
   
   [ Monthly ]  [ Annual ]
   
   +------------------+  +------------------+
   | STANDARD         |  | PRO      POPULAR |
   | 50% OFF 1ST MO   |  | 50% OFF 1ST MO   |
   |                  |  |                  |
   | €4.99/mo         |  | €9.99/mo         |
   | First mo: €2.50  |  | First mo: €5.00  |
   +------------------+  +------------------+

Payment step shows:

+--------------------------------+
| 🛡 Standard Monthly            |
|                                |
| First month: €2.50 (50% off)   |
| Then: €4.99/month              |
|                                |
| Total today: €2.50             |
+--------------------------------+

OR for annual:

+--------------------------------+
| 🛡 Standard Annual             |
|                                |
| €49.90/year (€4.16/mo)         |
| Save €9.98 (2 months free)     |
|                                |
| Total today: €49.90            |
+--------------------------------+
```

## Data Model Considerations

The `user_subscriptions` table may need a `billing_period` column to track whether users are on monthly or annual plans. This would be needed when implementing real payment processing with Stripe.

```sql
-- Future consideration (not part of this change)
ALTER TABLE user_subscriptions 
ADD COLUMN billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual'));
```

For now, since payment is still a mock UI, we'll track the billing period in component state.

## Summary of All Changes

| Change | Location |
|--------|----------|
| Currency USD → EUR | All 3 files |
| Standard: 30 asset limit | subscription.ts, PricingSection.tsx |
| 50% first month (monthly only) | All 3 files |
| 17% annual discount (2 mo free) | All 3 files |
| Billing period toggle | PricingSection.tsx, SubscriptionDialog.tsx |
| Remove money-back guarantee | PricingSection.tsx |

