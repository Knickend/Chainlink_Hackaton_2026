# Supabase Edge Functions – Chainlink feeds

This folder contains Supabase Edge Functions used by the frontend. The `fetch-chainlink-feeds` function reads Chainlink price feeds via JSON-RPC and returns a normalized JSON array:

```json
[{ "pair": "EUR/USD", "network": "sepolia", "answer": 1.09, "decimals": 8, "updatedAt": "2026-02-07T12:00:00Z", "address": "0x..." }]
```

Environment configuration

- The function reads a `CHAINLINK_FEEDS` environment variable. This should be a stringified JSON array containing objects with the following fields:
  - `pair`: human-readable pair (e.g. `EUR/USD`)
  - `network`: network name (e.g. `sepolia`)
  - `rpc`: RPC URL for the network (kept server-side)
  - `address`: Chainlink feed contract address on that network

Example (safe, placeholder values) — add to your Supabase project secrets or local `.env`:

```bash
# supabase/.env.example
CHAINLINK_FEEDS='[{"pair":"EUR/USD","network":"sepolia","rpc":"https://rpc.sepolia.example","address":"0x0000000000000000000000000000000000000000"}]'
```

Important security notes

- Keep RPC URLs, service role keys and any private credentials out of the frontend and the repository.
- Do not commit real keys. Use the Supabase dashboard or secure CI secrets to set `SUPABASE_SERVICE_ROLE_KEY` and `CHAINLINK_FEEDS`.

How the frontend uses it

- The frontend calls the Edge Function via `supabase.functions.invoke('fetch-chainlink-feeds')` and receives the normalized feed array.
- All on-chain interaction remains inside the Edge Function; the frontend never holds RPC URLs or feed addresses.

Sepolia example feeds

We include a safe example file listing several Chainlink forex feeds on Sepolia. This file is for local testing and documentation only:

- `supabase/chainlink-feeds.sepolia.example.json` — contains a JSON array of feed objects (pair, network, rpc, address).

To use these feeds in your Supabase project, copy the file contents into the `CHAINLINK_FEEDS` environment variable (set via the Supabase dashboard or your deployment system). Example using the file contents as a single-line value:

```bash
# replace the value in the dashboard or CI with the single-line JSON string
CHAINLINK_FEEDS='$(cat supabase/chainlink-feeds.sepolia.example.json | tr -d "\n")'
```

Important: do not commit secrets (service role keys, private RPC keys) to the repo. The feed contract addresses are public on-chain and are safe to include as examples.

<!-- CI: trigger rerun -->
