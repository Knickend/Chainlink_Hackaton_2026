

## Fix CDP API 401 Unauthorized Error

The agent-wallet edge function successfully generates and signs a JWT, but the Coinbase CDP API rejects it with a 401. Two fixes are needed:

### 1. Fix JWT Payload Format

The current code uses `uris: [uri]` (array). The official CDP SDK examples and REST API docs show the `generateJwt` function uses both formats depending on version, but the C++ and PHP reference implementations consistently use `uri` as a singular string. We will update the payload to include **both** `uri` (string) and `uris` (array) for maximum compatibility, matching patterns seen in the official SDK source.

**File**: `supabase/functions/agent-wallet/index.ts`

Change the JWT payload from:
```typescript
const payload = {
  sub: apiKeyId,
  iss: 'cdp',
  aud: ['cdp_service'],
  nbf: now,
  exp: now + 120,
  uris: [uri],
};
```
To:
```typescript
const payload = {
  sub: apiKeyId,
  iss: 'cdp',
  aud: ['cdp_service'],
  nbf: now,
  exp: now + 120,
  uris: [uri],
  uri,
};
```

### 2. Add Debug Logging for JWT Diagnostics

Add a log statement that prints the generated JWT header and URI (not the signature) so we can verify the format is correct if the 401 persists.

### 3. Verify CDP API Credentials

If the fix above does not resolve the 401, the stored `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` values need to be re-entered. The credentials may have been:
- Copied with extra whitespace or newlines
- Generated with the wrong algorithm (ECDSA instead of Ed25519)
- Expired or revoked on the Coinbase CDP portal

We will prompt for re-entry only if the URI fix does not resolve the issue.

### Technical Details

- Only `supabase/functions/agent-wallet/index.ts` is modified
- The edge function will be redeployed automatically
- No database or frontend changes are needed

