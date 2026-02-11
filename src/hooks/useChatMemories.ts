import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMemory {
  id: string;
  content: string;
  memory_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

const MAX_MEMORIES_TO_RECALL = 10;

export function useChatMemories(isPro: boolean) {
  const { user } = useAuth();

  const recallMemories = useCallback(async (): Promise<ChatMemory[]> => {
    if (!isPro || !user) return [];

    try {
      // Fetch recent conversation memories and all preference/goal/insight memories
      const [conversationResult, contextResult] = await Promise.all([
        supabase
          .from('chat_memories')
          .select('id, content, memory_type, metadata, created_at')
          .eq('user_id', user.id)
          .eq('memory_type', 'conversation')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('chat_memories')
          .select('id, content, memory_type, metadata, created_at')
          .eq('user_id', user.id)
          .in('memory_type', ['preference', 'insight', 'goal'])
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const conversations = (conversationResult.data ?? []) as ChatMemory[];
      const context = (contextResult.data ?? []) as ChatMemory[];

      // Merge and limit
      return [...context, ...conversations].slice(0, MAX_MEMORIES_TO_RECALL);
    } catch (error) {
      console.error('Error recalling chat memories:', error);
      return [];
    }
  }, [isPro, user]);

  const storeMemory = useCallback(async (
    content: string,
    memoryType: 'conversation' | 'preference' | 'insight' | 'goal' = 'conversation',
    metadata: Record<string, any> = {}
  ) => {
    if (!isPro || !user) return;

    try {
      const { error } = await supabase
        .from('chat_memories')
        .insert({
          user_id: user.id,
          content,
          memory_type: memoryType,
          metadata,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing chat memory:', error);
    }
  }, [isPro, user]);

  const storeConversationTurn = useCallback(async (
    userMessage: string,
    assistantResponse: string
  ) => {
    if (!isPro || !user) return;

    // Store a summarized conversation turn
    const summary = `User asked: "${userMessage.substring(0, 200)}" — Advisor responded about: ${assistantResponse.substring(0, 300)}`;
    await storeMemory(summary, 'conversation', {
      user_message_preview: userMessage.substring(0, 100),
      timestamp: new Date().toISOString(),
    });
  }, [isPro, user, storeMemory]);

  return {
    recallMemories,
    storeMemory,
    storeConversationTurn,
  };
}
