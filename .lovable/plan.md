

## Fix: Only Send X-Wallet-Auth on Wallet-Specific Endpoints

### Problem
The `X-Wallet-Auth` header is currently attached to **every** POST/DELETE request, including `POST /platform/v2/evm/accounts` (account creation). That endpoint is a **Platform API** call authenticated only by the API key Bearer token -- it does not expect the Wallet Secret header. Sending it causes the 401 "Wallet authentication error."

### Solution
In the `cdpRequest` function, restrict the `X-Wallet-Auth` header to only be added when the request path targets an **existing account's operations** (e.g., `/send/transaction`). Account creation and other platform-level calls will use only the API key Bearer token.

### Technical Details

**File: `supabase/functions/agent-wallet/index.ts`**

Replace the current blanket POST/DELETE check (lines 164-169):

```typescript
const upperMethod = method.toUpperCase();
if (upperMethod === 'POST' || upperMethod === 'DELETE') {
  const walletAuthJwt = await generateWalletAuthJwt(...);
  headers['X-Wallet-Auth'] = walletAuthJwt;
}
```

With a path-aware check:

```typescript
const upperMethod = method.toUpperCase();
const needsWalletAuth =
  (upperMethod === 'POST' || upperMethod === 'DELETE') &&
  /\/platform\/v2\/evm\/accounts\/[^/]+\//.test(fullPath);

if (needsWalletAuth) {
  const walletAuthJwt = await generateWalletAuthJwt(...);
  headers['X-Wallet-Auth'] = walletAuthJwt;
  console.log('[CDP] X-Wallet-Auth attached (wallet-level operation)');
} else {
  console.log('[CDP] No X-Wallet-Auth (platform-level operation)');
}
```

The regex `/\/platform\/v2\/evm\/accounts\/[^/]+\//` matches paths that target a specific account's sub-resource (like `.../accounts/0xABC.../send/transaction`) but does NOT match the account creation endpoint (`/platform/v2/evm/accounts`).

### Expected Outcome
- `POST /platform/v2/evm/accounts` -- no `X-Wallet-Auth`, uses only API key Bearer -- should succeed (201)
- `POST /platform/v2/evm/accounts/{address}/send/transaction` -- includes `X-Wallet-Auth` -- wallet-level auth as required

