
-- Create chat_memories table for Pro-only advisor memory
CREATE TABLE public.chat_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL,
  memory_type text NOT NULL DEFAULT 'conversation',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_memories ENABLE ROW LEVEL SECURITY;

-- Users can only read their own memories
CREATE POLICY "Users can view their own chat memories"
ON public.chat_memories
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own memories
CREATE POLICY "Users can insert their own chat memories"
ON public.chat_memories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own memories
CREATE POLICY "Users can delete their own chat memories"
ON public.chat_memories
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Index for fast user lookups ordered by recency
CREATE INDEX idx_chat_memories_user_created ON public.chat_memories (user_id, created_at DESC);

-- Index for memory type filtering
CREATE INDEX idx_chat_memories_type ON public.chat_memories (user_id, memory_type);

-- Trigger for updated_at
CREATE TRIGGER update_chat_memories_updated_at
BEFORE UPDATE ON public.chat_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
