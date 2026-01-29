-- Add tutorial completion tracking column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT false;