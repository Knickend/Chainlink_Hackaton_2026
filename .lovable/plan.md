

# Fix Annual Yield Card - Consistent Height with Popover Dropdown

## Problem

When clicking on the "X sources" dropdown in the Annual Yield card, the card expands vertically to show the breakdown. This causes height inconsistency with the other stat cards (Net Worth, Total Debt, etc.) which remain at their fixed height.

## Solution

Replace the `Collapsible` component with a `Popover` component. The breakdown will appear as a floating dropdown overlay that doesn't affect the card's height, keeping it consistent with the other cards.

## Visual Comparison

**Current (Collapsible - Expands Card)**
```text
+-------------+ +-------------+ +-------------+ +-------------+ +------------------+
| Net Worth   | | Total Debt  | | Income      | | Monthly Net | | Annual Yield     |
| $1,381,682  | | $452,000    | | $2,500.00   | | $-1,272.00  | | $9,370.90        |
| Assets:...  | | $2,112/mo   | | From all... | | After all   | | From investments |
+-------------+ +-------------+ +-------------+ +-------------+ | BREAKDOWN        |
                                                                | [Item 1]         |
                                                                | [Item 2]         |
                                                                | [Item 3]         |
                                                                | [Item 4]         |
                                                                +------------------+
```

**After (Popover - Floating Overlay)**
```text
+-------------+ +-------------+ +-------------+ +-------------+ +-------------+
| Net Worth   | | Total Debt  | | Income      | | Monthly Net | | Ann. Yield  |
| $1,381,682  | | $452,000    | | $2,500.00   | | $-1,272.00  | | $9,370.90   |
| Assets:...  | | $2,112/mo   | | From all... | | After all   | | From inv... |
+-------------+ +-------------+ +-------------+ +-------------+ +-------------+
                                                                  ↑
                                                    +------------------+
                                                    | BREAKDOWN        |
                                                    | [Ethereum]       |
                                                    | [Rabobank]       |
                                                    | [Chainlink]      |
                                                    | [HSBC]           |
                                                    +------------------+
```

All cards remain the same height. The breakdown floats as an overlay.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/YieldBreakdownCard.tsx` | Replace Collapsible with Popover for the breakdown dropdown |

---

## Technical Implementation

### Key Changes

1. **Import Popover** instead of Collapsible
2. **Wrap the trigger button** with `PopoverTrigger`
3. **Move breakdown content** into `PopoverContent`
4. **Style the popover** to match the glass-card aesthetic

### Updated Component Structure

```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Remove: Collapsible, CollapsibleContent, CollapsibleTrigger

return (
  <motion.div className="glass-card p-6 border-bitcoin/30">
    <div className="flex items-start justify-between mb-4">
      <div className="p-2.5 rounded-xl bg-bitcoin/20 text-bitcoin">
        <Coins className="w-5 h-5" />
      </div>
      
      {/* Popover trigger instead of Collapsible */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1 text-sm font-medium...">
            <span>{yieldingAssets.length} sources</span>
            {isOpen ? <ChevronUp /> : <ChevronDown />}
          </button>
        </PopoverTrigger>
        
        {/* Floating popover content */}
        <PopoverContent 
          className="w-72 p-4" 
          align="end"
          sideOffset={8}
        >
          <p className="text-xs font-medium uppercase tracking-wider mb-3">
            Breakdown
          </p>
          <div className="space-y-2">
            {yieldBreakdown.map((item) => (
              // ... breakdown items (same as current)
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
    
    {/* Main card content - always visible, fixed height */}
    <p className="stat-label mb-1">Annual Yield</p>
    <p className="stat-value gradient-text">{formatValue(totalYield)}</p>
    <p className="text-xs text-muted-foreground mt-2">From investments</p>
  </motion.div>
);
```

---

## Summary

- Card height remains consistent with other stat cards
- Breakdown appears as a floating popover aligned to the right
- Same visual styling for breakdown items (two-line layout with category badges)
- Improved UX - dropdown doesn't push other content around

