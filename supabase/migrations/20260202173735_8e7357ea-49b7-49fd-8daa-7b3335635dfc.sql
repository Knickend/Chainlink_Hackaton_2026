-- Add is_recurring and income_date columns to the income table
ALTER TABLE public.income 
ADD COLUMN is_recurring boolean NOT NULL DEFAULT true;

ALTER TABLE public.income 
ADD COLUMN income_date date DEFAULT NULL;

-- Add a comment explaining the columns
COMMENT ON COLUMN public.income.is_recurring IS 'True for monthly recurring income, false for one-time income';
COMMENT ON COLUMN public.income.income_date IS 'Date for one-time income entries';