

## Fix: Switch Wallet Auth Key Import to jose's `importPKCS8`

### Problem
The 401 "Wallet authentication error" means the `X-Wallet-Auth` JWT signature is being rejected by CDP's TEE. The current code manually decodes the wallet secret to raw DER bytes and imports via `crypto.subtle.importKey`. This may produce a subtly different key object than what jose expects when signing, or may mishandle ASN.1 edge cases.

### Solution
Replace the manual DER import with jose's `importPKCS8`, which is specifically designed for JWT signing and matches CDP's reference implementations. Also remove the now-unused `decodeEcdsaPrivateKey` helper.

### Changes (supabase/functions/agent-wallet/index.ts)

**1. Delete `decodeEcdsaPrivateKey` function (lines 217-228)**

This helper is no longer needed.

**2. Rewrite key import in `generateWalletAuthJwt` (lines 261-278)**

Replace:
```typescript
const derBytes = decodeEcdsaPrivateKey(walletSecret);
const cryptoKey = await crypto.subtle.importKey(
  'pkcs8', derBytes,
  { name: 'ECDSA', namedCurve: 'P-256' },
  true, ['sign']
);
```

With:
```typescript
const cleanedSecret = walletSecret
  .replace(/-----BEGIN[^-]*-----/g, '')
  .replace(/-----END[^-]*-----/g, '')
  .replace(/\s/g, '');
const pem = `-----BEGIN PRIVATE KEY-----\n${cleanedSecret}\n-----END PRIVATE KEY-----`;
const cryptoKey = await importPKCS8(pem, 'ES256');
```

This uses the already-imported `importPKCS8` from jose (line 3), handling PEM parsing, ASN.1 validation, and algorithm-specific key extraction internally.

**3. Deploy the updated edge function.**

### Why This Should Work
- jose's `importPKCS8` is battle-tested for JWT operations and handles PKCS8 structure validation internally
- CDP's own reference implementations use PEM-wrapped keys with standard JWT libraries
- The manual `crypto.subtle.importKey` with raw DER bytes may interpret the ASN.1 structure differently, producing a valid CryptoKey that signs differently than expected

### After Deploy
Test wallet connection on Settings -> Agent tab. If 401 persists after this change, the issue is the `CDP_WALLET_SECRET` value itself (stale or from a different wallet product), and the next step would be contacting CDP support with the `correlationId` from the error response.
