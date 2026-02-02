

## Add Tooltip to Trend Indicators

This plan adds a helpful tooltip to the trend percentage indicators on the dashboard stat cards, explaining that the change is compared to the previous month.

---

### What Will Change

When users hover over the trend percentage (e.g., "↑ 14.5%") on any stat card, they will see a tooltip that says **"Change vs last month"**.

---

### Implementation Steps

1. **Update StatCard Component** (`src/components/StatCard.tsx`)
   - Import the Tooltip components from `@/components/ui/tooltip`
   - Wrap the existing trend indicator `<div>` with `Tooltip`, `TooltipTrigger`, and `TooltipContent`
   - Display "Change vs last month" as the tooltip text
   - Add `cursor-pointer` styling to indicate the element is interactive

---

### Technical Details

The change is localized to a single file:

**`src/components/StatCard.tsx`**

```tsx
// Add import
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// Wrap trend indicator with tooltip
{trend && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center justify-end gap-1 text-sm font-medium cursor-pointer',
            trend.isPositive ? 'text-success' : 'text-danger'
          )}
        >
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value).toFixed(1)}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Change vs last month</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

This approach:
- Uses the existing shadcn/ui tooltip component for consistency
- Provides clear context without cluttering the UI
- Applies to all stat cards that display a trend (Net Worth, Total Debt, Monthly Income, Monthly Net)

