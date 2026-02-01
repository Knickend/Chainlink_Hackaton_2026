-- Create a view for user feedback that excludes admin_notes
CREATE VIEW public.feedback_user_view
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  type,
  title,
  description,
  priority,
  status,
  created_at,
  updated_at
FROM public.feedback;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.feedback_user_view IS 'User-safe view of feedback that excludes admin_notes field';