
# Add Sales Bot Analytics to Admin Dashboard

## Overview
Add tracking for the AI sales assistant ("Alex") on the landing page so you can see engagement metrics like total conversations, messages sent, peak usage times, and conversion actions.

## What You'll Be Able to See
- Total conversations started
- Total messages exchanged
- Unique visitors who interacted
- Conversations over time (trend chart)
- Peak usage hours
- Sign-up button clicks from the chat

---

## Technical Implementation

### Step 1: Create Database Table
Create a `sales_bot_interactions` table to log each conversation event:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| session_id | text | Groups messages in same conversation |
| event_type | text | 'conversation_start', 'message', 'cta_click' |
| visitor_ip_hash | text | Anonymized visitor identifier |
| message_role | text | 'user' or 'assistant' |
| created_at | timestamp | When the event occurred |

### Step 2: Update Edge Function
Modify `supabase/functions/sales-bot/index.ts` to:
- Generate a session ID for each conversation
- Log each message exchange to the database
- Track using hashed IP for privacy (no PII stored)

### Step 3: Track CTA Clicks (Frontend)
Update `SalesChatBot.tsx` to call a logging endpoint when users click:
- "Sign Up Free" button
- "View Demo" button

### Step 4: Add Admin Dashboard Section
Create a new "Sales Bot" tab or section in the admin dashboard showing:
- **Stat cards**: Total conversations, Total messages, Unique visitors, CTA clicks
- **Trend chart**: Conversations per day over the last 30 days
- **Hourly heatmap**: Peak engagement times

### Step 5: Analytics Hook
Create `useAdminSalesBotAnalytics.ts` to fetch and aggregate the data.

---

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/migrations/` | Create `sales_bot_interactions` table |
| `supabase/functions/sales-bot/index.ts` | Add logging to database |
| `src/components/landing/SalesChatBot.tsx` | Track CTA button clicks |
| `src/hooks/useAdminSalesBotAnalytics.ts` | New hook for fetching analytics |
| `src/components/admin/SalesBotAnalytics.tsx` | New component for displaying stats |
| `src/pages/Admin.tsx` | Add new tab for Sales Bot analytics |

---

## Privacy Considerations
- Visitor IPs are hashed (not stored in plain text)
- No message content is stored (only metadata)
- Data is only accessible to admins

---

## Expected Dashboard Preview

```text
+------------------+------------------+------------------+------------------+
|  Conversations   |    Messages      |   Unique Users   |   CTA Clicks     |
|       47         |       234        |       38         |       12         |
+------------------+------------------+------------------+------------------+

[======== Conversations Over Time (Line Chart) ========]

| Hour | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|------|-----|-----|-----|-----|-----|-----|-----|
|  9AM |  2  |  3  |  1  |  4  |  2  |  1  |  0  |
|  ...                                            |
```
