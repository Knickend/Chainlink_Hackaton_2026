

## Fix: Use Official `jose` Library for Wallet Auth JWT

### Root Cause Analysis
The "Wallet authentication error" (401) persists despite correct key import (138 bytes PKCS8, P-256) and signature size (64 bytes). Our manual JWT construction might differ subtly from what CDP's TEE verifies against. The official CDP docs use the `jose` library for Wallet Token generation, which handles JWT encoding, signing, and formatting precisely.

### Changes

**1. Switch to `jose` library in edge function (supabase/functions/agent-wallet/index.ts)**

Replace our manual `generateWalletAuthJwt` with one that uses the `jose` library (available in Deno via `npm:jose` or `esm.sh`), matching the official CDP reference implementation exactly:

```text
import * as jose from "https://deno.land/x/jose@v5.2.2/index.ts";
```

The new implementation will:
- Import the ECDSA P-256 key using `jose.importPKCS8` or `crypto.subtle.importKey` (same as now)
- Use `new jose.SignJWT(payload).setProtectedHeader({ alg: 'ES256', typ: 'JWT' }).sign(key)` exactly like the official example
- Keep the same payload structure: `iat`, `nbf`, `jti`, `uris`, `reqHash`

**2. Add `exp` claim (1 minute validity)**

Per CDP docs: "Wallet Tokens are valid for 1 minute." Adding explicit `exp: now + 60` to the payload.

**3. Only send X-Wallet-Auth for POST/DELETE requests**

Per CDP docs, Wallet Auth is required for "POST and DELETE requests" only. Skip it for GET requests (like token balance checks) to avoid unnecessary auth failures.

**4. Use `jose`-compatible key import**

The official Node.js example does:
```
crypto.createPrivateKey({ key: walletSecret, format: "der", type: "pkcs8", encoding: "base64" })
```

For Deno, we'll base64-decode the wallet secret and import it via `crypto.subtle.importKey('pkcs8', decodedBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])` -- then pass the CryptoKey to `jose.SignJWT.sign()`.

### Why This Should Work

The `jose` library is the same library used in CDP's official documentation and examples. It handles all the JWT encoding, base64url formatting, and signature serialization exactly as CDP's verification layer expects. This eliminates any possible discrepancy in our manual JWT construction (header encoding, payload encoding, signature format).

### Sequence
1. Update edge function to import `jose`
2. Rewrite `generateWalletAuthJwt` using `jose.SignJWT`
3. Conditionally include `X-Wallet-Auth` only for POST/DELETE
4. Deploy and test

