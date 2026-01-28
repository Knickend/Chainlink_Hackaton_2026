-- Add expense_date column for tracking when one-time expenses occurred
ALTER TABLE public.expenses 
ADD COLUMN expense_date date DEFAULT NULL;

COMMENT ON COLUMN public.expenses.expense_date IS 'Date when the expense occurred (primarily for one-time expenses)';