

# Expand Tutorial Tour with Pro Features & Feedback Button

## Overview

Currently, the tutorial has **13 steps** covering core features. This plan expands the tour to include Pro features and the Feedback button, giving new users a complete picture of all capabilities—especially valuable since the tour runs in "Pro mode" to showcase premium features.

## Current Tutorial Steps (13 total)

| # | ID | Target | Title |
|---|-----|--------|-------|
| 1 | welcome | (modal) | Welcome to InControl! |
| 2 | key-metrics | key-metrics | Your Financial Snapshot |
| 3 | net-worth | net-worth-card | Net Worth |
| 4 | unit-selector | unit-selector | View in Different Currencies |
| 5 | theme-toggle | theme-toggle | Light or Dark Mode |
| 6 | charts | charts-section | Visualize Your Wealth |
| 7 | assets | assets-section | Manage Your Assets |
| 8 | add-asset | add-asset-button | Adding Assets is Easy |
| 9 | income | income-card | Track Your Income |
| 10 | expenses | expense-card | Monitor Expenses |
| 11 | debts | debt-card | Manage Your Debt |
| 12 | ai-advisor | ai-advisor-button | Your AI Financial Advisor |
| 13 | completion | (modal) | You're All Set! |

## Proposed New Steps

Add **4 new steps** for Pro features and the Feedback button:

| New # | ID | Target | Title | Content |
|-------|-----|--------|-------|---------|
| 7 | portfolio-history | portfolio-history-card | Track Your Progress (Pro) | See how your net worth changes month-over-month. Compare any two months side-by-side to understand your financial trajectory. |
| 8 | investment-strategy | investment-strategy-card | Smart Investment Advice (Pro) | Get personalized recommendations on how to allocate your monthly surplus based on your debts and risk tolerance. |
| 14 | debt-calculator | debt-payoff-calculator | Debt Freedom Calculator (Pro) | See exactly when you'll be debt-free with different payoff strategies. Compare avalanche vs. snowball methods to save the most interest. |
| 15 | feedback-button | feedback-button | Help Us Improve | Found a bug or have an idea? Click here to submit feedback directly to our team. We read every submission! |

## Updated Step Order (17 total)

1. Welcome (modal)
2. Key Metrics
3. Net Worth
4. Unit Selector
5. Theme Toggle
6. Charts Section
7. **Portfolio History (Pro)** ← NEW
8. **Investment Strategy (Pro)** ← NEW
9. Assets Section
10. Add Asset
11. Income
12. Expenses
13. Debts
14. **Debt Calculator (Pro)** ← NEW
15. AI Advisor
16. **Feedback Button** ← NEW
17. Completion (modal)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Tutorial/tutorialSteps.ts` | Add 4 new step definitions |
| `src/pages/Index.tsx` | Add `data-tutorial` attributes to Pro components and Feedback button |
| `src/components/FeedbackButton.tsx` | Add `data-tutorial="feedback-button"` attribute |

## Implementation Details

### 1. Add Tutorial Targets to Components

**`src/pages/Index.tsx`** - Add `data-tutorial` attributes:

```tsx
{/* Portfolio History Card - Pro feature */}
<div data-tutorial="portfolio-history-card">
  <PortfolioHistoryCard ... />
</div>

{/* Investment Strategy Card - Pro feature */}
<div data-tutorial="investment-strategy-card">
  <InvestmentStrategyCard ... />
</div>

{/* Debt Payoff Calculator - Pro feature */}
<div data-tutorial="debt-payoff-calculator">
  <DebtPayoffCalculator ... />
</div>
```

**`src/components/FeedbackButton.tsx`** - Add attribute to FAB:

```tsx
<Button
  onClick={() => setOpen(true)}
  data-tutorial="feedback-button"
  ...
>
```

### 2. Update Tutorial Steps

**`src/components/Tutorial/tutorialSteps.ts`** - Add new steps:

```typescript
// After 'charts' step (position 6)
{
  id: 'portfolio-history',
  target: 'portfolio-history-card',
  title: 'Track Your Progress',
  content: 'See how your net worth changes month-over-month. Compare any two months side-by-side to understand your financial trajectory. (Pro feature)',
  position: 'left',
},
{
  id: 'investment-strategy',
  target: 'investment-strategy-card',
  title: 'Smart Investment Advice',
  content: 'Get personalized recommendations on how to allocate your monthly surplus based on your debts and financial goals. (Pro feature)',
  position: 'top',
},

// After 'debts' step (before ai-advisor)
{
  id: 'debt-calculator',
  target: 'debt-payoff-calculator',
  title: 'Debt Freedom Calculator',
  content: 'See exactly when you\'ll be debt-free with different payoff strategies. Compare avalanche vs. snowball methods to save the most interest. (Pro feature)',
  position: 'top',
},

// After 'ai-advisor' step (before completion)
{
  id: 'feedback',
  target: 'feedback-button',
  title: 'Help Us Improve',
  content: 'Found a bug or have an idea? Click here to submit feedback directly to our team. We read every submission!',
  position: 'right',
},
```

## Step Flow Diagram

```text
Welcome Modal
     ↓
Key Metrics → Net Worth → Unit Selector → Theme Toggle
     ↓
Charts Section
     ↓
Portfolio History (Pro) → Investment Strategy (Pro)
     ↓
Assets Section → Add Asset
     ↓
Income → Expenses → Debts
     ↓
Debt Calculator (Pro)
     ↓
AI Advisor → Feedback Button
     ↓
Completion Modal
```

## Considerations

### Demo Mode Handling
- The tour already enables Pro mode during the tutorial (`effectiveSubscriptionTier = 'pro'`), so all Pro features will be visible and targetable.
- The Feedback button only shows for authenticated users currently. We'll need to ensure it renders during the tutorial even in demo mode, or skip that step for unauthenticated users.

### Feedback Button in Demo Mode
Two options:
1. **Option A**: Make the Feedback button visible during the tutorial even in demo mode (simpler UX).
2. **Option B**: Skip the feedback step for unauthenticated users (more accurate but less complete tour).

I recommend **Option A** for a more comprehensive tour experience.

## Benefits

1. **Showcases Pro Value**: Users see premium features during onboarding, increasing conversion potential.
2. **Feature Discovery**: Ensures users don't miss key capabilities like debt optimization and portfolio tracking.
3. **Feedback Loop**: Introducing the feedback button encourages user engagement from day one.
4. **Complete Experience**: The tour becomes a comprehensive product walkthrough.

