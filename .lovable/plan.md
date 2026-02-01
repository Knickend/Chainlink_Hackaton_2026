

# Customizable Financial Goals Feature

## Overview
Add a financial goals tracking system that allows users to set savings targets for specific purposes like buying a car, vacations, home down payments, emergency funds, etc. Users can track progress toward each goal and see how long it will take to achieve them based on their current savings rate.

## Goal Limits by Subscription Tier

| Tier | Goal Limit | Rationale |
|------|------------|-----------|
| **Free** | 1 goal | Lets users try the feature, encourages upgrade |
| **Standard** | 3 goals | Good for typical financial planning |
| **Pro** | Unlimited | Full access for serious planners |

## What Users Can Track Per Goal

- **Goal name** (e.g., "New Car", "Summer Vacation 2026")
- **Goal category** (car, holiday, emergency fund, home, education, wedding, retirement, other)
- **Target amount** (in user's preferred currency)
- **Current saved amount** (manual input)
- **Target date** (optional deadline)
- **Monthly contribution** (optional - for projection calculations)
- **Priority** (low, medium, high)
- **Notes** (optional description)

## Feature Breakdown

### Goal Progress Tracking
- Visual progress bar showing percentage complete
- Estimated completion date based on monthly contribution
- "On track" / "Behind" / "Ahead" status indicator

### Dashboard Integration
- New **Goals Overview Card** in the main dashboard
- Shows top 3 goals with progress bars
- Quick-add button for new goals
- "View All" link to full goals management
- Positioned between the charts row and Investment Strategy section

### Goal Categories with Icons

| Category | Icon | Example Uses |
|----------|------|--------------|
| Car | Car | New car, car repairs |
| Holiday | Plane | Vacation, travel |
| Emergency | Shield | Emergency fund |
| Home | Home | Down payment, renovations |
| Education | GraduationCap | Courses, tuition |
| Wedding | Heart | Wedding, honeymoon |
| Retirement | Landmark | Early retirement savings |
| Other | Target | Custom goals |

## Database Design

### New Table: `financial_goals`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| user_id | uuid | Owner (references auth.users) |
| name | text | Goal name |
| category | text | Goal type (car, holiday, emergency, home, education, wedding, retirement, other) |
| target_amount | numeric | Target savings amount |
| current_amount | numeric | Current saved amount (default 0) |
| currency | text | Currency code (default 'USD') |
| target_date | date | Optional deadline |
| monthly_contribution | numeric | Optional monthly savings amount |
| priority | text | low, medium, high (default 'medium') |
| notes | text | Optional description |
| is_completed | boolean | Completion status (default false) |
| completed_at | timestamptz | When goal was achieved |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### Row Level Security (RLS)
- Enable RLS on the table
- Users can only SELECT, INSERT, UPDATE, DELETE their own goals (where `auth.uid() = user_id`)

## UI Components to Create

| Component | Purpose |
|-----------|---------|
| `GoalsOverviewCard.tsx` | Dashboard summary card showing top 3 goals with progress bars |
| `AddGoalDialog.tsx` | Form dialog to create a new goal with category picker |
| `EditGoalDialog.tsx` | Form dialog to modify an existing goal |
| `ViewAllGoalsDialog.tsx` | Full list view showing all goals with management options |
| `GoalsTeaser.tsx` | Upgrade prompt shown when user reaches their tier limit |

## Hook: `useGoals.ts`

Manages all goal operations following the existing `useDebts.ts` pattern:
- Fetch user's goals from database
- Add/update/delete goals
- Calculate progress metrics (percentage, months remaining)
- Check tier limits before adding new goals
- Convert currency amounts using existing forex utilities

## Progress Calculation Logic

```text
progress = (current_amount / target_amount) * 100

if monthly_contribution > 0:
  remaining = target_amount - current_amount
  months_to_goal = remaining / monthly_contribution
  estimated_date = today + months_to_goal months

status:
  - "Completed" if is_completed
  - "On Track" if estimated_date <= target_date
  - "Behind" if estimated_date > target_date
  - "No deadline" if no target_date set
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/GoalsOverviewCard.tsx` | Main dashboard card with goal summaries |
| `src/components/AddGoalDialog.tsx` | Create goal dialog with form |
| `src/components/EditGoalDialog.tsx` | Edit goal dialog |
| `src/components/ViewAllGoalsDialog.tsx` | Full goals list with CRUD |
| `src/components/GoalsTeaser.tsx` | Upgrade prompt for tier limits |
| `src/hooks/useGoals.ts` | Goals data management hook |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `Goal` interface and `GoalCategory` type |
| `src/lib/subscription.ts` | Add `goalLimit` to `SubscriptionPlan` interface and plans |
| `src/lib/mockData.ts` | Add `mockGoals` array for demo mode |
| `src/pages/Index.tsx` | Import and render `GoalsOverviewCard` in dashboard |
| `src/components/landing/PricingSection.tsx` | Add goals limit to feature lists |
| Database migration | Create `financial_goals` table with RLS policies |

## Integration into Dashboard

The GoalsOverviewCard will be placed in `Index.tsx` between the charts row and the Investment Strategy section:

```text
[Key Metrics Row]
[Charts Row + Portfolio History]
[Goals Overview Card]        <-- NEW
[Investment Strategy]
[Asset Categories]
[Income / Expenses / Debt]
```

## Demo Mode

In demo mode, display 3 sample goals to showcase the feature:
1. "Emergency Fund" - $15,000 target, $9,750 saved (65%)
2. "Summer Vacation 2026" - $5,000 target, $2,000 saved (40%)
3. "New Car" - $35,000 target, $8,750 saved (25%)

## Subscription Feature List Updates

**Free tier features** (in PricingSection):
- Add: "1 financial goal"

**Standard tier features**:
- Add: "3 financial goals"

**Pro tier features**:
- Add: "Unlimited financial goals"

## Technical Notes

1. **Currency handling**: Uses existing `convertCurrency()` and `FOREX_RATES_TO_USD` utilities for multi-currency support
2. **Tier limit enforcement**: Check goal count against tier limit before allowing new goals; show GoalsTeaser upgrade prompt when limit reached
3. **Tutorial integration**: Will not be added to tutorial initially to keep onboarding focused
4. **Demo mode behavior**: Show mock goals for unauthenticated users, same as other features

