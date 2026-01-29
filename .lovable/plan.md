
# Dedicated Admin Login Page (Hidden from Public)

## Overview

I'll create a dedicated admin login page at a hidden URL that provides:
- A secret login endpoint not linked from the public site
- Admin-only authentication with automatic role verification
- Redirect to admin dashboard upon successful login
- Clean, secure admin-branded login experience

---

## Architecture

```text
/admin/login (hidden URL)
       |
       v
+------------------+
|  Admin Login UI  |
|  (email/password)|
+------------------+
       |
       v
+------------------+     +------------------+
|  Authenticate    | --> |  Check user_roles|
|  via Auth        |     |  for admin role  |
+------------------+     +------------------+
       |                          |
       v                          v
  [Not admin?]              [Is admin?]
       |                          |
       v                          v
   Show error            Redirect to /admin
```

---

## Features

- **Hidden URL**: `/admin/login` - not linked from landing page, auth page, or anywhere public
- **Admin-only access**: Even if credentials are valid, non-admins see an access denied message
- **Clean admin branding**: Shield icon and "Admin Portal" styling to distinguish from regular login
- **Security**: Standard input validation with zod, proper error handling
- **Convenience**: Remember me option, quick access for repeat logins

---

## Technical Details

### New File

| File | Purpose |
|------|---------|
| `src/pages/AdminLogin.tsx` | Dedicated admin login page |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/admin/login` route |

### Implementation

The admin login page will:
1. Present a branded login form with email/password fields
2. On submit, authenticate with the standard auth system
3. After authentication, check if user has admin role using `useUserRole`
4. If admin: redirect to `/admin`
5. If not admin: show error message and sign them out
6. If auth fails: show standard credential error

### Security Measures

- URL is not linked anywhere publicly - admins access it by typing the URL directly
- Standard zod validation for email/password inputs
- Role verification happens after authentication
- Non-admins who guess the URL and try to log in get signed out immediately
- No indication on the main site that this page exists

---

## Page Design

The admin login page will have:
- Dark, professional styling matching the app theme
- Shield icon branding for "Admin Portal"
- Simple email/password form
- Clear error states for invalid credentials or non-admin access
- Link back to main site (optional, can be removed for extra secrecy)

---

## How Admins Access It

Admins simply navigate directly to:
```
https://your-app.com/admin/login
```

This URL is not discoverable through the UI - you share it privately with admin users.
