
# Plan: Show Closed Positions with Realized P&L in "By Asset" Tab

## Problem

When you sell an asset completely (like Apple shares), the realized loss/gain is correctly shown in the "By Category" tab but **not** in the "By Asset" tab. This happens because:

1. The "By Asset" tab only displays `assetsWithCostBasis` - assets that currently exist in your portfolio
2. Once all shares are sold, the Apple asset is removed from your portfolio
3. The transaction history (with the -$29,500 loss) still exists, but has no corresponding asset to attach to

## Solution

Create a new concept of **"Closed Positions"** - assets that were fully sold and no longer exist in the portfolio, but have realized P&L from their transactions.

The "By Asset" tab will show:
1. **Current positions** (existing assets with unrealized P&L)
2. **Closed positions** (fully sold assets with realized P&L from transaction history)

## Visual Example

**After fix:**
```
By Asset Tab:
├─ Bitcoin         +$289,734.09 (unrealized)
├─ Silver          +$8,925.00 (unrealized)
├─ Apple [Closed]  -$29,500.00 (realized)
    └─ Transaction: SELL 100 AAPL @ $205.00
       P&L: -$29,500.00
```

---

## Implementation Details

### Step 1: Update useProfitLoss Hook

Add logic to extract "closed positions" from transactions - assets that have sell transactions but don't exist in the current portfolio.

**File: `src/hooks/useProfitLoss.ts`**

```typescript
// New interface for closed positions
interface ClosedPosition {
  id: string;
  name: string;
  symbol: string;
  category: string;
  realizedPnL: number;
  realizedPnLPercent: number;
  totalSold: number; // Total quantity sold
  totalProceeds: number; // Total sale value
}

// Update ProfitLossData interface
export interface ProfitLossData {
  // ... existing fields ...
  closedPositions: ClosedPosition[];
}
```

Logic:
1. Group all sell transactions by asset (using `asset_name` + `symbol` combination)
2. Check if the asset still exists in current portfolio
3. If not, create a "closed position" entry with aggregated realized P&L
4. Calculate percentage based on original cost basis (if available from buy transactions)

### Step 2: Update ProfitLossDetailDialog UI

Modify the "By Asset" tab to display closed positions alongside current positions.

**File: `src/components/ProfitLossDetailDialog.tsx`**

Add a new section after `assetsWithCostBasis`:

```tsx
{/* Closed Positions Section */}
{closedPositions.length > 0 && (
  <div className="mt-4">
    <p className="text-xs font-medium text-muted-foreground mb-2 px-3">
      Closed Positions
    </p>
    {closedPositions.map(position => (
      <Collapsible key={position.id}>
        <CollapsibleTrigger>
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium flex items-center gap-2">
                  {position.name}
                  <Badge variant="secondary" className="text-[10px]">Closed</Badge>
                </p>
                <p className="text-xs text-muted-foreground">{position.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={position.realizedPnL >= 0 ? 'text-success' : 'text-destructive'}>
                {position.realizedPnL >= 0 ? '+' : ''}{formatValue(position.realizedPnL)}
              </p>
              <p className="text-xs text-muted-foreground">Realized</p>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Show transaction history for this closed position */}
        </CollapsibleContent>
      </Collapsible>
    ))}
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useProfitLoss.ts` | Add `ClosedPosition` interface; Add logic to extract closed positions from transactions; Include in return data |
| `src/components/ProfitLossDetailDialog.tsx` | Add "Closed Positions" section to "By Asset" tab; Display with "Closed" badge; Show transaction history |

---

## Benefits

1. **Complete P&L visibility**: Users can see all realized gains/losses, not just from current holdings
2. **Transaction history preserved**: Users can still view the buy/sell history for closed positions
3. **Consistent with "By Category"**: The "By Asset" tab will now show the same total as "By Category"
4. **Clear distinction**: "Closed" badge makes it obvious which positions are no longer held

---

## Edge Cases Handled

1. **Partial sales**: If only some shares were sold, the asset remains "open" with both unrealized and realized P&L
2. **Multiple sell transactions**: All sells for the same closed asset are grouped together
3. **Missing buy history**: If no buy transactions exist, we still show the realized P&L from sells
4. **Re-opened positions**: If you sell all shares then buy again, it becomes a new open position (old sells remain as "closed position" history)
