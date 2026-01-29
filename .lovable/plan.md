

# Improve Annual Yield Card Breakdown Design

## Problem

The yield breakdown section in the Annual Yield card looks cramped and cropped:
- Asset names are truncated ("Eth...", "Ra...", "Chai...", "HS...")
- The category label (Staking/Interest) and percentage are crowded together on the same line
- The overall layout feels cramped within the card boundaries

## Current Layout

```text
| Eth...    Staking 2.5%  +$7,054.30 |
| Ra...     Interest 1.3% +$1,404.00 |
```

Everything is crammed on a single line, causing truncation and visual noise.

## Solution

Redesign each yield source as a **two-line item with better visual hierarchy**:

```text
| Ethereum                 +$7,054.30 |
| Staking · 2.5%                      |
|                                     |
| Raiffeisen Savings       +$1,404.00 |
| Interest · 1.3%                     |
```

Each item will have:
1. **Top row**: Full asset name (left) + yield amount (right, green)
2. **Bottom row**: Category badge with yield percentage (muted, smaller text)

This gives more horizontal space for asset names and creates clear visual separation between sources.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/YieldBreakdownCard.tsx` | Redesign breakdown item layout to two-line format |

---

## Technical Implementation

### New Breakdown Item Structure

```tsx
{yieldBreakdown.map((item, idx) => (
  <div
    key={`${item.symbol || item.name}-${idx}`}
    className="py-2 px-3 rounded-lg bg-secondary/30"
  >
    {/* Top row: Asset name and yield amount */}
    <div className="flex items-center justify-between">
      <span className="font-medium text-sm">{item.name}</span>
      <span className="font-mono text-sm text-success">
        +{formatValue(item.yieldAmount)}
      </span>
    </div>
    {/* Bottom row: Category and percentage */}
    <div className="flex items-center gap-1.5 mt-1">
      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded',
        getCategoryBgColor(item.category)
      )}>
        {getCategoryLabel(item.category)}
      </span>
      <span className="text-xs text-muted-foreground">
        {item.yieldPercent.toFixed(1)}% APY
      </span>
    </div>
  </div>
))}
```

### Key Improvements

1. **Full asset names**: No truncation, using full width of top row
2. **Category badges**: Small colored pills for Staking/Interest/Dividend
3. **Vertical spacing**: Each item is a distinct card-like row with padding
4. **Background highlight**: Subtle `bg-secondary/30` to separate items visually
5. **APY suffix**: Adding "APY" after percentage for clarity

### Helper Function for Category Background

```tsx
const getCategoryBgColor = (category: string) => {
  switch (category) {
    case 'crypto':
      return 'bg-bitcoin/20 text-bitcoin';
    case 'banking':
      return 'bg-blue-400/20 text-blue-400';
    case 'stocks':
      return 'bg-success/20 text-success';
    default:
      return 'bg-muted text-muted-foreground';
  }
};
```

---

## Visual Comparison

### Before
```text
+----------------------------------+
| BREAKDOWN                        |
| Eth... Staking 2.5%   +$7,054.30 |
| Ra...  Interest 1.3%  +$1,404.00 |
| Chai.. Staking 4.8%     +$620.50 |
| HS...  Interest 2.3%    +$292.10 |
+----------------------------------+
```

### After
```text
+----------------------------------+
| BREAKDOWN                        |
| ┌──────────────────────────────┐ |
| │ Ethereum           +$7,054.30│ |
| │ [Staking] 2.5% APY           │ |
| └──────────────────────────────┘ |
| ┌──────────────────────────────┐ |
| │ Raiffeisen Savings +$1,404.00│ |
| │ [Interest] 1.3% APY          │ |
| └──────────────────────────────┘ |
| ┌──────────────────────────────┐ |
| │ Chainlink            +$620.50│ |
| │ [Staking] 4.8% APY           │ |
| └──────────────────────────────┘ |
| ┌──────────────────────────────┐ |
| │ HSBC Premier          +$292.10│ |
| │ [Interest] 2.3% APY          │ |
| └──────────────────────────────┘ |
+----------------------------------+
```

---

## Summary

This redesign converts the cramped single-line layout into a cleaner two-line format with:
- Full asset names (no truncation)
- Clear category badges with appropriate colors
- Better visual separation between yield sources
- Consistent styling with the app's glass-card aesthetic

