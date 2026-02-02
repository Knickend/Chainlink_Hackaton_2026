-- Create table for cron job execution history
CREATE TABLE public.cron_job_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  processed_count INTEGER DEFAULT 0,
  succeeded_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view cron logs
CREATE POLICY "Admins can view cron job logs"
ON public.cron_job_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs (used by edge functions)
CREATE POLICY "Service role can insert cron logs"
ON public.cron_job_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_cron_job_logs_job_name ON public.cron_job_logs(job_name);
CREATE INDEX idx_cron_job_logs_execution_time ON public.cron_job_logs(execution_time DESC);