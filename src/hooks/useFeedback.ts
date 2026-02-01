import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Feedback, FeedbackInsert, FeedbackUpdate, FeedbackStatus, FeedbackType } from '@/lib/feedback.types';

interface FeedbackFilters {
  type?: FeedbackType;
  status?: FeedbackStatus;
  userId?: string;
}

export function useFeedback(filters?: FeedbackFilters, isAdmin = false) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch feedback (user's own or all for admin)
  const { data: feedback, isLoading, error } = useQuery({
    queryKey: ['feedback', user?.id, isAdmin, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      // Use the view for non-admin users to hide admin_notes field
      // Admins query the base table to see admin_notes
      if (isAdmin) {
        let query = supabase
          .from('feedback')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters?.type) {
          query = query.eq('type', filters.type);
        }
        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.userId) {
          query = query.eq('user_id', filters.userId);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching feedback:', error);
          throw error;
        }
        return data as Feedback[];
      } else {
        // Non-admin: use view that excludes admin_notes
        const { data, error } = await supabase
          .from('feedback_user_view' as 'feedback')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching feedback:', error);
          throw error;
        }
        
        // Map view results to Feedback type (admin_notes will be undefined)
        return (data ?? []).map(item => ({
          ...item,
          admin_notes: null,
        })) as Feedback[];
      }
    },
    enabled: !!user?.id,
  });

  // Submit new feedback
  const submitMutation = useMutation({
    mutationFn: async (input: FeedbackInsert) => {
      if (!user?.id) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          type: input.type,
          title: input.title,
          description: input.description,
          priority: input.priority || 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your feedback!',
      });
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update feedback (admin only)
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FeedbackUpdate }) => {
      const { data, error } = await supabase
        .from('feedback')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      toast({
        title: 'Feedback updated',
        description: 'Changes saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feedback.',
        variant: 'destructive',
      });
    },
  });

  return {
    feedback: feedback ?? [],
    isLoading,
    error,
    submitFeedback: submitMutation.mutateAsync,
    updateFeedback: updateMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
