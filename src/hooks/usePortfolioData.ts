import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Asset, Income, Expense, AssetCategory, CommodityUnit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function usePortfolioData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) {
      setAssets([]);
      setIncome([]);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [assetsRes, incomeRes, expensesRes] = await Promise.all([
        supabase.from('assets').select('*').order('created_at', { ascending: false }),
        supabase.from('income').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (incomeRes.error) throw incomeRes.error;
      if (expensesRes.error) throw expensesRes.error;

      setAssets(assetsRes.data.map(a => ({
        id: a.id,
        name: a.name,
        category: a.category as AssetCategory,
        value: Number(a.value),
        quantity: a.quantity ? Number(a.quantity) : undefined,
        symbol: a.symbol || undefined,
        yield: a.yield ? Number(a.yield) : undefined,
        unit: (a as any).unit as CommodityUnit | undefined,
        cost_basis: (a as any).cost_basis ? Number((a as any).cost_basis) : undefined,
        purchase_date: (a as any).purchase_date || undefined,
        purchase_price_per_unit: (a as any).purchase_price_per_unit ? Number((a as any).purchase_price_per_unit) : undefined,
      })));

      setIncome(incomeRes.data.map(i => ({
        id: i.id,
        source: i.source,
        amount: Number(i.amount),
        type: i.type as Income['type'],
        currency: (i as any).currency || 'USD',
      })));

      setExpenses(expensesRes.data.map(e => ({
        id: e.id,
        name: e.name,
        amount: Number(e.amount),
        category: e.category,
        is_recurring: (e as any).is_recurring ?? true,
        expense_date: (e as any).expense_date || undefined,
        currency: (e as any).currency || 'USD',
      })));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading data',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Asset operations
  const addAsset = useCallback(async (assetData: {
    name: string;
    category: AssetCategory;
    value: number;
    quantity?: number;
    symbol?: string;
    yield?: number;
    stakingRate?: number;
    unit?: CommodityUnit;
    cost_basis?: number;
    purchase_date?: string;
    purchase_price_per_unit?: number;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from('assets').insert({
        user_id: user.id,
        name: assetData.name,
        category: assetData.category,
        value: assetData.value,
        quantity: assetData.quantity,
        symbol: assetData.symbol || null,
        yield: assetData.yield || assetData.stakingRate || null,
        unit: assetData.unit || null,
        cost_basis: assetData.cost_basis || null,
        purchase_date: assetData.purchase_date || null,
        purchase_price_per_unit: assetData.purchase_price_per_unit || null,
      } as any).select().single();

      if (error) throw error;

      setAssets(prev => [{
        id: data.id,
        name: data.name,
        category: data.category as AssetCategory,
        value: Number(data.value),
        quantity: data.quantity ? Number(data.quantity) : undefined,
        symbol: data.symbol || undefined,
        yield: data.yield ? Number(data.yield) : undefined,
        unit: (data as any).unit as CommodityUnit | undefined,
        cost_basis: (data as any).cost_basis ? Number((data as any).cost_basis) : undefined,
        purchase_date: (data as any).purchase_date || undefined,
        purchase_price_per_unit: (data as any).purchase_price_per_unit ? Number((data as any).purchase_price_per_unit) : undefined,
      }, ...prev]);

      toast({ title: 'Asset added successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding asset',
        description: error.message,
      });
    }
  }, [user, toast]);

  const updateAsset = useCallback(async (id: string, assetData: Partial<Omit<Asset, 'id'>>) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('assets').update({
        name: assetData.name,
        category: assetData.category,
        value: assetData.value,
        quantity: assetData.quantity,
        symbol: assetData.symbol || null,
        yield: assetData.yield || null,
        unit: assetData.unit || null,
        cost_basis: assetData.cost_basis ?? null,
        purchase_date: assetData.purchase_date ?? null,
        purchase_price_per_unit: assetData.purchase_price_per_unit ?? null,
      } as any).eq('id', id);

      if (error) throw error;

      setAssets(prev => prev.map(asset => 
        asset.id === id ? { ...asset, ...assetData } : asset
      ));

      toast({ title: 'Asset updated successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating asset',
        description: error.message,
      });
    }
  }, [user, toast]);

  const deleteAsset = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;

      setAssets(prev => prev.filter(asset => asset.id !== id));
      toast({ title: 'Asset deleted successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting asset',
        description: error.message,
      });
    }
  }, [user, toast]);

  // Income operations
  const addIncome = useCallback(async (incomeData: {
    source: string;
    amount: number;
    type: Income['type'];
    currency?: string;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from('income').insert({
        user_id: user.id,
        source: incomeData.source,
        amount: incomeData.amount,
        type: incomeData.type,
        currency: incomeData.currency || 'USD',
      } as any).select().single();

      if (error) throw error;

      setIncome(prev => [{
        id: data.id,
        source: data.source,
        amount: Number(data.amount),
        type: data.type as Income['type'],
        currency: (data as any).currency || 'USD',
      }, ...prev]);

      toast({ title: 'Income added successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding income',
        description: error.message,
      });
    }
  }, [user, toast]);

  const updateIncome = useCallback(async (id: string, incomeData: Partial<Omit<Income, 'id'>>) => {
    if (!user) return;

    try {
      const updatePayload: any = {
        source: incomeData.source,
        amount: incomeData.amount,
        type: incomeData.type,
      };
      if (incomeData.currency) {
        updatePayload.currency = incomeData.currency;
      }
      
      const { error } = await supabase.from('income').update(updatePayload).eq('id', id);

      if (error) throw error;

      setIncome(prev => prev.map(inc => 
        inc.id === id ? { ...inc, ...incomeData } : inc
      ));

      toast({ title: 'Income updated successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating income',
        description: error.message,
      });
    }
  }, [user, toast]);

  const deleteIncome = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('income').delete().eq('id', id);
      if (error) throw error;

      setIncome(prev => prev.filter(inc => inc.id !== id));
      toast({ title: 'Income deleted successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting income',
        description: error.message,
      });
    }
  }, [user, toast]);

  // Expense operations
  const addExpense = useCallback(async (expenseData: {
    name: string;
    amount: number;
    category: string;
    is_recurring?: boolean;
    expense_date?: string;
    currency?: string;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from('expenses').insert({
        user_id: user.id,
        name: expenseData.name,
        amount: expenseData.amount,
        category: expenseData.category,
        is_recurring: expenseData.is_recurring ?? true,
        expense_date: expenseData.expense_date || null,
        currency: expenseData.currency || 'USD',
      } as any).select().single();

      if (error) throw error;

      setExpenses(prev => [{
        id: data.id,
        name: data.name,
        amount: Number(data.amount),
        category: data.category,
        is_recurring: (data as any).is_recurring ?? true,
        expense_date: (data as any).expense_date || undefined,
        currency: (data as any).currency || 'USD',
      }, ...prev]);

      toast({ title: 'Expense added successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error adding expense',
        description: error.message,
      });
    }
  }, [user, toast]);

  const updateExpense = useCallback(async (id: string, expenseData: Partial<Omit<Expense, 'id'>>) => {
    if (!user) return;

    try {
      const updatePayload: any = {
        name: expenseData.name,
        amount: expenseData.amount,
        category: expenseData.category,
      };
      if (expenseData.currency) {
        updatePayload.currency = expenseData.currency;
      }
      
      const { error } = await supabase.from('expenses').update(updatePayload).eq('id', id);

      if (error) throw error;

      setExpenses(prev => prev.map(exp => 
        exp.id === id ? { ...exp, ...expenseData } : exp
      ));

      toast({ title: 'Expense updated successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating expense',
        description: error.message,
      });
    }
  }, [user, toast]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      setExpenses(prev => prev.filter(exp => exp.id !== id));
      toast({ title: 'Expense deleted successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting expense',
        description: error.message,
      });
    }
  }, [user, toast]);

  return {
    assets,
    income,
    expenses,
    loading,
    addAsset,
    updateAsset,
    deleteAsset,
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchData,
  };
}
