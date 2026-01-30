// Subscription tier types and utilities

export type SubscriptionTier = 'free' | 'standard' | 'pro';
export type BillingPeriod = 'monthly' | 'annual';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  firstMonthDiscount: number;
  features: string[];
  assetLimit?: number;
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'standard',
    name: 'Standard',
    monthlyPrice: 4.99,
    annualPrice: 49.90,
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
    annualPrice: 99.90,
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

export function getPlanByTier(tier: SubscriptionTier): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.tier === tier);
}

export function getFirstMonthPrice(plan: SubscriptionPlan): number {
  return Number((plan.monthlyPrice * (1 - plan.firstMonthDiscount)).toFixed(2));
}

export function getMonthlyEquivalent(plan: SubscriptionPlan): number {
  return Number((plan.annualPrice / 12).toFixed(2));
}

export function getAnnualSavings(plan: SubscriptionPlan): number {
  return Number(((plan.monthlyPrice * 12) - plan.annualPrice).toFixed(2));
}

export function isProFeature(feature: 'performance' | 'oneTimeExpense'): boolean {
  return true; // All listed features are Pro-only
}
