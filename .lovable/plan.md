

## Fix: Debug and Fix Wallet Auth JWT Rejection

### Problem
The `X-Wallet-Auth` header is now present but CDP returns "Wallet authentication error" (401). The JWT is being generated but rejected by CDP's verification.

### Likely Root Causes (in order of probability)

1. **Body hash mismatch**: The `reqHash` is computed from `JSON.stringify(sortedBody)`, but the actual HTTP body sent is `JSON.stringify(body)` (unsorted). If CDP hashes the exact body bytes received and compares to `reqHash`, they won't match when key order differs.

2. **Signature format issue**: Need to verify the ECDSA signature length and format are correct (should be exactly 64 bytes in IEEE P1363 format for P-256).

3. **Wallet Secret decoding issue**: Need to verify the decoded key size is correct for ECDSA P-256 PKCS8 (typically ~138 bytes, not 32/64 like Ed25519).

### Changes (supabase/functions/agent-wallet/index.ts)

**1. Fix body serialization consistency**
- In `cdpRequest`, stringify the **sorted** body for the HTTP request so it matches exactly what was hashed for `reqHash`
- Change: `body: body ? JSON.stringify(body) : undefined` to `body: body ? JSON.stringify(sortObjectKeys(body)) : undefined`
- Alternatively, compute the hash from the exact same string used in the request body

**2. Add debug logging to `generateWalletAuthJwt`**
- Log the decoded ECDSA key length (should be ~138 bytes for PKCS8 P-256, not 32/64)
- Log whether `crypto.subtle.importKey` succeeds for the ECDSA key
- Log the wallet JWT payload (iat, nbf, jti, uris, reqHash)
- Log the signature byte length (should be 64 for P-256)
- Log the wallet secret input length (characters)

**3. Ensure consistent body hashing**
- Move the body sorting + hashing logic so the exact same serialized string is used both for the `reqHash` and the HTTP request body
- This guarantees byte-for-byte match between what's hashed and what's sent

### Technical Detail
Per CDP docs: "The request body matches exactly what was signed." The safest approach is to:
1. Sort the body keys
2. Stringify once
3. Use that exact string for both the HTTP body AND the SHA-256 hash in reqHash

This eliminates any possibility of serialization differences causing a hash mismatch.

### Sequence
1. Update `cdpRequest` to use sorted, pre-serialized body
2. Add debug logging to `generateWalletAuthJwt`
3. Deploy and test
4. Review logs to identify if the issue is key-related or body-related

