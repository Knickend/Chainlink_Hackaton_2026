
-- Add rebalance settings columns to user_investment_preferences
ALTER TABLE public.user_investment_preferences
  ADD COLUMN rebalance_threshold integer NOT NULL DEFAULT 10,
  ADD COLUMN rebalance_frequency text NOT NULL DEFAULT 'weekly',
  ADD COLUMN last_rebalance_check timestamptz;

-- Create rebalance_alerts table
CREATE TABLE public.rebalance_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  drift_data jsonb NOT NULL,
  max_drift numeric NOT NULL,
  is_dismissed boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.rebalance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own alerts
CREATE POLICY "Users can view their own rebalance alerts"
  ON public.rebalance_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rebalance alerts"
  ON public.rebalance_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rebalance alerts"
  ON public.rebalance_alerts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert rebalance alerts"
  ON public.rebalance_alerts FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- Index for quick lookup
CREATE INDEX idx_rebalance_alerts_user_dismissed
  ON public.rebalance_alerts (user_id, is_dismissed)
  WHERE NOT is_dismissed;
