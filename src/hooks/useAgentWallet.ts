import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AgentWalletStatus {
  connected: boolean;
  wallet_address: string | null;
  wallet_email: string | null;
  enabled_skills: string[];
  spending_limit_per_tx: number;
  spending_limit_daily: number;
  daily_spent: number;
  balance: number | null;
  eth_balance: number | null;
}

export interface AgentActionLog {
  id: string;
  action_type: string;
  params: Record<string, any>;
  status: string;
  result: Record<string, any> | null;
  error_message: string | null;
  created_at: string;
}

const DEFAULT_STATUS: AgentWalletStatus = {
  connected: false,
  wallet_address: null,
  wallet_email: null,
  enabled_skills: [],
  spending_limit_per_tx: 50,
  spending_limit_daily: 200,
  daily_spent: 0,
  balance: null,
  eth_balance: null,
};

export function useAgentWallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<AgentWalletStatus>(DEFAULT_STATUS);
  const [logs, setLogs] = useState<AgentActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const invoke = useCallback(async (action: string, params: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke('agent-wallet', {
      body: { action, ...params },
    });
    if (error) throw new Error(error.message || 'Agent wallet error');
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const data = await invoke('status');
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch wallet status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, invoke]);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    try {
      const data = await invoke('get-logs');
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch agent logs:', err);
    }
  }, [user, invoke]);

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, [fetchStatus, fetchLogs]);

  const connectWallet = useCallback(async (email: string) => {
    setIsActing(true);
    try {
      const result = await invoke('auth-start', { email });
      toast({ title: 'Wallet Connected', description: `CDP wallet created at ${result.wallet_address?.slice(0, 10)}…` });
      await fetchStatus();
      await fetchLogs();
      return result;
    } catch (err) {
      toast({ title: 'Connection Failed', description: err instanceof Error ? err.message : 'Failed to connect wallet', variant: 'destructive' });
      throw err;
    } finally {
      setIsActing(false);
    }
  }, [invoke, toast, fetchStatus, fetchLogs]);

  const verifyAuth = useCallback(async (email: string, otp: string) => {
    setIsActing(true);
    try {
      await invoke('auth-verify', { email, otp });
      toast({ title: 'Wallet Connected', description: 'Your agentic wallet is now active.' });
      await fetchStatus();
    } catch (err) {
      toast({ title: 'Verification Failed', description: err instanceof Error ? err.message : 'Invalid OTP', variant: 'destructive' });
      throw err;
    } finally {
      setIsActing(false);
    }
  }, [invoke, toast, fetchStatus]);

  const disconnect = useCallback(async () => {
    setIsActing(true);
    try {
      await invoke('disconnect');
      setStatus(DEFAULT_STATUS);
      toast({ title: 'Wallet Disconnected' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    } finally {
      setIsActing(false);
    }
  }, [invoke, toast]);

  const updateSkills = useCallback(async (skills: string[]) => {
    try {
      await invoke('update-skills', { enabled_skills: skills });
      setStatus(prev => ({ ...prev, enabled_skills: skills }));
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update skills', variant: 'destructive' });
    }
  }, [invoke, toast]);

  const updateLimits = useCallback(async (perTx: number, daily: number) => {
    try {
      await invoke('update-limits', { spending_limit_per_tx: perTx, spending_limit_daily: daily });
      setStatus(prev => ({ ...prev, spending_limit_per_tx: perTx, spending_limit_daily: daily }));
      toast({ title: 'Limits Updated' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update limits', variant: 'destructive' });
    }
  }, [invoke, toast]);

  const sendUsdc = useCallback(async (amount: number, recipient: string) => {
    setIsActing(true);
    try {
      const result = await invoke('send', { amount, recipient });
      await fetchLogs();
      toast({ title: 'USDC Sent', description: result.message });
      return result;
    } catch (err) {
      toast({ title: 'Send Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      throw err;
    } finally {
      setIsActing(false);
    }
  }, [invoke, toast, fetchLogs]);

  const tradeTokens = useCallback(async (amount: number, fromToken: string, toToken: string) => {
    setIsActing(true);
    try {
      const result = await invoke('trade', { amount, from_token: fromToken, to_token: toToken });
      await fetchLogs();
      toast({ title: 'Trade Executed', description: result.message });
      return result;
    } catch (err) {
      toast({ title: 'Trade Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      throw err;
    } finally {
      setIsActing(false);
    }
  }, [invoke, toast, fetchLogs]);

  const fundWallet = useCallback(async (amount: number) => {
    setIsActing(true);
    try {
      const result = await invoke('fund', { amount });
      await fetchLogs();
      toast({ title: 'Funding Initiated', description: result.message });
      return result;
    } catch (err) {
      toast({ title: 'Fund Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      throw err;
    } finally {
      setIsActing(false);
    }
  }, [invoke, toast, fetchLogs]);

  return {
    status,
    logs,
    isLoading,
    isActing,
    connectWallet,
    disconnect,
    updateSkills,
    updateLimits,
    sendUsdc,
    tradeTokens,
    fundWallet,
    refetch: fetchStatus,
  };
}
