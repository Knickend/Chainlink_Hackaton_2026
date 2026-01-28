
# Debt-Aware Investment Strategy Integration

## Overview
Integrate debt payoff calculator insights into the Investment Strategy Card for Pro users. When a user has debt, the strategy card will provide smart recommendations that balance debt reduction with investing, prioritizing high-interest debt when appropriate.

## User Experience

When a Pro user has debt, the Investment Strategy Card will show:
1. A "Debt Strategy" section before investment allocations
2. Smart tips based on debt analysis (e.g., "Pay off 18% APR credit card before investing")
3. Recommended debt payment allocation as part of the overall strategy
4. Visual indicators showing optimal money flow

## Technical Implementation

### 1. Create Debt Analysis Utility

Create helper functions to analyze debt and generate recommendations:

| Function | Purpose |
|----------|---------|
| `analyzeDebtPriority` | Identifies high-interest debt that should be prioritized |
| `calculateOptimalAllocation` | Suggests split between debt payoff and investing |
| `generateDebtTips` | Creates actionable recommendations |

**Logic:**
- High-interest threshold: 7% APR (higher than typical index fund returns)
- If any debt > 7% APR: recommend prioritizing debt payoff
- Credit card debt always flagged as high priority
- Calculate potential interest savings from accelerated payoff

### 2. Modify InvestmentStrategyCard Component

Update the component to accept debt data and display integrated recommendations:

**New Props:**
```typescript
interface InvestmentStrategyCardProps {
  freeMonthlyIncome: number;
  formatValue: (value: number) => string;
  debts?: Debt[];           // NEW: User's debt list
  monthlyPayments?: number; // NEW: Current monthly debt payments
  delay?: number;
}
```

**New UI Sections:**
- "Priority Actions" section when high-interest debt exists
- "Suggested Allocation" combining debt + investment strategy
- Tips panel with specific recommendations

### 3. Update Index.tsx Integration

Pass debt data to the InvestmentStrategyCard:
```tsx
<InvestmentStrategyCard
  freeMonthlyIncome={adjustedMonthlyNet}
  formatValue={formatValue}
  debts={debts}
  monthlyPayments={monthlyPayments}
  delay={0.3}
/>
```

## UI Mockup

### With High-Interest Debt
```
+--------------------------------------------------+
|  Investment Strategy          [Edit]              |
|  Based on $2,340/mo free income                   |
+--------------------------------------------------+
|  PRIORITY: Pay Off High-Interest Debt             |
|  ┌────────────────────────────────────────────┐  |
|  │  Credit Card (18% APR)                     │  |
|  │  Paying $200/mo extra saves $3,400 interest│  |
|  │  [Debt-free 14 months sooner]              │  |
|  └────────────────────────────────────────────┘  |
+--------------------------------------------------+
|  Recommended Monthly Allocation                   |
|                                                   |
|  Debt Payoff         35%    $820                  |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━                      |
|                                                   |
|  Stocks/ETFs         30%    $702                  |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━                      |
|                                                   |
|  Crypto              20%    $468                  |
|  ━━━━━━━━━━━━━━━━━━━━━━                          |
|                                                   |
|  Emergency Fund      15%    $350                  |
|  ━━━━━━━━━━━━━━━━━━━━                            |
+--------------------------------------------------+
|  Tips                                             |
|  - Your credit card APR (18%) exceeds typical    |
|    market returns (7-10%). Prioritize payoff.    |
|  - After debt-free: reallocate to investments    |
+--------------------------------------------------+
```

### Without High-Interest Debt
```
+--------------------------------------------------+
|  Investment Strategy          [Edit]              |
|  Based on $2,340/mo free income                   |
+--------------------------------------------------+
|  Your low-interest debt (3.5% mortgage) can be   |
|  maintained while investing for higher returns.   |
+--------------------------------------------------+
|  Monthly Investment Allocation                    |
|  [Standard allocation display]                    |
+--------------------------------------------------+
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/debtAnalysis.ts` | NEW: Debt analysis utilities and tip generation |
| `src/components/InvestmentStrategyCard.tsx` | Add debt props, priority section, integrated tips |
| `src/pages/Index.tsx` | Pass debts and monthlyPayments to InvestmentStrategyCard |

## Debt Analysis Logic

```text
HIGH_INTEREST_THRESHOLD = 7%

For each debt:
  - If APR > threshold OR debt_type === 'credit_card':
    - Flag as high priority
    - Calculate savings from extra payments
    - Generate specific payoff recommendation

If any high-priority debt exists:
  - Show "Priority Actions" section
  - Suggest allocation split (e.g., 40% debt, 60% invest)
  - Display interest savings potential

If only low-interest debt:
  - Show reassurance message
  - Focus on investment allocation
  - Note that maintaining low-interest debt is acceptable
```

## Smart Tips Generated

Based on debt analysis, generate contextual tips:

| Scenario | Tip |
|----------|-----|
| Credit card debt | "Pay off credit card first - 18% APR far exceeds investment returns" |
| High-interest loan | "Extra $X/mo toward [loan] saves $Y in interest" |
| Only mortgage/low-rate | "Your 3.5% mortgage rate is below market returns - investing makes sense" |
| Multiple high-interest | "Focus on highest APR first (debt avalanche method)" |
| Insufficient payment | "Increase [debt] payment by $X to cover accruing interest" |

## Edge Cases

- No debt: Show standard investment strategy (current behavior)
- All payments insufficient: Warn about growing debt before suggesting investments
- Very high debt-to-income: Suggest focusing entirely on debt reduction
- Mixed debt: Prioritize high-interest while maintaining minimum on low-interest
