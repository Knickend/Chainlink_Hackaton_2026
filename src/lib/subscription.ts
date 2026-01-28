// Subscription tier types and utilities

export type SubscriptionTier = 'free' | 'standard' | 'pro';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  features: string[];
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'standard',
    name: 'Standard',
    price: 4.99,
    features: [
      'Unlimited asset tracking',
      'Real-time price updates',
      'Income & expense tracking',
      'Asset allocation charts',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 9.99,
    isPopular: true,
    features: [
      'Everything in Standard',
      'Monthly performance tracking',
      'YTD overview & analytics',
      'One-time expense tracking',
      'Priority support',
      'Early access to features',
    ],
  },
];

export function getPlanByTier(tier: SubscriptionTier): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.tier === tier);
}

export function isProFeature(feature: 'performance' | 'oneTimeExpense'): boolean {
  return true; // All listed features are Pro-only
}
