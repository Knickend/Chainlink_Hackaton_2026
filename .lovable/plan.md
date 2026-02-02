
# Plan: Add Detailed Transaction View per Asset in P&L Dialog

## Overview

When a user clicks on an asset (like Bitcoin) in the "Profit & Loss Details" dialog, they will see an expanded view showing all buy and sell transactions for that specific asset. This provides a complete history of trades and helps users understand how their P&L was built up over time.

## Current State

| Component | Behavior |
|-----------|----------|
| ProfitLossDetailDialog | Shows asset list with P&L summary |
| Asset row | Static display, not clickable |
| Transaction data | Available in `useAssetTransactions` hook but not passed to the dialog |

## Proposed Solution

Transform each asset row in the "By Asset" tab into an expandable section that reveals the transaction history when clicked.

## UI Design

```text
+------------------------------------------+
| Bitcoin                     +$289,734.09 |
| crypto                          +3292.4% |
+------------------------------------------+
    ↓ (when clicked, expands to show)
+------------------------------------------+
| Transaction History                      |
|------------------------------------------|
| ▲ BUY   | 2.5 BTC  | @$8,800  | Jan 2023 |
| ▼ SELL  | 0.5 BTC  | @$45,000 | Dec 2024 |
|         |          | P&L: +$18,100        |
| ▲ BUY   | 1.0 BTC  | @$32,000 | Mar 2024 |
+------------------------------------------+
| Current Position: 3.0 BTC                |
| Avg Cost: $10,933/unit                   |
+------------------------------------------+
```

## Detailed Changes

### 1. Modify ProfitLossDetailDialog.tsx

**Add new props to receive transactions:**
```tsx
interface ProfitLossDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pnlData: ProfitLossData;
  formatValue: (value: number, showSign?: boolean) => string;
  transactions?: AssetTransaction[];  // NEW
}
```

**Add state to track expanded asset:**
```tsx
const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
```

**Create helper to filter transactions by asset:**
```tsx
const getAssetTransactions = (asset: Asset) => {
  return transactions
    .filter(t => 
      t.asset_id === asset.id || 
      (t.symbol === asset.symbol && t.asset_name === asset.name)
    )
    .sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
};
```

**Transform asset row into expandable section:**
- Import `Collapsible, CollapsibleTrigger, CollapsibleContent` from shadcn/ui
- Import `ChevronDown, ArrowUpRight, ArrowDownLeft` icons
- Wrap each asset row in a Collapsible component
- Add click handler to toggle expansion
- Show transaction list when expanded

**Transaction row design:**
Each transaction shows:
- Type icon (up arrow for buy, down arrow for sell)
- Type label (BUY/SELL)
- Quantity and symbol
- Price per unit
- Date
- Realized P&L (for sells only)

### 2. Modify ProfitLossCard.tsx

Pass transactions to the detail dialog:

```tsx
<ProfitLossDetailDialog
  open={showDetails}
  onOpenChange={setShowDetails}
  pnlData={pnlData}
  formatValue={formatValue}
  transactions={transactions}  // NEW
/>
```

### 3. Modify Index.tsx

Pass transactions to ProfitLossCard:

```tsx
<ProfitLossCard 
  pnlData={pnlData} 
  formatValue={formatValue} 
  delay={0.25}
  transactions={transactions}  // NEW
/>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ProfitLossDetailDialog.tsx` | Add expandable transaction history for each asset |
| `src/components/ProfitLossCard.tsx` | Accept and pass transactions prop |
| `src/pages/Index.tsx` | Pass transactions to ProfitLossCard |

## Expanded Asset Detail View

When an asset is expanded, show:

1. **Transaction History Table**
   - Date
   - Type (Buy/Sell badge)
   - Quantity
   - Price per unit
   - Total value
   - Realized P&L (for sells)

2. **Position Summary** (at bottom of expanded section)
   - Current quantity held
   - Average cost per unit
   - Current value
   - Total cost basis

## Visual Indicators

| Element | Design |
|---------|--------|
| Expandable row | Add subtle chevron icon that rotates on expand |
| Buy transaction | Green up-arrow icon, "BUY" badge |
| Sell transaction | Red down-arrow icon, "SELL" badge |
| Realized P&L | Green/red text based on profit/loss |
| No transactions | "No transactions recorded" message |

## Empty State

If an asset has no transactions (e.g., only cost basis was entered manually):
```text
+------------------------------------------+
| No transactions recorded for this asset. |
| Use Buy/Sell from the asset card to      |
| track your trades.                       |
+------------------------------------------+
```

## Technical Notes

- Transactions are matched to assets by `asset_id` first, then by `symbol` + `asset_name` as fallback
- The transaction list is sorted by date (newest first)
- Collapsible animation provides smooth expand/collapse
- Only one asset can be expanded at a time (accordion behavior optional)
- Performance: transactions are filtered only when asset is expanded
