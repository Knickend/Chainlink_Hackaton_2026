-- Create table for subscription cancellation feedback
CREATE TABLE public.subscription_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  previous_tier text NOT NULL,
  primary_reason text NOT NULL,
  additional_feedback text,
  would_return text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;

-- Users can insert their own cancellation feedback
CREATE POLICY "Users can insert own cancellation feedback"
  ON public.subscription_cancellations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all cancellation feedback
CREATE POLICY "Admins can view all cancellations"
  ON public.subscription_cancellations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));