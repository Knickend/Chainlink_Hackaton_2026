
# Plan: Fix Voice Command Dashboard Sync Issue

## Problem Analysis

The voice command successfully added the income to the database (verified: "rental house" $600 exists in the `income` table), but the dashboard didn't update because of a **state synchronization issue**.

### Root Cause

The `FinancialAdvisorChat` component creates its **own instance** of `usePortfolio`:

```typescript
// In FinancialAdvisorChat.tsx (line 77-90)
const {
  assets,
  income,
  expenses,
  addAsset,
  updateAsset,
  ...
} = usePortfolio();
```

Meanwhile, `Index.tsx` creates a **separate instance**:

```typescript
// In Index.tsx (line 145)
const { ... } = usePortfolio(prices, isDemo);
```

When `addIncome` is called via voice command:
1. Data is inserted into Supabase successfully
2. `FinancialAdvisorChat`'s local state is updated
3. But `Index.tsx`'s state remains unchanged (separate hook instance)

## Solution

Pass the portfolio data and actions from `Index.tsx` to `FinancialAdvisorChat` as props, ensuring both use the same state.

### Changes Required

#### 1. Update `FinancialAdvisorChat` to accept props

Add optional props for portfolio data and actions. When provided, use them instead of creating a new hook instance:

```typescript
interface FinancialAdvisorChatProps {
  portfolioData?: {
    assets: Asset[];
    income: Income[];
    expenses: Expense[];
    addAsset: (data: any) => Promise<void>;
    updateAsset: (id: string, data: any) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;
    addIncome: (data: any) => Promise<void>;
    // ... other actions
  };
  debtsData?: {
    debts: Debt[];
    addDebt: (data: any) => Promise<void>;
    // ... other actions
  };
  goalsData?: {
    goals: Goal[];
    addGoal: (data: any) => Promise<void>;
    // ... other actions
  };
}
```

#### 2. Update `Index.tsx` to pass portfolio data

Pass the existing portfolio, debts, and goals data to the chat component:

```typescript
<FinancialAdvisorChat
  portfolioData={{
    assets,
    income,
    expenses,
    addAsset,
    updateAsset,
    deleteAsset,
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
  }}
  debtsData={{
    debts: demoDebts,
    addDebt,
    updateDebt,
    deleteDebt,
  }}
  goalsData={{
    goals: demoGoals,
    addGoal,
    updateGoal,
    deleteGoal,
  }}
/>
```

#### 3. Conditional hook usage in `FinancialAdvisorChat`

Use the passed props when available, otherwise fall back to own hooks (for standalone usage):

```typescript
export function FinancialAdvisorChat({ portfolioData, debtsData, goalsData }: FinancialAdvisorChatProps) {
  // Only create hooks if data not passed as props
  const internalPortfolio = usePortfolio();
  const internalDebts = useDebts();
  const internalGoals = useGoals();
  
  // Use props if provided, otherwise use internal hooks
  const assets = portfolioData?.assets ?? internalPortfolio.assets;
  const income = portfolioData?.income ?? internalPortfolio.income;
  const addIncome = portfolioData?.addIncome ?? internalPortfolio.addIncome;
  // ... etc
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/FinancialAdvisorChat.tsx` | Accept optional portfolio/debts/goals props |
| `src/pages/Index.tsx` | Pass portfolio/debts/goals data to chat component |

## Why This Works

After the change:
1. Voice command calls `addIncome` 
2. This is the **same function** from `Index.tsx`'s `usePortfolio` instance
3. When it updates local state, the dashboard updates immediately
4. Database insert still happens (unchanged)

## Alternative Considered

Using React Query with cache invalidation was considered, but would require more extensive refactoring. The prop-passing approach is simpler and maintains the existing architecture.
