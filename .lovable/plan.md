

## Fix: Unclickable Tutorial Modal + Duplicate Confirmation Emails

### Bug 1: Tutorial Welcome Modal Buttons Not Clickable

**Root Cause**: When a new user logs in for the first time, two overlapping modals appear simultaneously:
1. The `TermsAgreementDialog` (uses AlertDialog with `z-50`)
2. The Tutorial `WelcomeModal` (uses `z-[100]`)

The WelcomeModal renders visually on top (higher z-index), but the TermsAgreementDialog's overlay still captures pointer events underneath, making the WelcomeModal buttons unresponsive.

**Fix**: Prevent the tutorial from starting until the Terms dialog has been accepted. In `IndexContent`, gate the tutorial rendering behind `!showTermsDialog`:
- Only render `<WelcomeModal />`, `<CompletionModal />`, and `<TutorialOverlay />` when `showTermsDialog` is `false`.
- Alternatively, delay the tutorial auto-start in `useTutorial.ts` by accepting a `disabled` flag that prevents activation while Terms are pending.

**File to modify**: `src/pages/Index.tsx` (lines ~192-199)
- Wrap tutorial components in a conditional: render only when `showTermsDialog` is `false`.

---

### Bug 2: Two Confirmation Emails Sent on Signup

**Root Cause**: The `signUp` function in `AuthContext.tsx` does two things:
1. Calls `supabase.auth.signUp()` which triggers Supabase's built-in confirmation email (the plain "InControl-app / Confirm your signup" email).
2. Then explicitly calls the `send-confirmation-email` edge function to send a branded email via Resend (the styled green "InControl / Confirm your InControl account" email).

The code even has a comment acknowledging this: *"Supabase sends its own confirmation email by default."*

**Fix**: Remove the custom edge function call from the `signUp` method in `AuthContext.tsx`. Instead, customize the built-in Supabase email template so only one branded email is sent.

Alternatively (recommended): Disable the default Supabase confirmation email by configuring the auth settings, and keep only the custom Resend-powered email. This is done by updating `supabase/config.toml` to disable the default mailer -- however, since `config.toml` is auto-managed, the better approach is:

**Recommended approach**: Remove the custom edge function invocation from `AuthContext.tsx` (lines ~96-112) so only Supabase's built-in email is sent. Then customize the Supabase email template via the auth config to match the InControl branding.

**File to modify**: `src/contexts/AuthContext.tsx`
- Remove or comment out the block that calls `supabase.functions.invoke('send-confirmation-email', ...)` inside the `signUp` function.

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Conditionally render tutorial components only when Terms dialog is not showing |
| `src/contexts/AuthContext.tsx` | Remove the duplicate `send-confirmation-email` edge function call from `signUp` |

### Technical Details

**Index.tsx change** (around line 196):
```tsx
{/* Tutorial Components - only show after terms accepted */}
{!showTermsDialog && (
  <>
    <WelcomeModal />
    <CompletionModal />
    <TutorialOverlay />
  </>
)}
```

**AuthContext.tsx change**: Remove lines 96-112 (the entire block that invokes `send-confirmation-email` after signup). The built-in Supabase email will handle confirmation.

