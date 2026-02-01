
# Fix: Add 'mining' to Income Type Constraint

## Problem
The database has a CHECK constraint on the `income` table that restricts the `type` column to only three values: `'work'`, `'passive'`, and `'investment'`. When trying to add Bitcoin mining income with type `'mining'`, the database rejects it.

The original constraint from the migration:
```sql
type TEXT NOT NULL CHECK (type IN ('work', 'passive', 'investment'))
```

## Solution
Create a database migration to update the CHECK constraint to include `'mining'` as a valid income type.

## Database Migration

```sql
-- Drop the existing check constraint
ALTER TABLE public.income DROP CONSTRAINT IF EXISTS income_type_check;

-- Add updated check constraint with 'mining' included
ALTER TABLE public.income ADD CONSTRAINT income_type_check 
  CHECK (type IN ('work', 'passive', 'investment', 'mining'));
```

## Files to Change

| File | Change |
|------|--------|
| New migration file | Add `'mining'` to the income type CHECK constraint |

## Result
After this change, users will be able to add Bitcoin mining income without encountering the database constraint error.
