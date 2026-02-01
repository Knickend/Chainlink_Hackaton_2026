

# Add Mandatory Terms Agreement Dialog

## Overview

Implement a mandatory Terms of Service agreement modal that appears when authenticated users first access the app. Users must accept the terms before they can use any features. This leverages the existing database columns (`agreed_to_tos`, `agreed_to_tos_at` in the profiles table) and the `acceptTerms` function.

## User Experience Flow

```text
User logs in
     |
     v
+------------------+
| Has agreed to    |-----> YES ----> Normal app access
| Terms of Service?|
+------------------+
     |
     NO
     v
+----------------------------------+
|      Terms Agreement Dialog      |
|  ____________________________    |
| |                            |   |
| |  [Terms summary + link]    |   |
| |____________________________|   |
|                                  |
|  [ ] I agree to the Terms of    |
|      Service and Privacy Policy  |
|                                  |
|      [Accept & Continue]         |
|           (disabled until        |
|            checkbox checked)     |
+----------------------------------+
     |
     v
Agreement saved to database
     |
     v
Normal app access
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/TermsAgreementDialog.tsx` | Modal component for terms acceptance |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Add TermsAgreementDialog that blocks access until terms accepted |

## Implementation Details

### TermsAgreementDialog Component

A modal dialog that:
- Cannot be dismissed without accepting (no close button, no backdrop click to close)
- Displays a summary of key terms (especially the "Not Financial Advice" disclaimer)
- Links to full Terms of Service and Privacy Policy pages
- Includes a required checkbox: "I agree to the Terms of Service and Privacy Policy"
- Has an "Accept & Continue" button that is disabled until the checkbox is checked
- Calls `acceptTerms()` from useSubscription hook when submitted
- Shows loading state during submission

### Index.tsx Integration

- Import the useSubscription hook's `hasAgreedToTos` and `acceptTerms`
- Show the TermsAgreementDialog when user is authenticated AND `hasAgreedToTos` is false
- The dialog blocks all interaction with the app until accepted

## Technical Details

### Database (Already Exists)

The profiles table already has:
- `agreed_to_tos` (boolean, default false)
- `agreed_to_tos_at` (timestamp, nullable)

### Existing Functions to Use

From `useSubscription` hook:
- `hasAgreedToTos`: boolean indicating if user has agreed
- `acceptTerms()`: async function that updates the profile with agreement

### Component Structure

```typescript
// TermsAgreementDialog.tsx
interface TermsAgreementDialogProps {
  open: boolean;
  onAccept: () => Promise<void>;
}
```

The dialog will:
1. Use Dialog component from shadcn/ui
2. Set `modal={true}` to prevent interaction with background
3. Not include a close button in the header
4. Include a prominent disclaimer about "Not Financial Advice"
5. Link to /terms and /privacy pages in new tabs
6. Use Checkbox component for the agreement
7. Disable the accept button until checkbox is checked
8. Show loading spinner during acceptance

### Visual Design

- Glass-card styling consistent with app design
- Warning/amber styling for the financial advice disclaimer (matching Terms page)
- Primary button for acceptance
- Clear typography hierarchy

## Edge Cases Handled

1. **Loading state**: Don't show dialog until we know ToS status (wait for isLoading to complete)
2. **Already agreed**: Dialog never appears for users who have already agreed
3. **Demo mode**: Dialog should NOT appear for demo/unauthenticated users (they don't have profiles)
4. **Accept failure**: Show toast error and keep dialog open if save fails

