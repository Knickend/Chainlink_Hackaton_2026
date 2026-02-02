import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type CancellationReason = 
  | 'price' 
  | 'features' 
  | 'competitor' 
  | 'usage' 
  | 'technical' 
  | 'support' 
  | 'trial' 
  | 'other';

export interface CancellationFeedback {
  id: string;
  user_id: string;
  previous_tier: string;
  primary_reason: CancellationReason;
  additional_feedback: string | null;
  would_return: string | null;
  created_at: string;
}

export interface CancellationSubmission {
  previousTier: string;
  primaryReason: CancellationReason;
  additionalFeedback?: string;
  wouldReturn?: 'yes' | 'maybe' | 'no';
}

export interface CancellationAnalytics {
  total: number;
  thisMonth: number;
  byReason: { reason: string; count: number; label: string }[];
  byTier: { tier: string; count: number }[];
  wouldReturnRate: number;
  trends: { month: string; count: number }[];
  recentCancellations: CancellationFeedback[];
}

const REASON_LABELS: Record<CancellationReason, string> = {
  price: 'Too expensive',
  features: 'Missing features',
  competitor: 'Found alternative',
  usage: 'Not using enough',
  technical: 'Technical issues',
  support: 'Poor support',
  trial: 'Just trying out',
  other: 'Other',
};

export function useCancellationFeedback(isAdmin = false) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cancellations, setCancellations] = useState<CancellationFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCancellations = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subscription_cancellations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCancellations((data as CancellationFeedback[]) || []);
    } catch (error) {
      console.error('Error fetching cancellations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchCancellations();
    }
  }, [isAdmin, fetchCancellations]);

  const submitCancellation = useCallback(async (submission: CancellationSubmission): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('subscription_cancellations')
        .insert({
          user_id: user.id,
          previous_tier: submission.previousTier,
          primary_reason: submission.primaryReason,
          additional_feedback: submission.additionalFeedback || null,
          would_return: submission.wouldReturn || null,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error submitting cancellation feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, toast]);

  // Calculate analytics from cancellations data
  const getAnalytics = useCallback((): CancellationAnalytics => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count by reason
    const reasonCounts: Record<string, number> = {};
    const tierCounts: Record<string, number> = {};
    let wouldReturnCount = 0;
    let thisMonthCount = 0;

    cancellations.forEach((c) => {
      // By reason
      reasonCounts[c.primary_reason] = (reasonCounts[c.primary_reason] || 0) + 1;
      
      // By tier
      tierCounts[c.previous_tier] = (tierCounts[c.previous_tier] || 0) + 1;
      
      // Would return
      if (c.would_return === 'yes' || c.would_return === 'maybe') {
        wouldReturnCount++;
      }
      
      // This month
      if (new Date(c.created_at) >= startOfMonth) {
        thisMonthCount++;
      }
    });

    // Convert to arrays
    const byReason = Object.entries(reasonCounts).map(([reason, count]) => ({
      reason,
      count,
      label: REASON_LABELS[reason as CancellationReason] || reason,
    })).sort((a, b) => b.count - a.count);

    const byTier = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
    }));

    // Calculate trends (last 6 months)
    const trends: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const count = cancellations.filter((c) => {
        const date = new Date(c.created_at);
        return date >= monthDate && date <= monthEnd;
      }).length;
      
      trends.push({ month: monthName, count });
    }

    return {
      total: cancellations.length,
      thisMonth: thisMonthCount,
      byReason,
      byTier,
      wouldReturnRate: cancellations.length > 0 
        ? Math.round((wouldReturnCount / cancellations.length) * 100) 
        : 0,
      trends,
      recentCancellations: cancellations.slice(0, 10),
    };
  }, [cancellations]);

  return {
    cancellations,
    isLoading,
    isSubmitting,
    submitCancellation,
    getAnalytics,
    refetch: fetchCancellations,
    REASON_LABELS,
  };
}
