

# Fix: Pro Features Not Unlocking After Upgrade

## Problem Analysis

After upgrading to Pro via Settings > Subscription, the dashboard (Index page) still shows the free tier features. The network requests confirm the database was updated correctly to `tier: "pro"`.

**Root Cause**: The Index page uses local React state for subscription tier:

```typescript
// Index.tsx line 57
const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(isDemo ? 'pro' : 'free');
```

This state:
- Initializes to `'free'` for logged-in users
- Never syncs with the database
- Resets on page navigation or refresh

The Settings page correctly uses `useSubscription` hook which reads from the database, but Index doesn't.

## Solution

Replace the local `subscriptionTier` state in `Index.tsx` with the `useSubscription` hook that reads from the database.

## File to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Use `useSubscription` hook instead of local state |

## Technical Changes

### Remove local state and import hook

```typescript
// Remove this:
const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(isDemo ? 'pro' : 'free');

// Add this import:
import { useSubscription } from '@/hooks/useSubscription';

// Add hook usage:
const { tier: subscriptionTier, isPro: subscriptionIsPro, isSubscribed: subscriptionIsSubscribed, upgradeTo } = useSubscription();
```

### Update the effective tier logic

```typescript
// Before:
const effectiveSubscriptionTier = (isDemo || isTutorialActive) ? 'pro' : subscriptionTier;
const isPro = effectiveSubscriptionTier === 'pro';
const isSubscribed = effectiveSubscriptionTier !== 'free';

// After:
const effectiveSubscriptionTier = (isDemo || isTutorialActive) ? 'pro' : subscriptionTier;
const isPro = (isDemo || isTutorialActive) ? true : subscriptionIsPro;
const isSubscribed = (isDemo || isTutorialActive) ? true : subscriptionIsSubscribed;
```

### Update SubscriptionDialog callback

```typescript
// Before:
onSubscribe={(tier) => setSubscriptionTier(tier)}

// After:
onSubscribe={(tier, billingPeriod) => upgradeTo(tier, billingPeriod || 'monthly')}
```

## Data Flow After Fix

```text
User upgrades in Settings
        ↓
useSubscription.upgradeTo() updates database
        ↓
Returns to Index page
        ↓
useSubscription fetches tier from database
        ↓
tier === 'pro' → Pro features unlocked
```

## Summary

The fix ensures the Index page reads the subscription tier from the database via `useSubscription` hook, so changes made in Settings are reflected immediately when returning to the dashboard.

