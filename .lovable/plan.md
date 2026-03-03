

## Fix: Chainlink Feeds Showing "N/A" Network

### Root Cause

The `price_cache` table has **legacy rows** without the `network:pair` prefix format:
- `CZK/USD` (no prefix → network = empty → "N/A")
- `sepolia:CZK/USD` (correct)

This creates both "N/A" duplicates and missing network labels. The legacy rows were inserted before the `network:pair` encoding was added.

### Fix

Two changes:

1. **Edge function (`supabase/functions/fetch-chainlink-feeds/index.ts`)** — Line 172: default to `'sepolia'` instead of `''` when no colon is found (matching the frontend's existing fallback logic).

2. **Database cleanup** — Delete legacy rows without network prefix, since the properly-prefixed versions already exist:
   ```sql
   DELETE FROM price_cache 
   WHERE asset_type = 'chainlink' 
   AND symbol NOT LIKE '%:%';
   ```

### Files
- `supabase/functions/fetch-chainlink-feeds/index.ts` — one-line fix (line 172)
- Database migration to clean legacy rows

