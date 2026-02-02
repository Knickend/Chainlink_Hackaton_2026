

# Plan: Subscription Cancellation Questionnaire

## Overview

Add a multi-step cancellation flow that collects user feedback when they cancel their subscription. The questionnaire data will be stored in a new database table and displayed in a dedicated section of the admin dashboard.

## User Experience Flow

When users click "Cancel Subscription":

1. **Step 1**: Show questionnaire dialog asking why they're leaving
2. **Step 2**: Collect the reason with optional additional feedback
3. **Step 3**: Confirm cancellation with the feedback submitted
4. The subscription is then canceled as before

## Questionnaire Design

The questionnaire will include:

**Primary Reason (required, single selection):**
- Too expensive
- Missing features I need
- Found a better alternative
- Not using it enough
- Technical issues / bugs
- Poor customer support
- Just trying it out
- Other

**Optional Follow-up:**
- Text field for additional details
- "What could we have done better?" (optional textarea)
- "Would you consider returning if we addressed your concerns?" (Yes/No/Maybe)

## Database Changes

Create a new `subscription_cancellations` table:

```sql
create table public.subscription_cancellations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  previous_tier text not null,
  primary_reason text not null,
  additional_feedback text,
  would_return text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.subscription_cancellations enable row level security;

-- Users can insert their own cancellation feedback
create policy "Users can insert own cancellation feedback"
  on public.subscription_cancellations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admins can view all cancellation feedback
create policy "Admins can view all cancellations"
  on public.subscription_cancellations
  for select
  using (has_role(auth.uid(), 'admin'));
```

## Technical Implementation

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/settings/CancellationQuestionnaireDialog.tsx` | Multi-step questionnaire dialog |
| `src/components/admin/CancellationFeedback.tsx` | Admin dashboard section showing cancellation reasons |
| `src/hooks/useCancellationFeedback.ts` | Hook to submit and fetch cancellation data |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/settings/SubscriptionSection.tsx` | Replace simple AlertDialog with questionnaire flow |
| `src/hooks/useSubscription.ts` | Update `cancelSubscription` to accept feedback data |
| `src/pages/Admin.tsx` | Add new "Churn" tab for cancellation analytics |
| `src/integrations/supabase/types.ts` | Will auto-update after migration |

## Component Design

### CancellationQuestionnaireDialog

A multi-step dialog component:

```text
+------------------------------------------+
|  Why are you leaving?                    |
|  [Step 1 of 2]                           |
+------------------------------------------+
|  ( ) Too expensive                       |
|  ( ) Missing features I need             |
|  ( ) Found a better alternative          |
|  ( ) Not using it enough                 |
|  ( ) Technical issues / bugs             |
|  ( ) Poor customer support               |
|  ( ) Just trying it out                  |
|  ( ) Other                               |
+------------------------------------------+
|  [Cancel]              [Continue]        |
+------------------------------------------+

+------------------------------------------+
|  Help us improve                         |
|  [Step 2 of 2]                           |
+------------------------------------------+
|  Additional feedback (optional):         |
|  +------------------------------------+  |
|  |                                    |  |
|  +------------------------------------+  |
|                                          |
|  Would you consider returning if we      |
|  addressed your concerns?                |
|  ( ) Yes  ( ) Maybe  ( ) No              |
+------------------------------------------+
|  [Back]          [Cancel Subscription]   |
+------------------------------------------+
```

### Admin Cancellation Dashboard

A new "Churn" tab in the admin dashboard showing:

**Summary Cards:**
- Total cancellations (all time)
- Cancellations this month
- Top cancellation reason
- "Would return" rate

**Charts:**
- Pie chart: Reason distribution
- Bar chart: Cancellations by tier (Standard vs Pro)
- Line chart: Cancellation trend over time

**Table:**
- List of recent cancellations with reason, tier, date, and would-return flag

## Data Flow

```text
User clicks "Cancel Subscription"
          |
          v
+---------------------------+
| CancellationQuestionnaire |
| Dialog opens              |
+---------------------------+
          |
          v
User selects reason + feedback
          |
          v
+---------------------------+
| useCancellationFeedback   |
| submitCancellation()      |
+---------------------------+
          |
          +-- 1. Insert into subscription_cancellations table
          |
          +-- 2. Call cancelSubscription() from useSubscription
          |
          v
+---------------------------+
| Subscription canceled     |
| Toast confirmation        |
+---------------------------+
```

## Admin Analytics Integration

The `useCancellationFeedback` hook will include analytics functions:

```typescript
interface CancellationAnalytics {
  total: number;
  thisMonth: number;
  byReason: { reason: string; count: number }[];
  byTier: { tier: string; count: number }[];
  wouldReturnRate: number;
  trends: { month: string; count: number }[];
  recentCancellations: CancellationRecord[];
}
```

## Implementation Steps

1. **Database**: Create the `subscription_cancellations` table with RLS policies
2. **Hook**: Create `useCancellationFeedback` for data management
3. **Questionnaire**: Build the `CancellationQuestionnaireDialog` component
4. **Integration**: Update `SubscriptionSection` to use the new dialog
5. **Admin UI**: Create `CancellationFeedback` component with charts
6. **Admin Tab**: Add "Churn" tab to the admin dashboard

## Cancellation Reasons Reference

| Reason | Analytics Value |
|--------|-----------------|
| Too expensive | `price` |
| Missing features I need | `features` |
| Found a better alternative | `competitor` |
| Not using it enough | `usage` |
| Technical issues / bugs | `technical` |
| Poor customer support | `support` |
| Just trying it out | `trial` |
| Other | `other` |

