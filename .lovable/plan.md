
# Add Password Reset via Email

## Overview

Implement password reset functionality that allows users to request a password reset link via email and set a new password when they click the link. This uses the built-in Supabase Auth password reset feature.

## User Flow

1. User clicks "Forgot password?" on the login screen
2. User enters their email address
3. System sends a password reset email with a secure link
4. User clicks the link and is redirected to the app
5. User enters and confirms their new password
6. Password is updated and user can sign in

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/auth/ForgotPasswordForm.tsx` | Email input form for requesting password reset |
| `src/components/auth/ResetPasswordForm.tsx` | New password input form after clicking reset link |

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `resetPassword` and `updatePassword` functions |
| `src/pages/Auth.tsx` | Add "Forgot password?" link and handle reset flow states |

## Implementation Details

### 1. Update AuthContext (AuthContext.tsx)

Add two new functions to the auth context:

```typescript
interface AuthContextType {
  // Existing...
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}
```

**Reset Password Function:**
- Uses `supabase.auth.resetPasswordForEmail()` with redirect URL pointing to `/auth?mode=reset`
- Sends an email with a secure reset link

**Update Password Function:**
- Uses `supabase.auth.updateUser({ password })` to set the new password
- Works when user has clicked the reset link (session is established)

### 2. Forgot Password Form Component

A simple form that:
- Accepts email address input with validation
- Shows loading state while sending
- Displays success message after email is sent
- Includes "Back to sign in" link

### 3. Reset Password Form Component

Form displayed when user clicks the email link:
- Two password fields (new password + confirmation)
- Password strength requirements (minimum 6 characters)
- Validation that passwords match
- Success state redirects to app

### 4. Update Auth Page (Auth.tsx)

Add state management for the password reset flow:

```text
Normal login/signup form
         ↓
  Click "Forgot password?"
         ↓
  Show ForgotPasswordForm
         ↓
  Email sent → Show success message
         
---

User clicks email link (arrives at /auth?mode=reset)
         ↓
  Detect PASSWORD_RECOVERY event
         ↓
  Show ResetPasswordForm
         ↓
  Password updated → Redirect to /app
```

**URL Parameters:**
- `?mode=reset` - Detected when user arrives from reset email link
- Supabase automatically establishes a session from the link token

**Auth State Detection:**
- Listen for `PASSWORD_RECOVERY` event in `onAuthStateChange`
- When detected, show the reset password form

### 5. UI Integration on Auth Page

Add a "Forgot password?" link below the password field:

```tsx
<button
  type="button"
  onClick={() => setShowForgotPassword(true)}
  className="text-sm text-primary hover:text-primary/80"
>
  Forgot password?
</button>
```

## Technical Notes

- Supabase handles email delivery and secure token generation
- Reset links expire after a configurable time (default: 1 hour)
- The redirect URL must be configured in the backend auth settings (already set up for this project)
- No additional edge functions or email services required - Supabase Auth handles everything

## Security Considerations

- Password validation using Zod (minimum 6 characters)
- Confirmation field ensures user enters password correctly
- Reset tokens are single-use and time-limited
- No sensitive information exposed in success/error messages
