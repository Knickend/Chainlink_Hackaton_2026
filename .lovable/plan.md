
# Full Admin Dashboard with Analytics & Charts

## Overview

Transform the admin dashboard into a comprehensive analytics hub with advanced KPIs, visualizations, and trend analysis. This will provide administrators with deep insights into user engagement, feedback patterns, and platform health.

---

## New Features

### 1. Enhanced Stats Row (Expanded KPIs)

Replace the current 4-stat grid with a more comprehensive stats section:

| KPI | Description | Data Source |
|-----|-------------|-------------|
| Total Bugs | Count of bug reports | `feedback.type = 'bug'` |
| Feature Requests | Count of feature requests | `feedback.type = 'feature'` |
| Critical Issues | Bugs with critical priority | `feedback.priority = 'critical'` |
| Resolution Rate | Percentage of resolved items | `resolved / total * 100` |
| Avg Response Time | Average time to first update | `avg(updated_at - created_at)` |
| Pending | New + In Progress items | `status = 'new' OR 'in_progress'` |
| Resolved | Completed items | `status = 'resolved'` |
| Declined | Rejected items | `status = 'declined'` |

### 2. User Analytics Section

| KPI | Description | Data Source |
|-----|-------------|-------------|
| Total Users | All registered users | `profiles` count |
| New Users (7d) | Users registered in last 7 days | `profiles.created_at > now - 7d` |
| Active Users | Users with recent activity | Users with assets/expenses updated recently |
| Total Portfolio Value | Sum of all user assets | `sum(assets.value)` |
| Total Tracked Debt | Sum of all user debts | `sum(debts.principal_amount)` |

### 3. Charts Section

**Chart 1: Feedback Trends (Line Chart)**
- Shows feedback submissions over time (weekly buckets)
- Separate lines for bugs vs features
- Uses `created_at` grouped by week

**Chart 2: Status Distribution (Pie Chart)**
- Breakdown by status: New, In Progress, Resolved, Declined
- Visual representation of workload

**Chart 3: Priority Breakdown (Bar Chart)**
- Horizontal bar chart showing priority distribution
- Only for bug reports (features don't have priority)

**Chart 4: User Growth (Area Chart)**
- Shows cumulative user signups over time
- Monthly granularity

### 4. Tabbed Interface

Organize the dashboard into logical tabs:
- **Overview** - All KPI cards and summary charts
- **Feedback** - Existing feedback table with filters
- **Users** - User analytics and growth charts

---

## Technical Implementation

### New Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useAdminAnalytics.ts` | Fetch platform-wide analytics data |
| `src/components/admin/AdminOverview.tsx` | Overview tab with all charts |
| `src/components/admin/AdminUserStats.tsx` | User-specific analytics |
| `src/components/admin/FeedbackTrendChart.tsx` | Line chart for feedback over time |
| `src/components/admin/StatusDistributionChart.tsx` | Pie chart for status breakdown |
| `src/components/admin/PriorityBreakdownChart.tsx` | Bar chart for priority distribution |
| `src/components/admin/UserGrowthChart.tsx` | Area chart for user signups |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Add tabbed layout, integrate new components |
| `src/components/admin/AdminStats.tsx` | Expand to include new KPIs |

---

## Database Considerations

The analytics queries need to be run with admin privileges. Since RLS policies already allow admins to view all feedback, we can query:
- `feedback` - Full access for admins
- `profiles` - Need to add admin read policy
- `assets` - Need to add admin read policy (aggregated only)
- `debts` - Need to add admin read policy (aggregated only)

New RLS policies required for `profiles`, `assets`, and `debts` tables to allow admins to read aggregate data.

---

## Component Structure

```text
Admin Page
├── Header (existing)
├── Tabs
│   ├── Overview Tab
│   │   ├── Enhanced Stats Grid (8 KPIs in 2 rows)
│   │   │   ├── Row 1: Bugs, Features, Critical, Resolution Rate
│   │   │   └── Row 2: Avg Response, Pending, Resolved, Declined
│   │   ├── Charts Row 1
│   │   │   ├── FeedbackTrendChart (spans 2 cols)
│   │   │   └── StatusDistributionChart
│   │   └── User Stats Section
│   │       ├── User KPI Cards (Total, New, Active)
│   │       └── Platform Stats (Portfolio Value, Total Debt)
│   │
│   ├── Feedback Tab
│   │   ├── FeedbackFilters (existing)
│   │   └── FeedbackTable (existing)
│   │
│   └── Users Tab
│       ├── UserGrowthChart
│       ├── Top Users Table (by assets)
│       └── Recent Signups List
│
└── FeedbackDetailDialog (existing)
```

---

## Detailed Code Changes

### 1. useAdminAnalytics.ts Hook

```typescript
// Fetches:
// - Feedback stats with time-series data
// - User counts and growth
// - Platform-wide financial aggregates

interface AdminAnalytics {
  feedback: {
    total: number;
    bugs: number;
    features: number;
    critical: number;
    resolutionRate: number;
    avgResponseHours: number;
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    trends: { week: string; bugs: number; features: number }[];
  };
  users: {
    total: number;
    newLast7Days: number;
    growth: { month: string; count: number }[];
  };
  platform: {
    totalPortfolioValue: number;
    totalTrackedDebt: number;
  };
}
```

### 2. Enhanced AdminStats Component

Current: 4 cards in a row
Updated: 8 cards in 2 rows with additional metrics:
- Row 1: Bugs, Features, Critical, Resolution Rate %
- Row 2: Avg Response Time, Pending, Resolved, Declined

### 3. FeedbackTrendChart Component

- Uses Recharts `LineChart`
- X-axis: Week labels (e.g., "Jan 1", "Jan 8")
- Y-axis: Count of submissions
- Two lines: Bugs (red) and Features (amber)
- Gradient fill under lines

### 4. StatusDistributionChart Component

- Uses Recharts `PieChart`
- 4 segments: New (blue), In Progress (amber), Resolved (green), Declined (red)
- Legend with percentages
- Interactive tooltips

### 5. Admin Page Tabs

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="feedback">Feedback</TabsTrigger>
    <TabsTrigger value="users">Users</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    <AdminOverview analytics={analytics} />
  </TabsContent>
  
  <TabsContent value="feedback">
    {/* Existing filters + table */}
  </TabsContent>
  
  <TabsContent value="users">
    <AdminUserStats analytics={analytics} />
  </TabsContent>
</Tabs>
```

---

## Visual Design

All charts will follow the existing app design patterns:
- `glass-card` styling for containers
- HSL color palette matching existing theme
- Framer Motion animations for entrance
- Recharts library (already installed)
- Responsive grid layouts

### Color Scheme for Charts

| Data Type | Color |
|-----------|-------|
| Bugs | `hsl(0, 84%, 60%)` (destructive) |
| Features | `hsl(43, 96%, 56%)` (warning/gold) |
| New | `hsl(221, 83%, 53%)` (primary blue) |
| In Progress | `hsl(43, 96%, 56%)` (amber) |
| Resolved | `hsl(142, 71%, 45%)` (success green) |
| Declined | `hsl(0, 84%, 60%)` (red) |

---

## Required Database Migration

Add RLS policies for admin access to aggregate data:

```sql
-- Allow admins to count profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to read aggregate asset data
CREATE POLICY "Admins can view all assets for analytics"
  ON assets FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to read aggregate debt data
CREATE POLICY "Admins can view all debts for analytics"
  ON debts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

---

## Implementation Order

1. Add database RLS policies for admin access
2. Create `useAdminAnalytics` hook with all queries
3. Expand `AdminStats` component with new KPIs
4. Create chart components (FeedbackTrendChart, StatusDistributionChart, PriorityBreakdownChart)
5. Create `AdminOverview` component combining stats and charts
6. Create `AdminUserStats` component with UserGrowthChart
7. Update `Admin.tsx` with tabbed layout
8. Test all analytics and charts

---

## Summary

| Component | Type | Description |
|-----------|------|-------------|
| `useAdminAnalytics.ts` | Hook | Centralized analytics data fetching |
| `AdminOverview.tsx` | Component | Overview tab with charts and stats |
| `AdminUserStats.tsx` | Component | User analytics tab |
| `FeedbackTrendChart.tsx` | Component | Line chart for feedback trends |
| `StatusDistributionChart.tsx` | Component | Pie chart for status breakdown |
| `PriorityBreakdownChart.tsx` | Component | Bar chart for priority distribution |
| `UserGrowthChart.tsx` | Component | Area chart for user growth |
| `AdminStats.tsx` | Update | Expanded KPI cards |
| `Admin.tsx` | Update | Tabbed layout integration |
