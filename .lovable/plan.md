

# Fix Duplicate Debt Payoff Allocations

## Problem

The Investment Strategy card shows **two separate "Debt Payoff" rows**:

1. **User-configured Debt Payoff (33%)** - from investment preferences
2. **Priority Debt Payoff (40%)** - auto-added when high-interest debt is detected

This happens because `calculateDebtAwareAllocations()` adds a new debt row without checking if one already exists from user preferences.

## Solution: Merge Allocations

Consolidate into a single "Debt Payoff" row by taking the **higher** of:
- User's configured debt allocation percentage
- System's recommended allocation for priority debt

## File to Modify

| File | Changes |
|------|---------|
| `src/lib/debtAnalysis.ts` | Rewrite `calculateDebtAwareAllocations()` to merge debt rows |

## Technical Changes

### `src/lib/debtAnalysis.ts` - Lines 300-332

Replace the current `calculateDebtAwareAllocations()` function:

```typescript
/**
 * Calculate debt-aware investment allocations
 * Merges user-configured debt allocation with system-suggested priority allocation
 */
export function calculateDebtAwareAllocations(
  freeMonthlyIncome: number,
  debtAnalysis: DebtAnalysis,
  investmentAllocations: { category: string; percentage: number; amount: number; color: string }[]
): DebtAwareAllocation[] {
  if (freeMonthlyIncome <= 0) {
    return investmentAllocations;
  }

  // Check for existing debt allocation from user preferences
  const existingDebtAlloc = investmentAllocations.find(a => a.category === 'Debt Payoff');
  const existingDebtPercent = existingDebtAlloc?.percentage || 0;
  
  // If no priority debt and no existing debt allocation, return as-is
  if (!debtAnalysis.hasPriorityDebt && existingDebtPercent === 0) {
    return investmentAllocations;
  }
  
  // Use the HIGHER of user preference or system suggestion
  const systemSuggestion = debtAnalysis.hasPriorityDebt ? debtAnalysis.suggestedDebtAllocation : 0;
  const finalDebtPercent = Math.max(existingDebtPercent, systemSuggestion);
  
  // If no debt allocation needed, return non-debt allocations
  if (finalDebtPercent === 0) {
    return investmentAllocations.filter(a => a.category !== 'Debt Payoff');
  }
  
  // Filter out existing debt allocation (we'll add the merged one)
  const nonDebtAllocations = investmentAllocations.filter(a => a.category !== 'Debt Payoff');
  
  // Calculate remaining investment percentage
  const investmentPercent = 100 - finalDebtPercent;
  
  // Calculate total of non-debt allocations to scale proportionally
  const totalNonDebtPercent = nonDebtAllocations.reduce((sum, a) => sum + a.percentage, 0);
  const scaleFactor = totalNonDebtPercent > 0 ? investmentPercent / totalNonDebtPercent : 0;
  
  // Scale down non-debt allocations proportionally
  const scaledInvestments = nonDebtAllocations.map(alloc => ({
    ...alloc,
    percentage: Math.round(alloc.percentage * scaleFactor),
    amount: Math.round(freeMonthlyIncome * (alloc.percentage * scaleFactor / 100)),
  }));
  
  // Create single consolidated debt allocation
  // Mark as priority if system suggested it (high-interest debt detected)
  const debtAllocation: DebtAwareAllocation = {
    category: 'Debt Payoff',
    percentage: finalDebtPercent,
    amount: Math.round(freeMonthlyIncome * (finalDebtPercent / 100)),
    color: 'hsl(var(--destructive))',
    isPriority: debtAnalysis.hasPriorityDebt,
  };
  
  return [debtAllocation, ...scaledInvestments];
}
```

## Logic Flow

```text
User set 33% debt + System suggests 40% (credit card detected)
                          ↓
              Max(33%, 40%) = 40%
                          ↓
         Single "Debt Payoff [Priority]" at 40%
                          ↓
       Remaining 60% scaled across other categories
```

## Edge Cases Handled

| Scenario | Result |
|----------|--------|
| User: 50%, System: 40% | 50% (respect user's aggressive payoff) |
| User: 20%, System: 40% | 40% (upgrade to recommendation) |
| User: 0%, System: 40% | 40% with Priority badge |
| User: 33%, No priority debt | 33% without Priority badge |

## Visual Result

**Before (confusing)**:
```text
Debt Payoff [Priority]    40%  €96.00
Debt Payoff               33%  €79.00  <- duplicate!
Stocks/ETFs                9%  €25.00
```

**After (clear)**:
```text
Debt Payoff [Priority]    40%  €96.00  <- single merged row
Stocks/ETFs               15%  €36.00  <- proportionally scaled
Commodities               20%  €48.00
Emergency Fund            10%  €24.00
```

