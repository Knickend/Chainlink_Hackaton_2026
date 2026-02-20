import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DCAStrategy {
  id: string;
  user_id: string;
  from_token: string;
  to_token: string;
  frequency: string;
  amount_per_execution: number;
  total_budget_usd: number | null;
  total_spent_usd: number;
  tokens_accumulated: number;
  max_executions: number | null;
  executions_completed: number;
  dip_threshold_pct: number;
  dip_multiplier: number;
  is_active: boolean;
  last_executed_at: string | null;
  next_execution_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DCAExecution {
  id: string;
  strategy_id: string;
  user_id: string;
  from_token: string;
  to_token: string;
  amount_usd: number;
  token_amount: number | null;
  token_price_usd: number | null;
  trigger_type: string;
  tx_hash: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface CreateStrategyInput {
  from_token?: string;
  to_token: string;
  frequency: string;
  amount_per_execution: number;
  total_budget_usd?: number | null;
  max_executions?: number | null;
  dip_threshold_pct?: number;
  dip_multiplier?: number;
}

export function useDCAStrategies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<DCAStrategy[]>([]);
  const [executions, setExecutions] = useState<DCAExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStrategies = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('dca_strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies((data as unknown as DCAStrategy[]) || []);
    } catch (err) {
      console.error('Failed to fetch DCA strategies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchExecutions = useCallback(async (strategyId?: string) => {
    if (!user) return;
    try {
      let query = supabase
        .from('dca_executions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (strategyId) {
        query = query.eq('strategy_id', strategyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setExecutions((data as unknown as DCAExecution[]) || []);
    } catch (err) {
      console.error('Failed to fetch DCA executions:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchStrategies();
    fetchExecutions();
  }, [fetchStrategies, fetchExecutions]);

  const createStrategy = useCallback(async (input: CreateStrategyInput) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('dca_strategies')
      .insert({
        user_id: user.id,
        from_token: input.from_token || 'USDC',
        to_token: input.to_token,
        frequency: input.frequency,
        amount_per_execution: input.amount_per_execution,
        total_budget_usd: input.total_budget_usd ?? null,
        max_executions: input.max_executions ?? null,
        dip_threshold_pct: input.dip_threshold_pct ?? 0,
        dip_multiplier: input.dip_multiplier ?? 1,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create strategy', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Strategy Created', description: `DCA into ${input.to_token} configured` });
    await fetchStrategies();
    return data;
  }, [user, toast, fetchStrategies]);

  const toggleStrategy = useCallback(async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('dca_strategies')
      .update({ is_active: isActive } as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update strategy', variant: 'destructive' });
      throw error;
    }
    toast({ title: isActive ? 'Strategy Activated' : 'Strategy Paused' });
    await fetchStrategies();
  }, [toast, fetchStrategies]);

  const deleteStrategy = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('dca_strategies')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete strategy', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Strategy Deleted' });
    await fetchStrategies();
  }, [toast, fetchStrategies]);

  return {
    strategies,
    executions,
    isLoading,
    createStrategy,
    toggleStrategy,
    deleteStrategy,
    fetchExecutions,
    refetch: fetchStrategies,
  };
}
