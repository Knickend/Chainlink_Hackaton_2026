
# Add Password Visibility Toggle

## Overview
Add an eye icon button to password fields that allows users to toggle between showing and hiding their password. This is a common UX pattern that helps users verify what they've typed without making mistakes.

## What Will Be Built

- A clickable eye icon on the right side of password fields
- When clicked, the password becomes visible (shows actual characters)
- The icon changes from "eye" (hidden) to "eye-off" (visible) to indicate the current state
- Works consistently across all authentication forms

## Files to Update

| File | Password Fields |
|------|-----------------|
| `src/pages/Auth.tsx` | Login/Signup password |
| `src/components/auth/ResetPasswordForm.tsx` | New password + Confirm password |
| `src/pages/AdminLogin.tsx` | Admin login password |

## Implementation Approach

### Option A: Reusable Component (Recommended)
Create a new `PasswordInput` component that wraps the standard Input with visibility toggle logic. This ensures consistency and reduces code duplication.

### Option B: Inline Logic
Add visibility state and toggle button directly to each password field. Faster to implement but creates code duplication.

I'll use **Option A** for cleaner, maintainable code.

---

## Technical Details

### New Component: `src/components/ui/password-input.tsx`

```tsx
// A wrapper around Input that adds:
// - showPassword state (boolean)
// - Toggle button with Eye/EyeOff icons
// - Switches input type between "password" and "text"
```

### Component Features
- Extends all standard Input props
- Eye icon positioned on the right side (right-3)
- Icon is a button for accessibility (keyboard navigable)
- Supports the existing left-side Lock icon pattern
- Uses `pr-10` padding to make room for the toggle button

### Usage Pattern
Replace:
```tsx
<Input type="password" ... />
```
With:
```tsx
<PasswordInput ... />
```

### Icon States
- Password hidden: `Eye` icon (click to reveal)
- Password visible: `EyeOff` icon (click to hide)

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/ui/password-input.tsx` | **New** - Reusable password input with toggle |
| `src/pages/Auth.tsx` | Use PasswordInput for login/signup |
| `src/components/auth/ResetPasswordForm.tsx` | Use PasswordInput for both password fields |
| `src/pages/AdminLogin.tsx` | Use PasswordInput for admin login |
