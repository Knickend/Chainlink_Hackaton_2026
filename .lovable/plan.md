

# User Settings & Subscription Management Page

## Overview

Create a dedicated Settings page (`/settings`) where authenticated users can manage their account, view subscription status, and access billing information. The page will persist subscription data to the database and provide a clean, organized interface for all user preferences.

## Current State

| Aspect | Status |
|--------|--------|
| Subscription storage | React state only (resets on refresh) |
| User profile data | `profiles` table exists with basic fields |
| Subscription table | Mentioned in memory but not created |
| Settings page | Does not exist |

## Solution Components

### 1. Database: Create `user_subscriptions` Table

Store subscription data persistently:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References auth.users |
| `tier` | text | 'free', 'standard', 'pro' |
| `billing_period` | text | 'monthly', 'annual' |
| `status` | text | 'active', 'canceled', 'past_due' |
| `current_period_start` | timestamptz | Billing period start |
| `current_period_end` | timestamptz | Billing period end |
| `cancel_at_period_end` | boolean | Scheduled to cancel |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Updated timestamp |

RLS policies will ensure users can only read/update their own subscription.

### 2. New Settings Page (`/settings`)

Organized into sections with tabs:

```text
+----------------------------------------+
|  Settings                    [Back]    |
+----------------------------------------+
|  [Profile]  [Subscription]  [Security] |
+----------------------------------------+
|                                        |
|  Profile Section:                      |
|  - Email (read-only)                   |
|  - Account created date                |
|                                        |
|  Subscription Section:                 |
|  - Current plan badge                  |
|  - Billing period                      |
|  - Next billing date                   |
|  - [Upgrade] / [Change Plan] button    |
|  - [Cancel Subscription] link          |
|                                        |
|  Security Section:                     |
|  - 2FA toggle (moved from header)      |
|  - Password change option              |
|                                        |
+----------------------------------------+
```

### 3. Custom Hook: `useSubscription`

Centralize subscription logic:

```typescript
function useSubscription() {
  // Fetch user's subscription from database
  // Provide upgrade/downgrade functions
  // Handle cancellation
  // Return current tier, billing info, actions
}
```

### 4. Integration with Existing Code

- Update `Index.tsx` to fetch subscription tier from database instead of local state
- Add Settings link to header (gear icon)
- Move Security settings to Settings page (optional)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Settings.tsx` | Create | Main settings page with tabs |
| `src/hooks/useSubscription.ts` | Create | Subscription data management |
| `src/components/settings/ProfileSection.tsx` | Create | Profile display/edit |
| `src/components/settings/SubscriptionSection.tsx` | Create | Subscription management |
| `src/components/settings/BillingSection.tsx` | Create | Billing info and history |
| `src/App.tsx` | Modify | Add /settings route |
| `src/pages/Index.tsx` | Modify | Add Settings link, use subscription hook |
| Database migration | Create | user_subscriptions table + RLS |

## Page Layout Design

### Profile Tab
- User email (from auth)
- Member since date
- (Future: Display name, avatar)

### Subscription Tab

```text
+----------------------------------+
|  Current Plan                    |
|  +----------------------------+  |
|  | [PRO BADGE]               |  |
|  | Pro Plan - Monthly         |  |
|  | €9.99/month               |  |
|  +----------------------------+  |
|                                  |
|  Billing Period                  |
|  Jan 15, 2026 - Feb 15, 2026    |
|                                  |
|  [Change Plan]  [Cancel]        |
+----------------------------------+
```

### Security Tab
- 2FA toggle (same as current SecuritySettings)
- Password change form

## User Flow

```text
User clicks Settings icon in header
            ↓
    Navigate to /settings
            ↓
    Profile tab shown by default
            ↓
    Click "Subscription" tab
            ↓
    View current plan, billing dates
            ↓
    Click "Change Plan" → Opens SubscriptionDialog
    OR Click "Cancel" → Confirmation dialog
```

## Technical Details

### Database Migration

```sql
-- Create subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'standard', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due');

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier subscription_tier DEFAULT 'free' NOT NULL,
  billing_period TEXT DEFAULT 'monthly',
  status subscription_status DEFAULT 'active' NOT NULL,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
  ON public.user_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own subscription
CREATE POLICY "Users can insert own subscription"
  ON public.user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### useSubscription Hook Interface

```typescript
interface UseSubscriptionReturn {
  subscription: UserSubscription | null;
  tier: SubscriptionTier;
  isLoading: boolean;
  isPro: boolean;
  isSubscribed: boolean;
  billingPeriod: BillingPeriod;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  // Actions
  upgradeTo: (tier: SubscriptionTier, period: BillingPeriod) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

### Settings Page Route Protection

The settings page will redirect unauthenticated users to `/auth`:

```typescript
const { user, loading } = useAuth();

if (loading) return <LoadingSpinner />;
if (!user) {
  navigate('/auth');
  return null;
}
```

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No subscription record | Create 'free' tier on first load |
| Subscription canceled mid-period | Show "Active until [date]" message |
| User downgrades | Apply at end of billing period |
| Demo mode (not logged in) | Redirect to auth page |

## Summary

This implementation adds a proper Settings page with subscription management, persists subscription data to the database, and creates a reusable hook for subscription state throughout the app. The UI follows existing patterns (tabs, cards, dialogs) and integrates seamlessly with the current design system.

