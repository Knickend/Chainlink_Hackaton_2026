

# Add Base Chain Chainlink Price Feeds for DCA

## Overview

Add three new Chainlink price feeds on Base mainnet (cbBTC/USD, EURC/USD, ETH/USD) to get accurate on-chain prices for the DCA strategy. This requires updating the `CHAINLINK_FEEDS` secret and adding a Base-specific fallback RPC to the edge function.

## Changes

### 1. Update the `CHAINLINK_FEEDS` secret

The existing secret contains only Sepolia feeds. It needs to be updated to include the 3 new Base feeds appended to the array:

```json
[
  {"pair":"AUD/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x7D45Af19782C6f765477f105E626E686FBE84377"},
  {"pair":"CZK/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0xC32f0A9D70A34B9E7377C10FDAd88512596f61EA"},
  {"pair":"EUR/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x01653D082a836a0197a962687B92a54bf47d7923"},
  {"pair":"GBP/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x91FAB41F5f3bE955963a986366edAcff1aaeaa83"},
  {"pair":"JPY/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x8A6af2B75F23831ADc973ce6288e5329F63D86c6"},
  {"pair":"cbBTC/USD","network":"base","rpc":"https://site1.moralis-nodes.com/base/0e245e61f3844e00802a1790097e9d91","address":"0x07DA0E54543a844a80ABE69c8A12F22B3aA59f9D"},
  {"pair":"EURC/USD","network":"base","rpc":"https://site1.moralis-nodes.com/base/0e245e61f3844e00802a1790097e9d91","address":"0xDAe398520e2B67cd3f27aeF9Cf14D93D927f8250"},
  {"pair":"ETH/USD","network":"base","rpc":"https://site1.moralis-nodes.com/base/0e245e61f3844e00802a1790097e9d91","address":"0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"}
]
```

### 2. Update the edge function with Base fallback RPCs

**`supabase/functions/fetch-chainlink-feeds/index.ts`**:

The current `FALLBACK_RPCS` array only has Sepolia RPCs. Since feeds now span multiple networks, the fallback logic needs to be network-aware:

- Add a `FALLBACK_RPCS_BY_NETWORK` map with entries for both `sepolia` and `base`
- Base fallback RPCs: the two Moralis endpoints provided
- Update the `fetchFeed` function to pick fallback RPCs based on `f.network` instead of using one global list

### 3. Add a Base example config file

**`supabase/chainlink-feeds.base.example.json`** (new file):

Document the three Base feeds for reference, matching the format of the existing Sepolia example.

## Files modified

| File | Change |
|------|--------|
| `CHAINLINK_FEEDS` secret | Add 3 Base chain feed entries |
| `supabase/functions/fetch-chainlink-feeds/index.ts` | Network-aware fallback RPCs for Base vs Sepolia |
| `supabase/chainlink-feeds.base.example.json` | New reference file with Base feed addresses |

