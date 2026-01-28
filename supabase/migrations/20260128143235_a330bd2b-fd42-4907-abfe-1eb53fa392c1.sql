-- Create user_investment_preferences table
CREATE TABLE public.user_investment_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stocks_allocation NUMERIC NOT NULL DEFAULT 0 CHECK (stocks_allocation >= 0 AND stocks_allocation <= 100),
  crypto_allocation NUMERIC NOT NULL DEFAULT 0 CHECK (crypto_allocation >= 0 AND crypto_allocation <= 100),
  commodities_allocation NUMERIC NOT NULL DEFAULT 0 CHECK (commodities_allocation >= 0 AND commodities_allocation <= 100),
  emergency_fund_target NUMERIC NOT NULL DEFAULT 0 CHECK (emergency_fund_target >= 0 AND emergency_fund_target <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_investment_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own preferences"
ON public.user_investment_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_investment_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_investment_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
ON public.user_investment_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_investment_preferences_updated_at
BEFORE UPDATE ON public.user_investment_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();