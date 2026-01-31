
# Implement Email Confirmation System

## Overview

This plan implements a complete email confirmation flow for new user signups using Resend with your verified domain `incontrol.finance`.

## What Will Be Built

### 1. Edge Function: `send-confirmation-email`

A new backend function that sends branded confirmation emails when users sign up.

**Email Details:**
- From: `InControl <noreply@incontrol.finance>`
- Subject: "Confirm your InControl account"
- Content: Professional HTML email with confirmation link

### 2. Updated Authentication Flow

The signup process will be enhanced to:
- Create the user account via Supabase Auth
- Trigger the edge function to send a branded confirmation email
- Display accurate messaging to the user

### 3. Improved Frontend Messaging

Update the Auth page to:
- Show "Check your email!" instead of "You can now sign in"
- Handle the "Email not confirmed" error with a helpful message

## User Experience

```text
+------------------+     +-------------------+     +------------------+
|   User Signs Up  | --> |  Email Sent via   | --> | User Clicks Link |
|  (email + pass)  |     |     Resend        |     |   in Email       |
+------------------+     +-------------------+     +------------------+
         |                        |                        |
         v                        v                        v
  "Check your email!"     Branded email with      Redirected to app
   toast message          confirmation link        and signed in
```

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-confirmation-email/index.ts` | Edge function to send emails via Resend |

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Call edge function after successful signup |
| `src/pages/Auth.tsx` | Update success message and add error handling |
| `supabase/config.toml` | Register the new edge function |

## Secret to Add

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | Your provided API key (securely stored) |

## Technical Implementation

### Edge Function Logic

```typescript
// Receives: email, confirmationUrl
// Sends branded HTML email via Resend
// Returns: success/error response
```

### Auth Context Changes

```typescript
// After successful signUp:
// 1. Get the confirmation URL from Supabase
// 2. Call send-confirmation-email edge function
// 3. Return result to UI
```

### Auth Page Changes

**Success Message:**
```
Title: "Check your email!"
Description: "We've sent a confirmation link to verify your account."
```

**Error Handling:**
```
"Email not confirmed" → "Please check your email and click the confirmation link before signing in."
```

## Email Template Preview

The confirmation email will include:
- InControl branding with gradient header
- Welcome message
- Prominent "Confirm Email" button
- Fallback link for email clients that block buttons
- Professional footer
