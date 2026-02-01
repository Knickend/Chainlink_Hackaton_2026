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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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
          attachments: (item as any).attachments || [],
        })) as Feedback[];
      }
    },
    enabled: !!user?.id,
  });

  // Upload attachment to storage
  const uploadAttachment = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error('Must be logged in');

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Only PNG, JPG, and WEBP are allowed.');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('feedback-attachments')
      .upload(fileName, file);

    if (error) throw error;

    return fileName;
  };

  // Get signed URL for viewing attachment
  const getAttachmentUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('feedback-attachments')
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  };

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
          attachments: input.attachments || [],
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
    uploadAttachment,
    getAttachmentUrl,
    isSubmitting: submitMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
