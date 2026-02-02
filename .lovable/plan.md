

# Automated Monthly Portfolio Snapshots

## Overview
Implement an automated system that creates portfolio snapshots for all users at the end of each month. This ensures consistent historical data for trend calculations without relying on users to manually trigger snapshots.

## What You'll Get
- **Automatic monthly snapshots**: Every user gets a snapshot created on the 1st of each month at midnight
- **Bulk processing edge function**: New endpoint to process all users in a single scheduled call
- **Login-based fallback**: Auto-create missing snapshot when user logs in (catches new users or failed jobs)
- **Real trend data**: Dashboard stat cards will show actual month-over-month changes

---

## Implementation Approach

### 1. Create Bulk Snapshot Edge Function

Create a new edge function `create-bulk-snapshots` that iterates through all users with profiles and creates snapshots for each. This is separate from the existing user-triggered function to keep concerns clean.

**Why a separate function?**
- The existing function requires user authentication (JWT)
- The cron job will call with a service role key, not individual user tokens
- Bulk processing has different error handling needs (continue on individual failures)

### 2. Enable pg_cron Extension

Enable the `pg_cron` and `pg_net` extensions via migration to allow scheduling database jobs that can call HTTP endpoints.

### 3. Schedule Monthly Cron Job

Create a cron job that runs at 00:05 on the 1st of every month, calling the bulk snapshot function with the service role key for authentication.

### 4. Add Login-Based Auto-Capture

Update the dashboard to automatically create a snapshot for the current month if one doesn't exist when the user visits. This handles:
- New users who signed up mid-month
- Edge cases where the cron job failed
- Users who want fresh data immediately

### 5. Connect Real Trends to Dashboard

Once snapshots are reliably captured, update the stat cards to display real month-over-month percentage changes instead of hardcoded values.

---

## Technical Details

### New Edge Function: create-bulk-snapshots

```text
Location: supabase/functions/create-bulk-snapshots/index.ts

Flow:
1. Verify request has service role authorization (not user JWT)
2. Fetch all user_ids from profiles table
3. For each user:
   - Fetch their assets, income, expenses, debts
   - Calculate totals and breakdown
   - Upsert snapshot for current month
   - Log success/failure per user
4. Return summary: { processed: N, succeeded: N, failed: N }
```

### Database Migration

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

### Cron Job Setup

Using the Supabase insert tool (not migration) to create the scheduled job:

```sql
SELECT cron.schedule(
  'monthly-portfolio-snapshots',
  '5 0 1 * *',  -- At 00:05 on day 1 of every month
  $$
  SELECT net.http_post(
    url := 'https://edtudwkmswyjxamkdkbu.supabase.co/functions/v1/create-bulk-snapshots',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Config Update

```toml
# supabase/config.toml addition
[functions.create-bulk-snapshots]
verify_jwt = false
```

### Frontend Auto-Capture (Index.tsx)

```typescript
// In IndexContent component
const { hasSnapshots, snapshots, createSnapshot } = usePortfolioHistory();

// Auto-create snapshot for current month if missing
useEffect(() => {
  if (!isLoading && user && snapshots.length >= 0) {
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"
    const hasCurrentMonth = snapshots.some(s => 
      s.snapshot_month.startsWith(currentMonth)
    );
    
    if (!hasCurrentMonth) {
      // Silently create snapshot in background
      createSnapshot().catch(console.error);
    }
  }
}, [isLoading, user, snapshots]);
```

### Files to Create/Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-bulk-snapshots/index.ts` | **NEW** - Bulk processing function for cron |
| `supabase/config.toml` | Add config for new function |
| `src/pages/Index.tsx` | Add auto-capture on login |
| `src/hooks/usePortfolioHistory.ts` | Add `metricTrends` calculation |
| `src/components/StatCard.tsx` | Add tooltip for trend context |
| Migration SQL | Enable pg_cron and pg_net extensions |

---

## Edge Function: create-bulk-snapshots

```typescript
// Key logic
Deno.serve(async (req) => {
  // Verify service role authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(url, serviceRoleKey);
  
  // Get all users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id');

  const results = { processed: 0, succeeded: 0, failed: 0 };
  
  for (const profile of profiles) {
    try {
      // Fetch user's financial data
      const [assets, debts, income, expenses] = await Promise.all([
        supabase.from('assets').select('*').eq('user_id', profile.user_id),
        supabase.from('debts').select('*').eq('user_id', profile.user_id),
        supabase.from('income').select('*').eq('user_id', profile.user_id),
        supabase.from('expenses').select('*').eq('user_id', profile.user_id),
      ]);

      // Calculate totals...
      // Upsert snapshot...
      
      results.succeeded++;
    } catch (error) {
      console.error(`Failed for user ${profile.user_id}:`, error);
      results.failed++;
    }
    results.processed++;
  }

  return new Response(JSON.stringify(results));
});
```

---

## Trend Calculation Enhancement

Update `usePortfolioHistory.ts` to provide real trends:

```typescript
const metricTrends = useMemo(() => {
  if (snapshots.length < 2) return null;
  
  const current = snapshots[0];  // Most recent
  const previous = snapshots[1]; // Previous month
  
  return {
    netWorth: {
      value: Math.abs(((current.net_worth - previous.net_worth) / previous.net_worth) * 100),
      isPositive: current.net_worth >= previous.net_worth
    },
    totalDebt: {
      value: Math.abs(((current.total_debt - previous.total_debt) / previous.total_debt) * 100),
      isPositive: current.total_debt <= previous.total_debt  // Less debt = positive
    },
    monthlyNet: {
      value: Math.abs(...),
      isPositive: currentMonthlyNet >= previousMonthlyNet
    }
  };
}, [snapshots]);
```

---

## Cron Schedule Explained

```text
5 0 1 * *
│ │ │ │ │
│ │ │ │ └── Any day of week
│ │ │ └──── Any month
│ │ └────── Day 1 of month
│ └──────── Hour 0 (midnight)
└────────── Minute 5

= Runs at 00:05 AM on the 1st of every month
```

---

## Edge Cases Handled

| Scenario | Solution |
|----------|----------|
| New user signs up mid-month | Auto-capture on first login creates their first snapshot |
| Cron job fails | Login-based fallback ensures user gets snapshot |
| User has no financial data | Snapshot created with zeros (valid baseline) |
| User deletes all assets | Next snapshot reflects the change |
| Timezone differences | UTC-based scheduling ensures consistency |

---

## Security Considerations

1. **Bulk function auth**: Uses service role key verification, not user JWT
2. **No user data exposure**: Bulk function runs server-side only
3. **RLS respected**: Using service role client bypasses RLS appropriately for system operations
4. **Cron secret**: Service role key used only in database-level cron job

