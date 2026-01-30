-- Add ToS tracking columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS agreed_to_tos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS agreed_to_tos_at timestamp with time zone;