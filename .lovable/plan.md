

# Terms of Service & Privacy Policy Implementation

## Overview

Implement a comprehensive legal compliance system that:
1. Creates Terms of Service and Privacy Policy pages
2. Links them from the footer
3. Adds consent messaging to the pricing section
4. Requires mandatory checkbox agreement before paid subscription checkout
5. Tracks user consent in the database to block subscription upgrades without agreement

## Database Schema

Add a new column to the `profiles` table to track ToS acceptance:

```sql
ALTER TABLE profiles 
ADD COLUMN agreed_to_tos boolean DEFAULT false,
ADD COLUMN agreed_to_tos_at timestamp with time zone;
```

| Column | Type | Purpose |
|--------|------|---------|
| `agreed_to_tos` | boolean | Whether user has accepted Terms |
| `agreed_to_tos_at` | timestamp | When they accepted (for audit trail) |

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Terms.tsx` | Terms of Service page with all 11 sections |
| `src/pages/Privacy.tsx` | Privacy Policy page |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add routes for `/terms` and `/privacy` |
| `src/components/landing/Footer.tsx` | Link to `/terms` and `/privacy` using React Router |
| `src/components/landing/PricingSection.tsx` | Add "By subscribing, you agree to Terms" text |
| `src/components/SubscriptionDialog.tsx` | Add mandatory ToS checkbox before payment |
| `src/hooks/useSubscription.ts` | Add `hasAgreedToTos` state and update methods |

## Implementation Details

### 1. Terms Page (`src/pages/Terms.tsx`)

A well-formatted legal page containing all 11 sections from the provided content:

- **Header**: InControl logo + Back to Home button
- **Critical sections highlighted**: Sections 3 (Not Financial Advice) and 4 (Limitation of Liability) in alert boxes with warning styling
- **Consistent styling**: Uses prose classes for readability

```text
+--------------------------------------------------+
| [InControl]                       [← Back Home]  |
+--------------------------------------------------+
|  Terms of Service - InControl.finance            |
|  Effective: January 30, 2026                     |
|                                                  |
|  1. Acceptance of Terms                          |
|  2. Service Description                          |
|  ┌──────────────────────────────────────────┐   |
|  │ ⚠️ 3. NOT FINANCIAL ADVICE               │   | <- Alert box
|  │ InControl.finance IS NOT a financial...  │   |
|  └──────────────────────────────────────────┘   |
|  ┌──────────────────────────────────────────┐   |
|  │ 4. Limitation of Liability               │   | <- Muted alert box
|  │ To the fullest extent permitted by EU... │   |
|  └──────────────────────────────────────────┘   |
|  5-11. Other sections...                         |
+--------------------------------------------------+
```

### 2. Privacy Policy Page (`src/pages/Privacy.tsx`)

A placeholder privacy policy page with:
- Data collection practices
- Cookie usage (if applicable)
- User rights under GDPR
- Contact information

### 3. Footer Updates

Replace placeholder `#` hrefs with React Router Links:

```tsx
import { Link } from 'react-router-dom';

<Link to="/privacy" className="...">Privacy Policy</Link>
<Link to="/terms" className="...">Terms of Service</Link>
```

### 4. Pricing Section Update

Add consent text below the "Cancel anytime" footer:

```tsx
<p className="text-center text-sm text-muted-foreground mt-4">
  By subscribing, you agree to our{' '}
  <Link to="/terms" className="underline hover:text-foreground">
    Terms of Service
  </Link>
</p>
```

### 5. Subscription Dialog Checkbox

Add a mandatory checkbox in the payment step that must be checked before proceeding:

```tsx
// State
const [agreedToTerms, setAgreedToTerms] = useState(false);

// UI (before Pay button)
<div className="flex items-start gap-2">
  <Checkbox 
    id="terms" 
    checked={agreedToTerms}
    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
  />
  <label htmlFor="terms" className="text-xs text-muted-foreground">
    I agree to the{' '}
    <Link to="/terms" target="_blank" className="underline">
      Terms of Service
    </Link>
    {' '}and confirm this is not financial advice
  </label>
</div>

// Button disabled state
<Button
  onClick={handlePayment}
  disabled={isProcessing || !agreedToTerms}
>
  ...
</Button>
```

### 6. Database & Hook Updates

**useSubscription.ts** modifications:

1. Add `hasAgreedToTos` to the return type
2. Fetch from `profiles` table on load
3. Add `acceptTerms()` method to update database when checkbox is checked
4. Block `upgradeTo()` if terms not accepted (fallback safety)

```tsx
// Additional return values
hasAgreedToTos: boolean;
acceptTerms: () => Promise<void>;

// In upgradeTo() - add safety check
const upgradeTo = async (tier, period) => {
  if (!hasAgreedToTos) {
    toast({
      title: 'Terms Required',
      description: 'Please accept the Terms of Service first',
      variant: 'destructive',
    });
    return;
  }
  // ... existing logic
};
```

## User Flow

```text
User Journey:
1. User visits landing page
2. Sees pricing section with "By subscribing, you agree to Terms" text
3. Clicks "Start Standard" or "Go Pro"
4. Redirected to auth (signup/login)
5. After login, opens Subscription dialog
6. Selects plan and clicks "Continue to Payment"
7. On payment step, sees mandatory checkbox:
   ☐ I agree to the Terms of Service and confirm this is not financial advice
8. Must check box before "Pay" button is enabled
9. On first successful payment, `agreed_to_tos` is set to true in database
10. Future upgrades/changes don't require re-checking (already agreed)
```

## Visual Summary

| Location | Element Added |
|----------|--------------|
| Footer | Links to `/terms` and `/privacy` |
| Pricing cards | "By subscribing, you agree to Terms" text |
| SubscriptionDialog (payment step) | Checkbox with Terms link |
| Database | `agreed_to_tos` column on profiles |

## Migration SQL

```sql
-- Add ToS tracking columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS agreed_to_tos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS agreed_to_tos_at timestamp with time zone;
```

