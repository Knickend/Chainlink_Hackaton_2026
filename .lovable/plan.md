

## Fix: Prevent Empty X-Wallet-Auth Header

### Problem
CDP returns 400 saying `X-Wallet-Auth` header is present but has no value. Even though our conditional logic should skip adding the header for account creation, the header key may still end up in the request with an empty/undefined value. This is a defensive coding issue.

### Solution
Restructure `cdpRequest` so that:
1. The `walletAuthJwt` variable is declared outside the conditional
2. The header is **only added** if the JWT string is non-empty (explicit length check)
3. Also tighten the regex to specifically match `/send/transaction` endpoints

### Changes (supabase/functions/agent-wallet/index.ts)

**Replace lines 159-177** (the headers construction + wallet auth conditional block):

```typescript
// Build base headers WITHOUT X-Wallet-Auth
const upperMethod = method.toUpperCase();
const needsWalletAuth =
  (upperMethod === 'POST' || upperMethod === 'DELETE') &&
  /\/platform\/v2\/evm\/accounts\/[^/]+\/send\/transaction$/.test(fullPath);

let walletAuthJwt: string | undefined;
if (needsWalletAuth) {
  walletAuthJwt = await generateWalletAuthJwt(walletSecret, upperMethod, fullPath, serializedBody);
  console.log('[CDP] X-Wallet-Auth generated:', !!walletAuthJwt);
}

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${jwt}`,
};

// Only attach if we have a real non-empty token
if (walletAuthJwt && walletAuthJwt.length > 0) {
  headers['X-Wallet-Auth'] = walletAuthJwt;
  console.log('[CDP] X-Wallet-Auth attached (wallet-level operation)');
} else {
  console.log('[CDP] No X-Wallet-Auth (platform-level operation)');
}
```

Key differences from current code:
- Headers object is built **after** the wallet auth decision, not before
- Explicit `walletAuthJwt.length > 0` guard prevents an empty string from being set
- Regex tightened to only match `/send/transaction` paths (not any sub-resource)
- Uses `upperMethod` consistently in the `generateWalletAuthJwt` call

### After Deploy
Test wallet connection on Settings -> Agent tab. The `POST /platform/v2/evm/accounts` call should now have zero trace of `X-Wallet-Auth` in the request.
