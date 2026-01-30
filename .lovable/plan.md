

# Add Exchange Rates Dialog

## Overview

Create a dedicated "Exchange Rates" dialog accessible from the dashboard header that displays all current forex rates, crypto prices, and commodity prices in one consolidated view. This gives users full visibility into the live market data powering their portfolio valuations.

## Design Approach

The dialog will be triggered from the PriceIndicator component (which already shows status info) by making the status pill clickable. This is intuitive since users who hover over the indicator already see partial rate info in the tooltip.

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ExchangeRatesDialog.tsx` | Main dialog component displaying all rates in a tabbed interface |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/PriceIndicator.tsx` | Make the status pill trigger the dialog |
| `src/pages/Index.tsx` | Pass full `prices` object to PriceIndicator |

## Component Design

### ExchangeRatesDialog Layout

```text
+----------------------------------------------------------+
| Exchange Rates                                      [X]   |
+----------------------------------------------------------+
| [Forex] [Crypto] [Commodities]                           |  <- Tabs
+----------------------------------------------------------+
| FOREX TAB:                                               |
| +------------------------------------------------------+ |
| | Currency        | Symbol | Rate (vs USD) | Change    | |
| |-----------------|--------|---------------|-----------|  |
| | Euro            | EUR    | 1 EUR = $1.08 | Live      | |
| | British Pound   | GBP    | 1 GBP = $1.27 | Live      | |
| | Swiss Franc     | CHF    | 1 CHF = $1.13 | Fallback  | |
| | ...19 currencies total...                            | |
| +------------------------------------------------------+ |
|                                                          |
| Last updated: 45 minutes ago                             |
+----------------------------------------------------------+

+----------------------------------------------------------+
| CRYPTO TAB:                                              |
| +------------------------------------------------------+ |
| | Asset           | Symbol | Price         | 24h       | |
| |-----------------|--------|---------------|-----------|  |
| | Bitcoin         | BTC    | $96,000.00    | +2.3%     | |
| | Ethereum        | ETH    | $3,200.00     | -0.5%     | |
| | Chainlink       | LINK   | $22.00        | +1.2%     | |
| | + any user crypto assets...                          | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+

+----------------------------------------------------------+
| COMMODITIES TAB:                                         |
| +------------------------------------------------------+ |
| | Asset           | Symbol | Price/oz      | Status    | |
| |-----------------|--------|---------------|-----------|  |
| | Gold            | XAU    | $2,650.00     | Live      | |
| | Silver          | XAG    | $30.00        | Live      | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

### Visual Indicators

- **Live**: Green dot - rate fetched from API recently
- **Cached**: Amber dot - using cached value, refresh in progress
- **Fallback**: Gray dot - using static fallback rate (API unavailable)

## Implementation Details

### 1. ExchangeRatesDialog Component

```typescript
interface ExchangeRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prices: LivePrices;
  lastUpdated: Date | null;
  forexTimestamp?: string;
}

// Features:
// - Three tabs: Forex, Crypto, Commodities
// - Forex tab: Maps BANKING_CURRENCIES array with live rates
// - Crypto tab: Shows BTC/ETH/LINK + any stocks with crypto symbols
// - Commodities tab: Shows Gold/Silver prices
// - Status indicator per rate (live vs fallback)
// - Footer with last updated timestamps
```

### 2. PriceIndicator Modifications

Add state and dialog trigger:

```typescript
// New state
const [dialogOpen, setDialogOpen] = useState(false);

// Make status pill clickable
<button onClick={() => setDialogOpen(true)}>
  {/* existing status pill content */}
</button>

// Render dialog
<ExchangeRatesDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  prices={prices}
  lastUpdated={lastUpdated}
  forexTimestamp={forexTimestamp}
/>
```

### 3. Index.tsx Updates

Pass the full prices object to PriceIndicator:

```typescript
<PriceIndicator
  isLoading={pricesLoading}
  lastUpdated={lastUpdated}
  error={pricesError}
  isCached={isCached}
  forexTimestamp={prices.forexTimestamp}
  prices={prices}  // NEW: full prices object for dialog
  onRefresh={refetchPrices}
/>
```

## Data Sources

| Tab | Source | Refresh Rate |
|-----|--------|--------------|
| Forex | `prices.forex` from useLivePrices | 1 hour |
| Crypto | `prices.btc`, `prices.eth`, `prices.link` + `prices.stocks` | 15 min |
| Commodities | `prices.gold`, `prices.silver` | 30 min |

## UI Components Used

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from shadcn/ui
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` from shadcn/ui
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` from shadcn/ui
- `Badge` for status indicators

## User Experience

1. User hovers over PriceIndicator and sees tooltip with summary
2. User clicks the status pill to open full Exchange Rates dialog
3. Dialog shows all rates in organized tabs
4. Each rate shows whether it's live or using fallback
5. User can see exactly what exchange rates power their portfolio calculations
6. Refresh button in dialog triggers full price refresh

## Technical Notes

- No database changes required
- No new API calls - uses existing data from useLivePrices
- Dialog is lightweight since it only renders when open
- Forex rates display as "1 EUR = $X.XX" format for clarity
- Crypto/commodity prices display in standard "$X,XXX.XX" format

