
-- Create table for privacy shielded addresses
CREATE TABLE public.privacy_shielded_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shielded_address TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.privacy_shielded_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own shielded addresses
CREATE POLICY "Users can view their own shielded addresses"
ON public.privacy_shielded_addresses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own shielded addresses
CREATE POLICY "Users can insert their own shielded addresses"
ON public.privacy_shielded_addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can manage all shielded addresses
CREATE POLICY "Service role can manage shielded addresses"
ON public.privacy_shielded_addresses
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
