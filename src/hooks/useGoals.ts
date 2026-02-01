import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Goal, GoalCategory, GoalPriority, FOREX_RATES_TO_USD, BankingCurrency } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionTier, getGoalLimit } from '@/lib/subscription';

export interface GoalInput {
  name: string;
  category: GoalCategory;
  target_amount: number;
  current_amount?: number;
  currency?: string;
  target_date?: string;
  monthly_contribution?: number;
  priority?: GoalPriority;
  notes?: string;
}

export function useGoals(subscriptionTier: SubscriptionTier = 'free') {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate goal limit based on subscription tier
  const goalLimit = getGoalLimit(subscriptionTier);
  const canAddGoal = goalLimit === undefined || goals.length < goalLimit;

  // Fetch all goals
  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGoals(data.map(g => ({
        id: g.id,
        name: g.name,
        category: g.category as GoalCategory,
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount),
        currency: g.currency || 'USD',
        target_date: g.target_date || undefined,
        monthly_contribution: g.monthly_contribution ? Number(g.monthly_contribution) : undefined,
        priority: g.priority as GoalPriority,
        notes: g.notes || undefined,
        is_completed: g.is_completed,
        completed_at: g.completed_at || undefined,
        created_at: g.created_at,
        updated_at: g.updated_at,
      })));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading goals',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Add a new goal
  const addGoal = useCallback(async (goalData: GoalInput) => {
    if (!user) return;

    // Check limit
    if (!canAddGoal) {
      toast({
        variant: 'destructive',
        title: 'Goal limit reached',
        description: `Your ${subscriptionTier} plan allows up to ${goalLimit} goal${goalLimit === 1 ? '' : 's'}. Upgrade to add more.`,
      });
      return;
    }

    try {
      const { data, error } = await supabase.from('financial_goals').insert({
        user_id: user.id,
        name: goalData.name,
        category: goalData.category,
        target_amount: goalData.target_amount,
        current_amount: goalData.current_amount || 0,
        currency: goalData.currency || 'USD',
        target_date: goalData.target_date || null,
        monthly_contribution: goalData.monthly_contribution || null,
        priority: goalData.priority || 'medium',
        notes: goalData.notes || null,
      }).select().single();

      if (error) throw error;

      const newGoal: Goal = {
        id: data.id,
        name: data.name,
        category: data.category as GoalCategory,
        target_amount: Number(data.target_amount),
        current_amount: Number(data.current_amount),
        currency: data.currency || 'USD',
        target_date: data.target_date || undefined,
        monthly_contribution: data.monthly_contribution ? Number(data.monthly_contribution) : undefined,
        priority: data.priority as GoalPriority,
        notes: data.notes || undefined,
        is_completed: data.is_completed,
        completed_at: data.completed_at || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setGoals(prev => [newGoal, ...prev]);
      toast({ title: 'Goal added successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding goal',
        description: error.message,
      });
    }
  }, [user, toast, canAddGoal, goalLimit, subscriptionTier]);

  // Update an existing goal
  const updateGoal = useCallback(async (id: string, goalData: Partial<GoalInput & { is_completed?: boolean }>) => {
    if (!user) return;

    try {
      const updatePayload: Record<string, any> = {};
      
      if (goalData.name !== undefined) updatePayload.name = goalData.name;
      if (goalData.category !== undefined) updatePayload.category = goalData.category;
      if (goalData.target_amount !== undefined) updatePayload.target_amount = goalData.target_amount;
      if (goalData.current_amount !== undefined) updatePayload.current_amount = goalData.current_amount;
      if (goalData.currency !== undefined) updatePayload.currency = goalData.currency;
      if (goalData.target_date !== undefined) updatePayload.target_date = goalData.target_date || null;
      if (goalData.monthly_contribution !== undefined) updatePayload.monthly_contribution = goalData.monthly_contribution || null;
      if (goalData.priority !== undefined) updatePayload.priority = goalData.priority;
      if (goalData.notes !== undefined) updatePayload.notes = goalData.notes || null;
      if (goalData.is_completed !== undefined) {
        updatePayload.is_completed = goalData.is_completed;
        if (goalData.is_completed) {
          updatePayload.completed_at = new Date().toISOString();
        } else {
          updatePayload.completed_at = null;
        }
      }

      const { error } = await supabase.from('financial_goals').update(updatePayload).eq('id', id);

      if (error) throw error;

      setGoals(prev => prev.map(goal =>
        goal.id === id ? { 
          ...goal, 
          ...goalData,
          completed_at: goalData.is_completed ? new Date().toISOString() : goal.completed_at,
          updated_at: new Date().toISOString(),
        } : goal
      ));

      toast({ title: 'Goal updated successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating goal',
        description: error.message,
      });
    }
  }, [user, toast]);

  // Delete a goal
  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('financial_goals').delete().eq('id', id);
      if (error) throw error;

      setGoals(prev => prev.filter(goal => goal.id !== id));
      toast({ title: 'Goal deleted successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting goal',
        description: error.message,
      });
    }
  }, [user, toast]);

  // Calculate progress for a goal
  const calculateProgress = useCallback((goal: Goal): number => {
    if (goal.target_amount <= 0) return 0;
    return Math.min(100, (goal.current_amount / goal.target_amount) * 100);
  }, []);

  // Calculate months to goal
  const calculateMonthsToGoal = useCallback((goal: Goal): number | undefined => {
    if (!goal.monthly_contribution || goal.monthly_contribution <= 0) return undefined;
    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / goal.monthly_contribution);
  }, []);

  // Calculate estimated completion date
  const calculateEstimatedDate = useCallback((goal: Goal): Date | undefined => {
    const months = calculateMonthsToGoal(goal);
    if (months === undefined) return undefined;
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }, [calculateMonthsToGoal]);

  // Get goal status
  const getGoalStatus = useCallback((goal: Goal): 'completed' | 'on_track' | 'behind' | 'no_deadline' => {
    if (goal.is_completed) return 'completed';
    if (!goal.target_date) return 'no_deadline';
    
    const estimatedDate = calculateEstimatedDate(goal);
    if (!estimatedDate) return 'no_deadline';
    
    const targetDate = new Date(goal.target_date);
    return estimatedDate <= targetDate ? 'on_track' : 'behind';
  }, [calculateEstimatedDate]);

  // Calculate totals in USD
  const totalGoalTarget = goals.reduce((sum, g) => {
    const currency = g.currency || 'USD';
    const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
    return sum + (g.target_amount * rate);
  }, 0);

  const totalGoalSaved = goals.reduce((sum, g) => {
    const currency = g.currency || 'USD';
    const rate = FOREX_RATES_TO_USD[currency as BankingCurrency] || 1;
    return sum + (g.current_amount * rate);
  }, 0);

  const overallProgress = totalGoalTarget > 0 ? (totalGoalSaved / totalGoalTarget) * 100 : 0;

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    refetch: fetchGoals,
    calculateProgress,
    calculateMonthsToGoal,
    calculateEstimatedDate,
    getGoalStatus,
    totalGoalTarget,
    totalGoalSaved,
    overallProgress,
    canAddGoal,
    goalLimit,
  };
}
