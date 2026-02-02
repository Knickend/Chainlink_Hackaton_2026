

# Add Recommended Monthly Savings for Goals Behind Schedule

## Overview
Enhance the financial goal planner to provide actionable recommendations when a user is behind on their goal. When a goal's current monthly contribution is insufficient to meet the target date, the system will calculate and display the recommended monthly savings amount needed to get back on track.

## What You'll Get
- **Recommended amount calculation**: Automatically compute the required monthly savings to meet the target date
- **Visual recommendation display**: Show the recommended amount prominently when a goal is "Behind"
- **Shortfall indicator**: Display how much more per month is needed compared to current contribution
- **Quick-apply action**: Button to update the monthly contribution to the recommended amount
- **Smart tooltips**: Explain why the goal is behind and what the recommendation means

---

## Implementation Approach

### 1. Add Calculation Functions to goalAnalysis.ts

Create new utility functions to calculate:
- **Required monthly savings**: Based on remaining amount and months until target date
- **Monthly shortfall**: Difference between current and required contribution
- **Feasibility check**: Whether the recommended amount is achievable based on available income

```text
calculateRequiredMonthlySavings(goal):
  remaining = target_amount - current_amount
  monthsUntilDeadline = months between now and target_date
  
  if monthsUntilDeadline <= 0:
    return remaining (need full amount now)
  
  return remaining / monthsUntilDeadline

getGoalRecommendation(goal):
  returns {
    requiredMonthlySavings: number
    currentMonthlySavings: number (or 0)
    monthlyShortfall: number
    canMeetDeadline: boolean
    adjustedDeadline: Date (if cannot meet current deadline)
  }
```

### 2. Update useGoals Hook

Add new helper function to the hook:
- `calculateRecommendedSavings(goal: Goal): GoalRecommendation`
- Return the recommendation data alongside existing calculations

### 3. Enhance Goal Display Components

**GoalsOverviewCard.tsx**:
- Show recommendation badge/indicator for goals with "Behind" status
- Display compact recommendation text: "Save €X/mo to stay on track"

**ViewAllGoalsDialog.tsx**:
- Add expanded recommendation section for "Behind" goals
- Show current vs. recommended comparison
- Include "Apply Recommendation" button to update monthly contribution

**EditGoalDialog.tsx**:
- Add recommendation callout when editing a "Behind" goal
- Pre-fill option to use the recommended amount

---

## Technical Details

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/lib/goalAnalysis.ts` | Add `calculateRequiredMonthlySavings`, `getGoalRecommendation` functions |
| `src/hooks/useGoals.ts` | Add `calculateRecommendedSavings` helper, export recommendation type |
| `src/components/GoalsOverviewCard.tsx` | Display recommendation for behind goals |
| `src/components/ViewAllGoalsDialog.tsx` | Add recommendation section with apply button |
| `src/components/EditGoalDialog.tsx` | Show recommendation callout, add quick-apply option |

### New Types

```typescript
interface GoalRecommendation {
  requiredMonthlySavings: number;     // What's needed to meet the deadline
  currentMonthlySavings: number;       // Current contribution (or 0)
  monthlyShortfall: number;            // Difference between required and current
  monthsRemaining: number;             // Months until target date
  isAchievable: boolean;               // Based on months remaining (>0)
  suggestedDeadline?: Date;            // If current deadline can't be met
}
```

### Key Calculation Logic

```typescript
function calculateRequiredMonthlySavings(goal: Goal): number {
  if (!goal.target_date) return 0;
  
  const remaining = goal.target_amount - goal.current_amount;
  if (remaining <= 0) return 0; // Goal already reached
  
  const now = new Date();
  const targetDate = new Date(goal.target_date);
  const monthsRemaining = differenceInMonths(targetDate, now);
  
  if (monthsRemaining <= 0) {
    // Deadline passed or is this month - need full amount
    return remaining;
  }
  
  return Math.ceil(remaining / monthsRemaining);
}

function getGoalRecommendation(goal: Goal): GoalRecommendation {
  const requiredMonthlySavings = calculateRequiredMonthlySavings(goal);
  const currentMonthlySavings = goal.monthly_contribution || 0;
  const monthlyShortfall = Math.max(0, requiredMonthlySavings - currentMonthlySavings);
  
  // Calculate months remaining
  const now = new Date();
  const targetDate = goal.target_date ? new Date(goal.target_date) : null;
  const monthsRemaining = targetDate ? differenceInMonths(targetDate, now) : 0;
  
  // If current contribution exists, calculate when goal would actually be met
  let suggestedDeadline: Date | undefined;
  if (currentMonthlySavings > 0 && monthlyShortfall > 0) {
    const remaining = goal.target_amount - goal.current_amount;
    const actualMonthsNeeded = Math.ceil(remaining / currentMonthlySavings);
    suggestedDeadline = new Date();
    suggestedDeadline.setMonth(suggestedDeadline.getMonth() + actualMonthsNeeded);
  }
  
  return {
    requiredMonthlySavings,
    currentMonthlySavings,
    monthlyShortfall,
    monthsRemaining,
    isAchievable: monthsRemaining > 0,
    suggestedDeadline,
  };
}
```

---

## UI Design

### GoalsOverviewCard - Behind Goal Item
```text
+--------------------------------------------------+
| 🚗 New Car                          [Behind] [✏️] |
|--------------------------------------------------|
| €3,000 / €15,000                           20%   |
| [=====                               ] progress   |
|                                                   |
| ⚠️ Save €800/mo to meet your deadline             |
|    (currently €500/mo - need €300 more)           |
+--------------------------------------------------+
```

### ViewAllGoalsDialog - Expanded Recommendation
```text
+--------------------------------------------------+
| 🚗 New Car                                        |
| High Priority • Due: Aug 15, 2026                |
|--------------------------------------------------|
| €3,000 of €15,000                          20%   |
| [=====                               ]            |
| €500/month              ~24 months remaining      |
|--------------------------------------------------|
| ⚠️ RECOMMENDATION                                 |
|                                                   |
| To reach your goal by Aug 2026, you need to save |
| €800/month instead of €500/month.                |
|                                                   |
| Monthly shortfall: €300                          |
|                                                   |
| [ Apply €800/month ]  [ Extend Deadline → Dec ]  |
+--------------------------------------------------+
```

---

## Edge Cases to Handle

1. **No target date set**: No recommendation shown (status is "no_deadline")
2. **Deadline already passed**: Show recommendation as "full amount needed now"
3. **Goal already on track**: No recommendation needed
4. **No current monthly contribution**: Show full required amount as recommendation
5. **Goal completed**: No recommendation displayed
6. **Zero months remaining**: Recommend saving the full remaining amount

---

## User Experience Flow

1. User creates a goal with a target date and monthly contribution
2. System calculates if contribution is sufficient to meet deadline
3. If behind: Display recommendation with required monthly amount
4. User can:
   - Click "Apply Recommendation" to update their monthly contribution
   - Click "Extend Deadline" to adjust the target date instead
   - Manually edit the goal to set their own amount

