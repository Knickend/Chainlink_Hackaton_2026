

## Fix: Align Wallet Auth JWT with Official CDP Reference

### Problem
The "Wallet authentication error" (401) persists. Comparing our implementation line-by-line with the official CDP JavaScript reference reveals two discrepancies and one key import approach that could cause subtle differences.

### Root Causes Found

**1. Extra `exp` claim (likely culprit)**
Our code adds `exp: now + 60` to the wallet JWT payload. The official CDP reference code does NOT include an `exp` claim:
```text
// Official CDP reference (no exp):
const payload = { iat: now, nbf: now, jti: ..., uris: [uri] };

// Our code (has exp):
const payload = { iat: now, nbf: now, exp: now + 60, jti: ..., uris: [uri] };
```
CDP's TEE may reject tokens with unexpected claims.

**2. Key import method mismatch**
We imported `importPKCS8` from jose but never use it. Instead we use `crypto.subtle.importKey` manually. The official code uses Node's `crypto.createPrivateKey`. For Deno + jose, the cleanest equivalent is to wrap the base64 DER in PEM headers and use `jose.importPKCS8`:
```text
const pem = "-----BEGIN PRIVATE KEY-----\n" + walletSecret + "\n-----END PRIVATE KEY-----";
const key = await importPKCS8(pem, 'ES256');
```

### Changes (supabase/functions/agent-wallet/index.ts)

**1. Remove `exp` claim from wallet JWT payload**
Remove the `exp: now + 60` line to match the official reference exactly.

**2. Use `jose.importPKCS8` for key import**
Replace the manual `decodeEcdsaPrivateKey` + `crypto.subtle.importKey` with:
- Wrap the base64 wallet secret in PEM `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` headers
- Call `importPKCS8(pem, 'ES256')` from jose
- This matches the official approach more closely and eliminates any subtle key format issues

**3. Keep everything else the same**
- URI format is correct: `"POST api.cdp.coinbase.com/platform/v2/evm/accounts"`
- Body hash (reqHash) approach is correct
- Conditional X-Wallet-Auth for POST/DELETE only is correct
- jose SignJWT usage is correct

### Additional Recommendation
If the fix still fails, the `CDP_WALLET_SECRET` value itself may be wrong. I'll add a log showing the first 8 characters of the secret (safe for debugging) so we can verify it's not empty or garbled. The user should also consider regenerating the Wallet Secret in the CDP Portal and re-pasting it.

### Sequence
1. Update `generateWalletAuthJwt` to remove `exp` and use `importPKCS8`
2. Deploy the edge function
3. Test wallet connection
4. If still failing, regenerate CDP_WALLET_SECRET

