
# Integrate Financial Goals into Investment Strategy

## Overview
Connect the Financial Goals feature with the Investment Strategy advisor so Pro users get a unified view of where their money should go each month. Currently, goals and investment allocations operate independently, meaning the recommended investment amounts don't account for savings toward goals.

## What You'll Get
- A new "Goal Savings" allocation category in the Investment Strategy
- Smart detection of Emergency Fund goals that links to the Emergency Fund allocation
- Summary of total monthly goal contributions in the strategy view
- Option to include/exclude goal contributions from the investment strategy calculation
- Visual indicator showing goal funding vs investment allocation balance

---

## Implementation Approach

### 1. Enhance Investment Preferences with Goals Awareness

**Update `useInvestmentPreferences` hook:**
- Accept goals data as a parameter
- Calculate total monthly contributions from active goals
- Separate Emergency Fund goals from other savings goals
- Provide a `goalAwareAllocations` calculation that includes goal contributions

### 2. Add Goal Savings Category to Allocations

**Modify allocation calculation logic:**
- Add a "Goal Savings" category showing monthly contributions toward non-emergency goals
- Link Emergency Fund category goals to the Emergency Fund allocation
- Show how goal contributions impact available investment funds

### 3. Update Investment Strategy Card Display

**Enhance `InvestmentStrategyCard` component:**
- Display linked goals under each allocation category (e.g., "Emergency Fund" shows linked goal progress)
- Show total goal contributions alongside investment allocations
- Add visual indicator when goals impact recommended allocations

### 4. Connect Goals in the Investment Preferences Dialog

**Update `InvestmentPreferencesDialog` component:**
- Show active goals and their monthly contributions
- Allow users to toggle whether goals are included in strategy calculations
- Display how goal funding affects the remaining investable amount

---

## Technical Details

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/hooks/useInvestmentPreferences.ts` | Add goals parameter, calculate goal-aware allocations, separate emergency fund goals |
| `src/components/InvestmentStrategyCard.tsx` | Pass goals data, display goal integration section, show linked goals |
| `src/components/InvestmentPreferencesDialog.tsx` | Add goals summary panel, toggle for including goals in calculations |
| `src/pages/Index.tsx` | Pass goals to InvestmentStrategyCard |
| `src/lib/goalAnalysis.ts` | **Create** - New utility for analyzing goal funding requirements |

### Key Logic Changes

**Goal-Aware Allocation Calculation:**
```text
freeMonthlyIncome = income - expenses - debtPayments
goalContributions = sum of all active goal monthly_contribution values
emergencyFundGoalContribution = sum of goals where category = 'emergency'

adjustedInvestable = freeMonthlyIncome - goalContributions
  (or optionally keep separate and show both)

Investment allocations can then:
1. Subtract goal contributions from investable amount
2. Link emergency fund goals to emergency fund allocation percentage
3. Show "Goal Savings" as a distinct category
```

**Emergency Fund Linking:**
- Detect goals with `category: 'emergency'`
- Show these goals under the Emergency Fund allocation row
- Calculate if user is on track to hit emergency fund target

### New UI Elements

**In Investment Strategy Card:**
```text
+----------------------------------------------+
| Investment Strategy                    [Edit] |
| Based on €2,500/mo free income               |
+----------------------------------------------+
| Goal Savings                     15%   €375  |
|   └── New Car (€200/mo)                      |
|   └── Holiday Fund (€175/mo)                 |
+----------------------------------------------+
| Stocks/ETFs                      35%   €875  |
| Emergency Fund                   20%   €500  |
|   └── Emergency Goal: 45% funded             |
| Crypto                           20%   €500  |
| Commodities                      10%   €250  |
+----------------------------------------------+
| Total Investable: €2,125/month               |
+----------------------------------------------+
```

---

## Database Changes
No database changes required. All goal data already exists in the `financial_goals` table with the necessary fields (`monthly_contribution`, `category`, `target_amount`, `current_amount`).

---

## User Experience Flow

1. User creates financial goals with monthly contribution amounts
2. User opens Investment Strategy (Pro feature)
3. Strategy automatically detects goal contributions
4. Emergency Fund goals link to Emergency Fund allocation
5. Other goals appear as "Goal Savings" category
6. User can adjust whether goals reduce investable amount or are shown separately

---

## Edge Cases to Handle

- Goals without monthly contributions (no impact on strategy)
- Completed goals (excluded from calculations)
- Goal contributions exceeding free income (warning state)
- No goals set (strategy works as currently)
- Emergency fund goal larger than emergency fund allocation (suggest adjustment)
