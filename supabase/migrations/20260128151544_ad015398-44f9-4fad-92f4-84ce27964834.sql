-- Add debt_allocation column to user_investment_preferences
ALTER TABLE public.user_investment_preferences
ADD COLUMN debt_allocation integer NOT NULL DEFAULT 0;