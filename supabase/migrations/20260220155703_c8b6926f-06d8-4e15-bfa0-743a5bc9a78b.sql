
-- =============================================
-- DCA Strategies table
-- =============================================
CREATE TABLE public.dca_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_token TEXT NOT NULL DEFAULT 'USDC',
  to_token TEXT NOT NULL DEFAULT 'WETH',
  frequency TEXT NOT NULL DEFAULT 'daily',
  amount_per_execution NUMERIC NOT NULL DEFAULT 10,
  total_budget_usd NUMERIC,
  total_spent_usd NUMERIC NOT NULL DEFAULT 0,
  tokens_accumulated NUMERIC NOT NULL DEFAULT 0,
  max_executions INTEGER,
  executions_completed INTEGER NOT NULL DEFAULT 0,
  dip_threshold_pct NUMERIC DEFAULT 0,
  dip_multiplier NUMERIC DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- DCA Executions table
-- =============================================
CREATE TABLE public.dca_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id UUID NOT NULL REFERENCES public.dca_strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL,
  token_amount NUMERIC,
  token_price_usd NUMERIC,
  trigger_type TEXT NOT NULL DEFAULT 'scheduled',
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS on dca_strategies
-- =============================================
ALTER TABLE public.dca_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own strategies"
  ON public.dca_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategies"
  ON public.dca_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON public.dca_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON public.dca_strategies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all strategies"
  ON public.dca_strategies FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- RLS on dca_executions
-- =============================================
ALTER TABLE public.dca_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own executions"
  ON public.dca_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all executions"
  ON public.dca_executions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- updated_at trigger on dca_strategies
-- =============================================
CREATE TRIGGER update_dca_strategies_updated_at
  BEFORE UPDATE ON public.dca_strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
