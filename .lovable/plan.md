

## Fix: Revert Key Import to Direct DER + Add JWT Decode Diagnostics

### Context
We've been debugging a persistent 401 "Wallet authentication error" from CDP's Platform API. The `X-Wallet-Auth` JWT (ES256/P-256) keeps being rejected while the API key JWT (Ed25519) works fine.

We've tried:
- Manual `crypto.subtle` signing (rejected)
- `jose.importPKCS8` with PEM wrapping + no `exp` (current state, rejected)
- `jose.SignJWT` with `exp` claim (rejected)

The one combination we haven't tried: **direct DER import via `crypto.subtle.importKey` + no `exp` + `jose.SignJWT`**.

### Changes (supabase/functions/agent-wallet/index.ts)

**1. Revert key import from PEM-wrapping to direct DER bytes**

Replace lines 250-264 (the PEM wrapping + `importPKCS8` block) with:
- Base64-decode the wallet secret directly using the existing `decodeEcdsaPrivateKey` helper
- Import via `crypto.subtle.importKey('pkcs8', derBytes, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])`
- This avoids any subtle PEM header/parsing differences that `jose.importPKCS8` might introduce

**2. Keep current no-`exp` payload (lines 230-236)**

No changes -- payload stays as `{ iat, nbf, jti, uris }` with conditional `reqHash`.

**3. Keep `jose.SignJWT` for signing (lines 267-269)**

No changes -- continue using `new SignJWT(payload).setProtectedHeader({ alg: 'ES256', typ: 'JWT' }).sign(cryptoKey)`.

**4. Add JWT decode diagnostic logging after signing**

After the JWT is generated (after line 271), split the JWT on `.` and base64url-decode the header and payload parts. Log both decoded objects. This lets us verify exactly what `jose` produced (whether it injected extra claims like `exp` or modified the header).

```text
// Decode and log: split JWT, base64url-decode parts 0 and 1
const [headerB64, payloadB64] = jwt.split('.');
const decodedHeader = JSON.parse(atob(headerB64.replace(/-/g,'+').replace(/_/g,'/')));
const decodedPayload = JSON.parse(atob(payloadB64.replace(/-/g,'+').replace(/_/g,'/')));
console.log('[WalletAuth] Decoded JWT header:', JSON.stringify(decodedHeader));
console.log('[WalletAuth] Decoded JWT payload:', JSON.stringify(decodedPayload));
```

### If This Still Fails

The remaining explanation is the `CDP_WALLET_SECRET` value itself. The user should:
1. Go to CDP Portal, Server Wallets, Accounts page
2. Regenerate the Wallet Secret
3. Copy it immediately (cannot be viewed again)
4. Update `CDP_WALLET_SECRET` in backend secrets
5. Redeploy and test

We may also try changing the URI format from `"POST api.cdp.coinbase.com/platform/v2/..."` to `"POST /platform/v2/..."` (no host) as some CDP documentation examples show this format.

### Sequence
1. Update `generateWalletAuthJwt` to use `crypto.subtle.importKey` instead of `importPKCS8`
2. Add JWT decode logging
3. Deploy edge function
4. Test wallet connection on Settings page, then check logs

