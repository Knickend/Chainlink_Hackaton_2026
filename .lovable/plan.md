
# Enhanced Portfolio Performance Overview (Pro Feature)

## Overview
Enhance the existing Performance tracking for Pro users by storing actual monthly portfolio snapshots that users can review individually and compare side-by-side to understand how their wealth evolved over time.

## User Experience Flow

1. **Automatic Snapshots**: System captures monthly snapshots of portfolio state (net worth, assets, income, expenses, debts)
2. **Historical View**: Pro users can browse past months and see detailed breakdowns
3. **Month Comparison**: Select two months to compare side-by-side with change indicators
4. **Visual Timeline**: Interactive chart showing net worth progression with clickable data points

## Technical Implementation

### 1. Database Schema
Create a `portfolio_snapshots` table to store monthly data:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User reference |
| snapshot_month | DATE | First day of the month (e.g., 2026-01-01) |
| net_worth | NUMERIC | Total net worth at snapshot time |
| total_assets | NUMERIC | Sum of all assets |
| total_debt | NUMERIC | Sum of all debts |
| total_income | NUMERIC | Monthly income |
| total_expenses | NUMERIC | Monthly expenses |
| assets_breakdown | JSONB | Category breakdown (banking, crypto, stocks, commodities) |
| created_at | TIMESTAMP | When snapshot was created |

RLS policies ensure users can only access their own snapshots.

### 2. New Hook: `usePortfolioHistory`
- Fetch all snapshots for the current user
- Calculate month-over-month changes
- Provide comparison utilities between any two months
- Trigger snapshot creation (manual or automatic)

### 3. New Components

**PortfolioHistoryCard** (Enhanced PerformanceCard replacement)
- Interactive bar/line chart with clickable months
- Shows selected month's detailed breakdown
- Month selector dropdown for quick navigation

**MonthComparisonDialog**
- Side-by-side comparison of two selected months
- Shows absolute and percentage changes for each metric
- Visual indicators (green/red) for improvements/declines
- Category-level breakdown comparison

**SnapshotDetailView**
- Detailed view of a single month's data
- Pie chart of asset allocation at that time
- Key metrics summary

### 4. Snapshot Creation Strategy
- **Automatic**: Edge function runs on the 1st of each month to create snapshots for all users
- **Manual**: "Take Snapshot" button for Pro users to capture current state anytime
- **Backfill**: On first Pro subscription, offer to create initial snapshot from current data

### 5. Dashboard Integration
- Replace or enhance existing `PerformanceCard` for Pro users
- Add "View History" button that opens the full comparison interface
- Keep the simple YTD/12M toggle for quick overview

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/..._portfolio_snapshots.sql` | Create | New table with RLS policies |
| `supabase/functions/create-monthly-snapshot/index.ts` | Create | Edge function for automatic snapshots |
| `src/hooks/usePortfolioHistory.ts` | Create | Data fetching and comparison logic |
| `src/components/PortfolioHistoryCard.tsx` | Create | Enhanced performance view with history |
| `src/components/MonthComparisonDialog.tsx` | Create | Side-by-side month comparison |
| `src/components/SnapshotDetailView.tsx` | Create | Single month detailed breakdown |
| `src/lib/types.ts` | Modify | Add `PortfolioSnapshot` interface |
| `src/pages/Index.tsx` | Modify | Integrate new history component for Pro users |

## UI Mockup

### Portfolio History Card
```
+--------------------------------------------------+
|  Portfolio History              [Take Snapshot]   |
|  Pro Feature                                      |
+--------------------------------------------------+
|  [Interactive Timeline Chart - 12 months]         |
|  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        |
|  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep ...  |
+--------------------------------------------------+
|  Selected: January 2026                           |
|  ┌─────────────┐  ┌─────────────┐                |
|  │ Net Worth   │  │ Change      │                |
|  │ $125,450    │  │ +$3,200     │                |
|  │             │  │ +2.6%       │                |
|  └─────────────┘  └─────────────┘                |
|                                                   |
|  [Compare with Another Month]  [View Details]    |
+--------------------------------------------------+
```

### Month Comparison View
```
+--------------------------------------------------+
|  Comparing: Dec 2025 vs Jan 2026                  |
+--------------------------------------------------+
|           December        January      Change     |
|  ─────────────────────────────────────────────── |
|  Net Worth   $122,250     $125,450    +$3,200    |
|  Assets      $142,250     $147,450    +$5,200    |
|  Debts       $20,000      $22,000     +$2,000    |
|  Income      $8,500       $8,500      $0         |
|  Expenses    $4,200       $4,350      +$150      |
|  ─────────────────────────────────────────────── |
|  Asset Breakdown:                                 |
|  Banking     $45,000      $46,200     +2.7%      |
|  Crypto      $32,000      $38,500     +20.3%     |
|  Stocks      $55,250      $52,750     -4.5%      |
|  Commodities $10,000      $10,000     0%         |
+--------------------------------------------------+
```

## Edge Cases Handled
- **No snapshots yet**: Prompt to create first snapshot
- **Only one snapshot**: Disable comparison, show single month view
- **Missing months**: Indicate gaps in timeline
- **First-time Pro user**: Offer to create initial snapshot immediately
