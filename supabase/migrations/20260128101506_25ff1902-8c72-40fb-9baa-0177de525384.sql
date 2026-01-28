-- Add is_recurring column to expenses table for Pro feature (one-time expenses)
ALTER TABLE public.expenses 
ADD COLUMN is_recurring boolean NOT NULL DEFAULT true;

-- Add a comment for clarity
COMMENT ON COLUMN public.expenses.is_recurring IS 'True for recurring monthly expenses, false for one-time expenses';