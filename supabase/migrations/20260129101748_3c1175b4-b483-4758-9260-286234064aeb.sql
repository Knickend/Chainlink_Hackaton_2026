-- Add currency column to debts table
ALTER TABLE debts ADD COLUMN currency text DEFAULT 'USD';

-- Add currency column to income table  
ALTER TABLE income ADD COLUMN currency text DEFAULT 'USD';

-- Add currency column to expenses table
ALTER TABLE expenses ADD COLUMN currency text DEFAULT 'USD';