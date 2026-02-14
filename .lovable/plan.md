

## Fix: Align Both JWTs and Request Body with CDP Support's Reference

CDP support provided a complete working reference that reveals three mismatches in the current code.

### Changes (supabase/functions/agent-wallet/index.ts)

**1. API Key JWT payload: remove `uris` array, keep only singular `uri` (line 102)**

CDP support says the API Key JWT uses `uri` (singular string), NOT `uris` (array). Currently we send both. Remove the `uris` line.

Before:
```typescript
uris: [uri],
uri,
```

After:
```typescript
uri,
```

**2. API Key JWT nonce: use 16-char hex instead of full UUID (line 85)**

CDP's reference uses `randomHex16().substring(0, 16)` (16 chars). We currently use a full UUID.

Before:
```typescript
const nonce = crypto.randomUUID();
```

After:
```typescript
const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');
```

This produces a 16-character hex string matching the reference.

**3. Remove `network` from account creation request body (line 353)**

CDP support's reference only sends `{ name: "..." }` with no `network` field. The extra field may cause a `reqHash` mismatch or be rejected.

Before:
```typescript
{ name: accountName, network: 'base' }
```

After:
```typescript
{ name: accountName }
```

**4. Deploy the updated edge function.**

### Why These Matter

- The `uris` vs `uri` difference means CDP's API Key validation may be rejecting the extra claim or misinterpreting it.
- The nonce length may matter for header validation.
- The `network` field in the body changes the `reqHash` and may not be a valid parameter for the `/platform/v2/evm/accounts` endpoint, causing a body validation failure on CDP's side.

### After Deploy

Test wallet connection on Settings -> Agent tab. These three fixes align the implementation exactly with CDP support's verified working reference.
