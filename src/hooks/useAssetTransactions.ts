import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AssetTransaction, TransactionType, FundFlowMode } from '@/lib/types';
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
  // Fund flow tracking fields
  fund_flow_mode?: FundFlowMode;
  source_asset_id?: string;
  source_label?: string;
  source_currency?: string;
  source_amount?: number;
  destination_asset_id?: string;
  destination_label?: string;
  destination_currency?: string;
  destination_amount?: number;
  exchange_rate?: number;
}

export interface UpdateTransactionData {
  quantity?: number;
  price_per_unit?: number;
  total_value?: number;
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
        // Fund flow fields
        fund_flow_mode: (t as any).fund_flow_mode as FundFlowMode || 'none',
        source_asset_id: (t as any).source_asset_id || undefined,
        source_label: (t as any).source_label || undefined,
        source_currency: (t as any).source_currency || undefined,
        source_amount: (t as any).source_amount ? Number((t as any).source_amount) : undefined,
        destination_asset_id: (t as any).destination_asset_id || undefined,
        destination_label: (t as any).destination_label || undefined,
        destination_currency: (t as any).destination_currency || undefined,
        destination_amount: (t as any).destination_amount ? Number((t as any).destination_amount) : undefined,
        exchange_rate: (t as any).exchange_rate ? Number((t as any).exchange_rate) : undefined,
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
          // Fund flow fields
          fund_flow_mode: data.fund_flow_mode || 'none',
          source_asset_id: data.source_asset_id || null,
          source_label: data.source_label || null,
          source_currency: data.source_currency || null,
          source_amount: data.source_amount || null,
          destination_asset_id: data.destination_asset_id || null,
          destination_label: data.destination_label || null,
          destination_currency: data.destination_currency || null,
          destination_amount: data.destination_amount || null,
          exchange_rate: data.exchange_rate || null,
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
        // Fund flow fields
        fund_flow_mode: (newTransaction as any).fund_flow_mode as FundFlowMode || 'none',
        source_asset_id: (newTransaction as any).source_asset_id || undefined,
        source_label: (newTransaction as any).source_label || undefined,
        source_currency: (newTransaction as any).source_currency || undefined,
        source_amount: (newTransaction as any).source_amount ? Number((newTransaction as any).source_amount) : undefined,
        destination_asset_id: (newTransaction as any).destination_asset_id || undefined,
        destination_label: (newTransaction as any).destination_label || undefined,
        destination_currency: (newTransaction as any).destination_currency || undefined,
        destination_amount: (newTransaction as any).destination_amount ? Number((newTransaction as any).destination_amount) : undefined,
        exchange_rate: (newTransaction as any).exchange_rate ? Number((newTransaction as any).exchange_rate) : undefined,
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

  const updateTransaction = useCallback(async (id: string, data: UpdateTransactionData) => {
    if (!user) return null;

    try {
      const updateData: Record<string, any> = {};
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.price_per_unit !== undefined) updateData.price_per_unit = data.price_per_unit;
      if (data.total_value !== undefined) updateData.total_value = data.total_value;
      if (data.realized_pnl !== undefined) updateData.realized_pnl = data.realized_pnl;
      if (data.transaction_date !== undefined) updateData.transaction_date = data.transaction_date;
      if (data.notes !== undefined) updateData.notes = data.notes || null;

      const { data: updatedTransaction, error } = await supabase
        .from('asset_transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const transaction: AssetTransaction = {
        id: updatedTransaction.id,
        user_id: updatedTransaction.user_id,
        asset_id: updatedTransaction.asset_id || undefined,
        transaction_type: updatedTransaction.transaction_type as TransactionType,
        symbol: updatedTransaction.symbol,
        asset_name: updatedTransaction.asset_name,
        category: updatedTransaction.category,
        quantity: Number(updatedTransaction.quantity),
        price_per_unit: Number(updatedTransaction.price_per_unit),
        total_value: Number(updatedTransaction.total_value),
        realized_pnl: updatedTransaction.realized_pnl ? Number(updatedTransaction.realized_pnl) : undefined,
        transaction_date: updatedTransaction.transaction_date,
        notes: updatedTransaction.notes || undefined,
        created_at: updatedTransaction.created_at,
      };

      setTransactions(prev => prev.map(t => t.id === id ? transaction : t));
      toast({ title: 'Transaction updated' });
      
      return transaction;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating transaction',
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
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
