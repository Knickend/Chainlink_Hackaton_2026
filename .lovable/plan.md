

## Add CHAINLINK_FEEDS Secret

### What Changes

Add the `CHAINLINK_FEEDS` secret to the backend so the `fetch-chainlink-feeds` edge function can read feed configurations and return on-chain price data.

### Steps

1. Use the secrets tool to prompt you for the `CHAINLINK_FEEDS` value
2. You will paste in the JSON string containing your feed configurations (pairs, networks, RPC URLs, and contract addresses)

### Example Value (Sepolia Testnet)

If you want to start with the Sepolia example feeds from your repo, use this value:

```text
[{"pair":"AUD/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x7D45Af19782C6f765477f105E626E686FBE84377"},{"pair":"CZK/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0xC32f0A9D70A34B9E7377C10FDAd88512596f61EA"},{"pair":"EUR/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x01653D082a836a0197a962687B92a54bf47d7923"},{"pair":"GBP/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x91FAB41F5f3bE955963a986366edAcff1aaeaa83"},{"pair":"JPY/USD","network":"sepolia","rpc":"https://rpc.sepolia.org","address":"0x8A6af2B75F23831ADc973ce6288e5329F63D86c6"}]
```

You can modify this to include your own RPC endpoint or different feeds before pasting.

### After Adding the Secret

- The edge function will automatically pick up the new secret on next invocation
- Open the Exchange Rates dialog and click the Chainlink tab to verify feeds load correctly

