

## Fix: Wallet Auth JWT URI Format — Add Host to URI

### Root Cause (confirmed by CDP Support)
CDP's official Node.js example shows the `uris` claim must include the host:

```
"POST api.cdp.coinbase.com/platform/v2/evm/accounts"
```

Our current code (line 228) builds it as:

```
"POST /platform/v2/evm/accounts"
```

This is why the 401 persists — the TEE compares our URI against the actual request URL and they don't match because the host is missing.

### Changes (supabase/functions/agent-wallet/index.ts)

**1. Fix URI format in `generateWalletAuthJwt` (line 228)**

Replace:
```typescript
const uri = `${requestMethod} ${requestPath}`;
```

With:
```typescript
const uri = `${requestMethod} api.cdp.coinbase.com${requestPath}`;
```

This produces `"POST api.cdp.coinbase.com/platform/v2/evm/accounts"` — matching CDP's reference implementation exactly.

**2. Add `exp` claim (CDP support recommendation)**

Add an expiration to the payload as suggested by CDP support:

```typescript
const payload: Record<string, unknown> = {
  iat: now,
  nbf: now,
  exp: now + 120,
  jti,
  uris: [uri],
};
```

**3. Use hex `jti` instead of UUID (CDP support recommendation)**

Replace:
```typescript
const jti = crypto.randomUUID().replace(/-/g, '');
```

With:
```typescript
const jti = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');
```

This matches the Node.js example which uses `crypto.randomBytes(16).toString('hex')`.

**4. Deploy the updated edge function.**

### Why This Should Work

The URI mismatch is the most likely cause of the 401. CDP's TEE validates the `uris` claim against the actual HTTP request, and without the host prefix our URI doesn't match. The `exp` and hex `jti` changes align with CDP's reference code for additional compatibility.

### After Deploy

Test wallet connection on Settings -> Agent tab. The `POST /platform/v2/evm/accounts` call should now succeed with the corrected URI format in the wallet JWT.

