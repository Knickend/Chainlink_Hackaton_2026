-- Drop and recreate the view with security_invoker enabled
-- This ensures the view respects the RLS policies on the base 'feedback' table

DROP VIEW IF EXISTS public.feedback_user_view;

CREATE VIEW public.feedback_user_view
WITH (security_invoker = on)
AS SELECT 
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

-- Grant access to authenticated users (RLS on feedback table will filter results)
GRANT SELECT ON public.feedback_user_view TO authenticated;