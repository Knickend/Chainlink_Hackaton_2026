-- Add unit column to assets table for commodity weight units
ALTER TABLE public.assets 
ADD COLUMN unit text;