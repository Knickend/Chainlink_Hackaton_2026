import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionTier, BillingPeriod } from '@/lib/subscription';

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  billing_period: BillingPeriod;
  status: 'active' | 'canceled' | 'past_due';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

interface UseSubscriptionReturn {
  subscription: UserSubscription | null;
  tier: SubscriptionTier;
  isLoading: boolean;
  isPro: boolean;
  isSubscribed: boolean;
  billingPeriod: BillingPeriod;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  upgradeTo: (tier: SubscriptionTier, period: BillingPeriod) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscription({
          ...data,
          tier: data.tier as SubscriptionTier,
          billing_period: (data.billing_period || 'monthly') as BillingPeriod,
          status: data.status as 'active' | 'canceled' | 'past_due',
        });
      } else {
        // Create default free subscription if none exists
        const { data: newSub, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            tier: 'free',
            billing_period: 'monthly',
            status: 'active',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setSubscription({
          ...newSub,
          tier: newSub.tier as SubscriptionTier,
          billing_period: (newSub.billing_period || 'monthly') as BillingPeriod,
          status: newSub.status as 'active' | 'canceled' | 'past_due',
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const upgradeTo = useCallback(async (tier: SubscriptionTier, period: BillingPeriod) => {
    if (!user) return;

    try {
      const periodEnd = new Date();
      if (period === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          tier,
          billing_period: period,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSubscription();
      toast({
        title: 'Subscription Updated',
        description: `You're now on the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan!`,
      });
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription',
        variant: 'destructive',
      });
    }
  }, [user, fetchSubscription, toast]);

  const cancelSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSubscription();
      toast({
        title: 'Subscription Canceled',
        description: 'Your subscription will end at the current billing period.',
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  }, [user, fetchSubscription, toast]);

  const resumeSubscription = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: false,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchSubscription();
      toast({
        title: 'Subscription Resumed',
        description: 'Your subscription will continue as normal.',
      });
    } catch (error) {
      console.error('Error resuming subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to resume subscription',
        variant: 'destructive',
      });
    }
  }, [user, fetchSubscription, toast]);

  const tier = subscription?.tier || 'free';

  return {
    subscription,
    tier,
    isLoading,
    isPro: tier === 'pro',
    isSubscribed: tier !== 'free',
    billingPeriod: subscription?.billing_period || 'monthly',
    currentPeriodEnd: subscription?.current_period_end 
      ? new Date(subscription.current_period_end) 
      : null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
    upgradeTo,
    cancelSubscription,
    resumeSubscription,
    refetch: fetchSubscription,
  };
}
