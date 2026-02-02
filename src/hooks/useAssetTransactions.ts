import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AssetTransaction, TransactionType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export interface CreateTransactionData {
  asset_id?: string;
  transaction_type: TransactionType;
  symbol: string;
  asset_name: string;
  category: string;
  quantity: number;
  price_per_unit: number;
  total_value: number;
  realized_pnl?: number;
  transaction_date?: string;
  notes?: string;
}

export function useAssetTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('asset_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(data.map(t => ({
        id: t.id,
        user_id: t.user_id,
        asset_id: t.asset_id || undefined,
        transaction_type: t.transaction_type as TransactionType,
        symbol: t.symbol,
        asset_name: t.asset_name,
        category: t.category,
        quantity: Number(t.quantity),
        price_per_unit: Number(t.price_per_unit),
        total_value: Number(t.total_value),
        realized_pnl: t.realized_pnl ? Number(t.realized_pnl) : undefined,
        transaction_date: t.transaction_date,
        notes: t.notes || undefined,
        created_at: t.created_at,
      })));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading transactions',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(async (data: CreateTransactionData) => {
    if (!user) return null;

    try {
      const { data: newTransaction, error } = await supabase
        .from('asset_transactions')
        .insert({
          user_id: user.id,
          asset_id: data.asset_id || null,
          transaction_type: data.transaction_type,
          symbol: data.symbol,
          asset_name: data.asset_name,
          category: data.category,
          quantity: data.quantity,
          price_per_unit: data.price_per_unit,
          total_value: data.total_value,
          realized_pnl: data.realized_pnl || null,
          transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
          notes: data.notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const transaction: AssetTransaction = {
        id: newTransaction.id,
        user_id: newTransaction.user_id,
        asset_id: newTransaction.asset_id || undefined,
        transaction_type: newTransaction.transaction_type as TransactionType,
        symbol: newTransaction.symbol,
        asset_name: newTransaction.asset_name,
        category: newTransaction.category,
        quantity: Number(newTransaction.quantity),
        price_per_unit: Number(newTransaction.price_per_unit),
        total_value: Number(newTransaction.total_value),
        realized_pnl: newTransaction.realized_pnl ? Number(newTransaction.realized_pnl) : undefined,
        transaction_date: newTransaction.transaction_date,
        notes: newTransaction.notes || undefined,
        created_at: newTransaction.created_at,
      };

      setTransactions(prev => [transaction, ...prev]);
      
      toast({
        title: data.transaction_type === 'sell' ? 'Sale recorded' : 'Purchase recorded',
        description: data.realized_pnl 
          ? `Realized P&L: ${data.realized_pnl >= 0 ? '+' : ''}$${data.realized_pnl.toFixed(2)}`
          : undefined,
      });

      return transaction;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error recording transaction',
        description: error.message,
      });
      return null;
    }
  }, [user, toast]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('asset_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Transaction deleted' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting transaction',
        description: error.message,
      });
    }
  }, [user, toast]);

  return {
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
