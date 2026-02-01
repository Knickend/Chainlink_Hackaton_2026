

# Bitcoin Mining Income Support

## Overview
Add the ability for Bitcoin miners to input their monthly income in BTC or Satoshis (sats). This extends the existing income system to support cryptocurrency-denominated income alongside fiat currencies.

## What Will Be Added

### New Income Type
- **Mining** - A new income type specifically for Bitcoin mining operations

### New Currency Options for Income
| Currency | Symbol | Conversion |
|----------|--------|------------|
| BTC | ₿ | 1 BTC = 100,000,000 sats |
| SATS | sats | 1 sat = 0.00000001 BTC |

### User Experience
1. When adding income, users can select "Mining" as the income type
2. A currency selector appears allowing choice of BTC, SATS, or fiat currencies
3. When BTC or SATS is selected, the amount field accepts the appropriate decimal precision:
   - BTC: up to 8 decimal places (e.g., 0.00150000)
   - SATS: whole numbers (e.g., 150000)
4. The income is stored in its native unit (BTC or SATS) and converted to the display unit using live BTC prices

## Technical Implementation

### Database
No schema changes needed - the existing `income` table already has a `currency` column that can store 'BTC' or 'SATS'.

### Type Updates (`src/lib/types.ts`)
- Add 'mining' to the Income type enum
- Add BTC_CURRENCIES constant with BTC and SATS options
- Add helper functions for BTC/SATS conversion

### Form Updates

**AddIncomeDialog.tsx**:
- Add 'Mining' to income types dropdown
- Add currency selector (fiat currencies + BTC + SATS)
- Show appropriate decimal precision based on currency
- Default to SATS when Mining type is selected

**EditIncomeDialog.tsx**:
- Same currency selector as AddIncomeDialog
- Preserve and display the stored currency correctly

### Conversion Logic (`src/hooks/usePortfolio.ts`)
Update the income total calculation to:
1. If currency is 'BTC': multiply amount by live BTC price to get USD
2. If currency is 'SATS': convert to BTC (divide by 100,000,000), then multiply by BTC price
3. Then convert from USD to display unit as usual

### Display Updates (`src/components/IncomeExpenseCard.tsx`)
- Show the native currency symbol (₿ for BTC, "sats" for SATS) in the list
- Format appropriately (8 decimals for BTC, whole numbers for SATS)

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add 'mining' income type, BTC_CURRENCIES constant, conversion helpers |
| `src/components/AddIncomeDialog.tsx` | Add currency selector, Mining type, BTC/SATS input handling |
| `src/components/EditIncomeDialog.tsx` | Add currency selector and BTC/SATS display |
| `src/components/IncomeExpenseCard.tsx` | Format BTC/SATS amounts with correct symbols |
| `src/hooks/usePortfolio.ts` | Update income total calculation to handle BTC/SATS currencies |
| `src/lib/mockData.ts` | Add sample mining income for demo mode |

## Conversion Examples

```text
User inputs: 0.015 BTC monthly mining income
BTC price: $96,000
Monthly income in USD: 0.015 × $96,000 = $1,440

User inputs: 150,000 sats monthly mining income  
BTC price: $96,000
Convert to BTC: 150,000 ÷ 100,000,000 = 0.0015 BTC
Monthly income in USD: 0.0015 × $96,000 = $144
```

## UI Preview

**Add Income Dialog with BTC selected:**
```text
┌─────────────────────────────────────┐
│ Add New Income Source               │
├─────────────────────────────────────┤
│ Income Source                       │
│ [Bitcoin Mining Pool         ]      │
│                                     │
│ Income Type                         │
│ [Mining                      ▼]     │
│                                     │
│ Currency                            │
│ [SATS                        ▼]     │
│                                     │
│ Monthly Amount (sats)               │
│ [150000                      ]      │
│                                     │
│        [Add Income]                 │
└─────────────────────────────────────┘
```

## Notes
- Live BTC price from the existing price feed is used for conversions
- If BTC price is unavailable, falls back to the cached/default price
- The stored amount remains in native currency (BTC/SATS) for accuracy
- Totals are always calculated dynamically using current prices

