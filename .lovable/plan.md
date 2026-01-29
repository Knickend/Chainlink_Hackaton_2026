

# Add Two-Factor Authentication (2FA) Security

## Overview

Implement TOTP-based Two-Factor Authentication using authenticator apps (Google Authenticator, Authy, etc.). This provides an additional security layer beyond email/password by requiring users to enter a time-based code from their mobile device.

## How It Works

1. **User enables 2FA** in their security settings
2. **QR code is displayed** that they scan with an authenticator app
3. **User verifies** by entering the 6-digit code from the app
4. **On future logins**, after entering password, they must also enter the current 2FA code

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/security/TwoFactorSetup.tsx` | Dialog for enrolling in 2FA with QR code display |
| `src/components/security/TwoFactorVerify.tsx` | OTP input form for verifying 2FA during login |
| `src/components/security/SecuritySettings.tsx` | Security settings panel with 2FA toggle |

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add MFA-related functions (enroll, unenroll, verify, check status) |
| `src/pages/Auth.tsx` | Handle MFA challenge during login flow |
| `src/pages/Index.tsx` | Add security settings button in header |

## Implementation Details

### 1. Update AuthContext with MFA Functions

Add the following capabilities to the auth context:

```typescript
interface AuthContextType {
  // Existing...
  
  // MFA functions
  enrollMFA: () => Promise<{ qrCode: string; secret: string; factorId: string } | null>;
  verifyMFAEnrollment: (factorId: string, code: string) => Promise<{ error: Error | null }>;
  unenrollMFA: (factorId: string) => Promise<{ error: Error | null }>;
  verifyMFA: (code: string) => Promise<{ error: Error | null }>;
  getMFAStatus: () => Promise<{ enabled: boolean; factorId?: string }>;
  requiresMFA: boolean;
}
```

Key implementation patterns:
- Use `supabase.auth.mfa.enroll()` to generate QR code and secret
- Use `supabase.auth.mfa.verify()` to complete enrollment
- Check `session.user.factors` to determine MFA status
- Use `supabase.auth.mfa.challenge()` and `verify()` for login verification

### 2. Two-Factor Setup Component

A dialog that guides users through enabling 2FA:
- Display QR code generated from Supabase MFA enroll
- Show backup codes for recovery (stored securely)
- OTP input using the existing `input-otp` component for verification
- Confirmation step before finalizing

### 3. Two-Factor Verify Component

Used during login when MFA is enabled:
- Clean 6-digit OTP input
- "Remember this device" option (optional enhancement)
- Error handling for invalid codes
- Link to recovery options

### 4. Security Settings Panel

Add to the main app header or as a dropdown menu option:
- Toggle to enable/disable 2FA
- Shows current 2FA status (enabled/disabled)
- Option to regenerate backup codes
- Button to view enrolled authenticator

### 5. Updated Login Flow

```text
User enters email/password
         ↓
    Credentials valid?
    ↓ No → Show error
    ↓ Yes
         ↓
    MFA enabled for user?
    ↓ No → Redirect to app
    ↓ Yes
         ↓
    Show 2FA verification screen
         ↓
    Code valid?
    ↓ No → Show error, retry
    ↓ Yes → Redirect to app
```

## User Experience

**Enabling 2FA:**
1. User clicks "Security" or gear icon in app header
2. Clicks "Enable Two-Factor Authentication"
3. Scans QR code with authenticator app
4. Enters 6-digit code to confirm setup
5. Sees success message with backup codes

**Signing in with 2FA:**
1. User enters email and password as normal
2. After password verification, 2FA screen appears
3. User enters 6-digit code from authenticator app
4. Successfully logged in

## Technical Considerations

- Supabase MFA uses TOTP (Time-based One-Time Password) standard
- QR codes are generated server-side by Supabase
- Factor enrollment is tied to the user's account
- The `input-otp` component is already installed and will be used for code entry
- Proper error handling for expired/invalid codes

