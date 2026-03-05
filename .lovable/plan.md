

# Security Hardening: Remove Exposed Keys and Service Key Endpoint

## Changes

### 1. Delete `supabase/functions/get-service-key/index.ts`
Remove the entire edge function. It exposes the service role key to unauthenticated callers — a critical vulnerability with no legitimate use case.

### 2. Remove `get-service-key` config from `supabase/config.toml`
Delete the `[functions.get-service-key]` block (lines 75-76).

### 3. Move hardcoded Moralis RPC URLs to secrets in `fetch-chainlink-feeds/index.ts`
Replace the hardcoded `FALLBACK_RPCS_BY_NETWORK` object (lines 17-26) with `Deno.env.get()` calls reading from two new secrets:
- `MORALIS_RPC_SEPOLIA` — e.g. `https://site1.moralis-nodes.com/sepolia/<key>`
- `MORALIS_RPC_BASE` — e.g. `https://site1.moralis-nodes.com/base/<key>`

Build fallback arrays dynamically from these env vars (site1/site2 share the same key, just different hostnames). If the secret is not set, fallback array is empty (graceful degradation).

### 4. Replace real keys in example JSON files
- **`supabase/chainlink-feeds.base.example.json`**: Replace Moralis URLs with `https://your-rpc-provider.example/base/YOUR_API_KEY`
- **`supabase/chainlink-feeds.sepolia.example.json`**: Already uses public `rpc.sepolia.org` — no change needed.

### 5. Add secrets
Use the secrets tool to prompt the user to set `MORALIS_RPC_SEPOLIA` and `MORALIS_RPC_BASE` with their current Moralis API URLs (keys need rotation since they're in git history).

## Post-Implementation
The user should rotate the Moralis API keys from the Moralis dashboard since the old keys are exposed in git history.

