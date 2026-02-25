import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type DCAStrategy = Tables<'dca_strategies'>;
export type DCAExecution = Tables<'dca_executions'>;

export interface CreateDCAStrategyInput {
  to_token: string;
  amount_per_execution: number;
  frequency: string;
  dip_threshold_pct?: number;
  dip_multiplier?: number;
  total_budget_usd?: number;
  max_executions?: number;
}

export function useDCAStrategies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<DCAStrategy[]>([]);
  const [executions, setExecutions] = useState<DCAExecution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStrategies = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('dca_strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStrategies(data || []);
    } catch (err) {
      console.error('Failed to fetch DCA strategies:', err);
    }
  }, [user]);

  const fetchExecutions = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('dca_executions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setExecutions(data || []);
    } catch (err) {
      console.error('Failed to fetch DCA executions:', err);
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStrategies(), fetchExecutions()]);
      setLoading(false);
    };
    load();
  }, [fetchStrategies, fetchExecutions]);

  const createStrategy = useCallback(async (input: CreateDCAStrategyInput) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('dca_strategies')
        .insert({
          user_id: user.id,
          from_token: 'USDC',
          to_token: input.to_token,
          amount_per_execution: input.amount_per_execution,
          frequency: input.frequency,
          dip_threshold_pct: input.dip_threshold_pct ?? 0,
          dip_multiplier: input.dip_multiplier ?? 1,
          total_budget_usd: input.total_budget_usd ?? null,
          max_executions: input.max_executions ?? null,
        });
      if (error) throw error;
      toast({ title: 'Strategy Created', description: `DCA into ${input.to_token} set up successfully.` });
      await fetchStrategies();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create strategy', variant: 'destructive' });
    }
  }, [user, toast, fetchStrategies]);

  const toggleStrategy = useCallback(async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('dca_strategies')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
      setStrategies(prev => prev.map(s => s.id === id ? { ...s, is_active: isActive } : s));
      toast({ title: isActive ? 'Strategy Activated' : 'Strategy Paused' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update strategy', variant: 'destructive' });
    }
  }, [toast]);

  const deleteStrategy = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('dca_strategies')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setStrategies(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Strategy Deleted' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete strategy', variant: 'destructive' });
    }
  }, [toast]);

  const totalCommitted = strategies
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + s.amount_per_execution, 0);

  return {
    strategies,
    executions,
    loading,
    createStrategy,
    toggleStrategy,
    deleteStrategy,
    totalCommitted,
    refetch: () => Promise.all([fetchStrategies(), fetchExecutions()]),
  };
}
