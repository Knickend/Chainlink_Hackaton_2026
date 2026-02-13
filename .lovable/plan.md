

## Fix: X-Wallet-Auth Header Issue on Account Creation

### Analysis

The edge function logs show:
- Our code logs `[CDP] No X-Wallet-Auth (platform-level operation)` -- confirming the header is NOT being set
- Yet CDP returns: `"parameter X-Wallet-Auth in header has an error: value is required but missing"`

This error most likely means CDP **requires** `X-Wallet-Auth` for this endpoint but it was not sent at all. For the Server Wallet product, all POST requests to the `/platform/v2/evm/accounts` endpoint likely need wallet-level authentication.

### Solution

Change the approach: instead of restricting `X-Wallet-Auth` to only `/send/transaction`, send it on **all POST/DELETE requests** to CDP. The key fix is ensuring the JWT value is always valid and non-empty.

### Changes (supabase/functions/agent-wallet/index.ts)

Replace the `needsWalletAuth` conditional block (lines 159-182) so that:

1. All POST and DELETE requests generate and attach X-Wallet-Auth
2. Add `.trim()` as an extra safety guard
3. If generation fails or returns empty, throw an explicit error rather than silently omitting the header

```text
Simplified logic:
  if POST or DELETE:
    generate walletAuthJwt
    if valid and non-empty -> attach header
    else -> throw error (required but failed to generate)
  else (GET):
    no X-Wallet-Auth needed
```

### Technical Detail

```typescript
const upperMethod = method.toUpperCase();
const needsWalletAuth = upperMethod === 'POST' || upperMethod === 'DELETE';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${jwt}`,
};

if (needsWalletAuth) {
  const walletAuthJwt = await generateWalletAuthJwt(
    walletSecret, upperMethod, fullPath, serializedBody
  );
  if (walletAuthJwt && walletAuthJwt.trim().length > 0) {
    headers['X-Wallet-Auth'] = walletAuthJwt;
    console.log('[CDP] X-Wallet-Auth attached');
  } else {
    console.error('[CDP] WARNING: walletAuthJwt generation returned empty!');
    throw new Error('Failed to generate X-Wallet-Auth JWT');
  }
} else {
  console.log('[CDP] GET request, no X-Wallet-Auth needed');
}
```

### Why This Should Work

The Server Wallet documentation indicates the Wallet Secret is used to authenticate wallet-level operations. Since the Server Wallet product manages keys server-side, even account creation is a wallet-level operation requiring the `X-Wallet-Auth` header. The previous approach of omitting it for account creation was incorrect for this product type.

### After Deploy

Test wallet connection on Settings -> Agent tab. The `POST /platform/v2/evm/accounts` call should now include a properly signed `X-Wallet-Auth` header.
