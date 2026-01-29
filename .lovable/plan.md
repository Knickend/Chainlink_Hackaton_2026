

# Show Pro Version During Tutorial

## Overview

When the tutorial is active, temporarily display the Pro version of the app so new users can see all features during onboarding. Once the tutorial ends, revert to the user's actual subscription tier.

## Current Behavior

- Logged-in users start with `subscriptionTier = 'free'`
- Pro features are hidden during the tutorial
- Users don't see the full app capabilities during onboarding

## Proposed Solution

Modify the subscription tier logic in `Index.tsx` to use `'pro'` when the tutorial is active:

```typescript
// Current
const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(isDemo ? 'pro' : 'free');

// New logic
const { isActive: isTutorialActive, ... } = useTutorialContext();

// Show Pro during tutorial OR in demo mode
const effectiveSubscriptionTier = (isDemo || isTutorialActive) ? 'pro' : subscriptionTier;
const isPro = effectiveSubscriptionTier === 'pro';
const isSubscribed = effectiveSubscriptionTier !== 'free';
```

## What Users Will See During Tutorial

With this change, the tutorial will showcase:
- Portfolio History Card (instead of teaser)
- Investment Strategy Card with full recommendations
- Non-recurring expense tracking button
- Debt Payoff Calculator (instead of teaser)
- Pro badge in the header

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Use `isTutorialActive` from context to set effective subscription tier to `'pro'` during tutorial |

## Implementation Details

1. Extract `isActive` from `useTutorialContext()` (already accessing this context)
2. Create a computed `effectiveSubscriptionTier` variable that returns `'pro'` when tutorial is active
3. Update `isPro` and `isSubscribed` to use the effective tier
4. No changes needed to actual `subscriptionTier` state - it preserves user's real tier for after tutorial ends

## Expected Outcome

- First-time users see the full Pro experience during the tutorial walkthrough
- All Pro features are visible and explained in context
- After tutorial completion, app reverts to user's actual subscription tier
- Encourages upgrades by showing users what they could have

