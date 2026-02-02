-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert cron logs" ON public.cron_job_logs;

-- Create a properly secured policy that only allows service_role to insert
CREATE POLICY "Service role can insert cron logs"
ON public.cron_job_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');