-- Create table for tracking sales bot interactions
CREATE TABLE public.sales_bot_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('conversation_start', 'message', 'cta_click')),
  visitor_ip_hash TEXT,
  message_role TEXT CHECK (message_role IN ('user', 'assistant') OR message_role IS NULL),
  cta_type TEXT CHECK (cta_type IN ('signup', 'demo') OR cta_type IS NULL),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_sales_bot_session ON public.sales_bot_interactions(session_id);
CREATE INDEX idx_sales_bot_created_at ON public.sales_bot_interactions(created_at);
CREATE INDEX idx_sales_bot_event_type ON public.sales_bot_interactions(event_type);

-- Enable RLS
ALTER TABLE public.sales_bot_interactions ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anonymous landing page visitors)
CREATE POLICY "Anyone can insert interactions"
ON public.sales_bot_interactions
FOR INSERT
WITH CHECK (true);

-- Only admins can read interactions
CREATE POLICY "Admins can view all interactions"
ON public.sales_bot_interactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));