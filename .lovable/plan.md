

# Email Notifications for Privacy Vault Activities

## Overview

Add email notifications for four key Privacy Vault activities: deposits, private transfers, and withdrawals. Notifications are sent to the user's auth email using Resend (already configured via `RESEND_API_KEY` secret).

## Changes

### 1. `supabase/functions/privacy-vault/index.ts`

Add a helper function `sendPrivacyVaultEmail` (modeled on the existing `sendDepositEmail` in `check-wallet-balance`) that sends branded HTML emails via Resend. Then call it at the end of each successful action:

- **`deposit` / `deposit-from-shielded`**: "Privacy Vault Deposit" email with token, amount, approve + deposit tx hashes, Sepolia Etherscan links
- **`private-transfer`**: "Private Transfer Sent" email with recipient (truncated), amount, token
- **`withdraw`**: "Privacy Vault Withdrawal" email with amount, token, recipient, withdraw tx hash, forward tx hash

The user's email is already available from `user.email` (resolved via `auth.getUser()` at line 450). Resend is imported and initialized at the top of the function. Emails are sent as fire-and-forget (wrapped in try/catch so failures don't block the response).

**Token symbol resolution**: Use the existing `TOKEN_DECIMALS` map keys to resolve token addresses to human-readable names (USDC, LINK, WETH).

### 2. No database changes needed

The `RESEND_API_KEY` secret is already configured. No new tables or migrations required.

### 3. No UI changes needed

Email notifications are purely backend. The existing Privacy Vault UI remains unchanged.

## Email Template Design

Matches the existing InControl email style (dark theme, green gradient header, Sepolia Etherscan links). Each email includes:
- Activity type header (Deposit/Transfer/Withdrawal)
- Token and amount
- Transaction hash(es) with clickable Etherscan links
- Timestamp
- Footer disclaimer

