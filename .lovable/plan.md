

## Update CHAINLINK_FEEDS Secret with Infura RPC

### What Changes

Update the `CHAINLINK_FEEDS` backend secret to use your Infura Sepolia endpoint instead of the failing public RPC.

### New Secret Value

```text
[{"pair":"AUD/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0x7D45Af19782C6f765477f105E626E686FBE84377"},{"pair":"CZK/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0xC32f0A9D70A34B9E7377C10FDAd88512596f61EA"},{"pair":"EUR/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0x01653D082a836a0197a962687B92a54bf47d7923"},{"pair":"GBP/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0x91FAB41F5f3bE955963a986366edAcff1aaeaa83"},{"pair":"JPY/USD","network":"sepolia","rpc":"https://sepolia.infura.io/v3/cb5b1cb929f9402b8f7de1ced8a8fdb8","address":"0x8A6af2B75F23831ADc973ce6288e5329F63D86c6"}]
```

### Steps

1. Use the secrets tool to update `CHAINLINK_FEEDS` with the Infura-based JSON above
2. The edge function will use the new RPC on next invocation -- no code changes needed

### After

Open Exchange Rates, click the Chainlink tab, and verify feeds load with "On-chain" status badges.

