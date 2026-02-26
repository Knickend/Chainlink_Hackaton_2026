

# Fix Missing Network Names in Chainlink Price Feeds

## Problem
Some Chainlink feed entries in the database have symbols stored without the `network:` prefix (e.g., `CZK/USD` instead of `sepolia:CZK/USD`). When the dialog parses these, the network field ends up as an empty string, showing blank cells in the "Network" column.

Affected symbols in DB: `CZK/USD`, `ETH/USD`, `GBP/USD`, `cbBTC/USD`, `EURC/USD`, `JPY/USD`, `EURC/USD`.

## Solution

**File: `src/hooks/useLivePrices.ts`** (lines ~274)

When parsing cached Chainlink data, if the `network` field is empty (no colon in symbol), infer the network from the pair name:
- Pairs like `cbBTC/USD`, `EURC/USD`, `ETH/USD` that also exist on Base should default to a reasonable value
- Use `"unknown"` as a fallback so the column is never blank

Change line 274 from:
```typescript
const network = colonIdx > -1 ? sym.substring(0, colonIdx) : '';
```
to:
```typescript
const network = colonIdx > -1 ? sym.substring(0, colonIdx) : 'sepolia';
```

This defaults to `"sepolia"` for legacy entries without a network prefix, since the Sepolia testnet feeds were the original configuration.

**File: `src/components/ExchangeRatesDialog.tsx`** (line 313)

Add a safety fallback in the display so that if network is still empty for any reason, it shows "N/A" instead of blank:

```typescript
<TableCell className="text-muted-foreground capitalize">
  {feed.network || 'N/A'}
</TableCell>
```

## Additional Cleanup (Optional)

The root cause is that some DB rows were written without the `network:` prefix. A one-time data cleanup could normalize these, but the display-layer fix is sufficient and non-destructive.

