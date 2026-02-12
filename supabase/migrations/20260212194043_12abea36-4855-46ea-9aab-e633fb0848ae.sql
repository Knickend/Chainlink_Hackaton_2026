
-- Create agent_wallets table
CREATE TABLE public.agent_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  wallet_email TEXT,
  wallet_address TEXT,
  is_authenticated BOOLEAN NOT NULL DEFAULT false,
  enabled_skills TEXT[] NOT NULL DEFAULT '{}',
  spending_limit_per_tx NUMERIC NOT NULL DEFAULT 50,
  spending_limit_daily NUMERIC NOT NULL DEFAULT 200,
  daily_spent NUMERIC NOT NULL DEFAULT 0,
  daily_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own agent wallet"
  ON public.agent_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent wallet"
  ON public.agent_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent wallet"
  ON public.agent_wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent wallet"
  ON public.agent_wallets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_agent_wallets_updated_at
  BEFORE UPDATE ON public.agent_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create agent_actions_log table
CREATE TABLE public.agent_actions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own agent actions"
  ON public.agent_actions_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent actions"
  ON public.agent_actions_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage agent actions"
  ON public.agent_actions_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
