

## Fix: Re-save CHAINLINK_FEEDS Secret with Correct JSON

### Problem

The backend logs show the `CHAINLINK_FEEDS` secret contains just a URL string (starting with `https://se...`) instead of the required JSON array. This causes `JSON.parse()` to fail, and the function falls back to an empty feed list -- resulting in "No Chainlink feeds configured."

### Root Cause

When the secret was last updated, only the Infura RPC URL was saved instead of the full JSON array of feed objects.

### Fix

Update the `CHAINLINK_FEEDS` secret with the correct value -- the complete JSON array:

```text
[{"pair":"AUD/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0x7D45Af19782C6f765477f105E626E686FBE84377"},{"pair":"CZK/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0xC32f0A9D70A34B9E7377C10FDAd88512596f61EA"},{"pair":"EUR/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0x01653D082a836a0197a962687B92a54bf47d7923"},{"pair":"GBP/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0x91FAB41F5f3bE955963a986366edAcff1aaeaa83"},{"pair":"JPY/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0x8A6af2B75F23831ADc973ce6288e5329F63D86c6"}]
```

### Steps

1. Update the `CHAINLINK_FEEDS` secret with the full JSON array above
2. No code changes needed -- the edge function already handles this format correctly
3. Open Exchange Rates > Chainlink tab to verify feeds load with "On-chain" badges

