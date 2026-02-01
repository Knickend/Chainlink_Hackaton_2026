-- Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', false);

-- RLS policies for feedback-attachments bucket
-- Users can upload files to their own folder
CREATE POLICY "Users can upload their own feedback attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own attachments
CREATE POLICY "Users can view their own feedback attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own feedback attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all attachments
CREATE POLICY "Admins can view all feedback attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add attachments column to feedback table
ALTER TABLE public.feedback 
ADD COLUMN attachments text[] DEFAULT '{}';

-- Update the feedback_user_view to include attachments
DROP VIEW IF EXISTS public.feedback_user_view;
CREATE VIEW public.feedback_user_view WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  type,
  title,
  description,
  priority,
  status,
  attachments,
  created_at,
  updated_at
FROM public.feedback;