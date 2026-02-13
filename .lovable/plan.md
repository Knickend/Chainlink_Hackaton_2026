

## Add Debug Logging to CDP Key Decoding

Add detailed logging to the `decodeEd25519PrivateKey` function and the `generateCdpJwt` function to trace exactly what's happening with the private key material. This will help identify if the key is being parsed incorrectly (wrong length, wrong format, truncated PEM, etc.).

### Changes (single file: `supabase/functions/agent-wallet/index.ts`)

**1. In `decodeEd25519PrivateKey` (around lines 30-55)**
- Log the cleaned input length (after stripping PEM headers/whitespace)
- Log the decoded byte array length
- Log which code path is taken (48-byte PKCS8, 32-byte raw seed, or other)
- Log the final PKCS8 buffer length before returning

**2. In `generateCdpJwt` (around lines 57-95)**
- After importing the key via `crypto.subtle.importKey`, log success confirmation
- Log the key algorithm details from the imported CryptoKey
- If `importKey` throws, catch and log the specific error

**3. In `cdpRequest` (around lines 97-120)**
- Log the first 8 characters of the API Key ID being used (to confirm the right key is loaded)
- Log the JWT length after generation

These are all `console.log` additions -- no logic changes, no path changes. After redeploying, trigger the wallet connection once and the logs will show exactly whether the key is 32, 48, or some unexpected number of bytes, and whether `crypto.subtle.importKey` succeeds or fails silently.

