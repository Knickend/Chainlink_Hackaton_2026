-- Drop the public insert policy that allows anyone to insert
DROP POLICY IF EXISTS "Anyone can insert interactions" ON public.sales_bot_interactions;

-- Create policy for service role only (used by the edge function)
CREATE POLICY "Service role can insert interactions" 
ON public.sales_bot_interactions 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');