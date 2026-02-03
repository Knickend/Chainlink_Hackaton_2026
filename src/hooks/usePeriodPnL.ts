import { useMemo } from 'react';
import { Asset, AssetTransaction } from '@/lib/types';
import { ProfitLossData, calculateAssetUnrealizedPnL, ClosedPosition } from './useProfitLoss';

export interface OpenPositionWithPeriodData {
  id: string;
  name: string;
  symbol: string | null;
  category: string;
  quantity: number | null;
  value: number;
  cost_basis: number | null;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  periodRealizedPnL: number;
  periodTransactions: AssetTransaction[];
  allTransactions: AssetTransaction[];
}

export interface ClosedThisPeriod {
  id: string;
  name: string;
  symbol: string;
  category: string;
  realizedPnL: number;
  realizedPnLPercent: number;
  totalSold: number;
  totalProceeds: number;
  totalCostBasis: number;
  transactions: AssetTransaction[];
  closedDate: string;
}

export interface PeriodPnLData extends ProfitLossData {
  periodLabel: string;
  periodRealizedPnL: number;
  openPositionsWithPeriodData: OpenPositionWithPeriodData[];
  closedThisPeriod: ClosedThisPeriod[];
}

function filterTransactionsByPeriod(
  transactions: AssetTransaction[],
  startDate: Date | null,
  endDate: Date | null
): AssetTransaction[] {
  if (!startDate && !endDate) return transactions;
  
  return transactions.filter(tx => {
    const txDate = new Date(tx.transaction_date);
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });
}

function getAssetKey(asset: { symbol?: string | null; name: string }): string {
  return `${asset.symbol || ''}::${asset.name}`;
}

export function usePeriodPnL(
  assets: Asset[],
  transactions: AssetTransaction[] = [],
  periodStart: Date | null,
  periodEnd: Date | null,
  periodLabel: string
): PeriodPnLData {
  return useMemo(() => {
    // Build set of current asset keys
    const currentAssetKeys = new Set(assets.map(a => getAssetKey(a)));
    
    // Group all transactions by asset
    const transactionsByAsset = new Map<string, AssetTransaction[]>();
    transactions.forEach(tx => {
      const key = `${tx.symbol}::${tx.asset_name}`;
      if (!transactionsByAsset.has(key)) {
        transactionsByAsset.set(key, []);
      }
      transactionsByAsset.get(key)!.push(tx);
    });

    // Filter transactions by period for realized P&L
    const periodTransactions = filterTransactionsByPeriod(transactions, periodStart, periodEnd);
    const periodSellTransactions = periodTransactions.filter(t => t.transaction_type === 'sell');
    
    // Calculate period realized P&L
    const periodRealizedPnL = periodSellTransactions.reduce(
      (sum, t) => sum + (t.realized_pnl || 0), 
      0
    );

    // Build open positions with period data
    const openPositionsWithPeriodData: OpenPositionWithPeriodData[] = [];
    const pnlByCategory: Record<string, { unrealized: number; realized: number; total: number }> = {};
    
    let totalUnrealizedPnL = 0;
    let totalCostBasis = 0;

    assets.forEach(asset => {
      const key = getAssetKey(asset);
      const allTxs = transactionsByAsset.get(key) || [];
      const periodTxs = filterTransactionsByPeriod(allTxs, periodStart, periodEnd);
      const periodSells = periodTxs.filter(t => t.transaction_type === 'sell');
      
      const { pnl: unrealizedPnL, percent: unrealizedPnLPercent } = calculateAssetUnrealizedPnL(asset);
      const periodRealized = periodSells.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);

      if (asset.cost_basis && asset.cost_basis > 0) {
        totalUnrealizedPnL += unrealizedPnL;
        totalCostBasis += asset.cost_basis;
        
        // Track by category
        if (!pnlByCategory[asset.category]) {
          pnlByCategory[asset.category] = { unrealized: 0, realized: 0, total: 0 };
        }
        pnlByCategory[asset.category].unrealized += unrealizedPnL;
      }

      openPositionsWithPeriodData.push({
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol || null,
        category: asset.category,
        quantity: asset.quantity || null,
        value: asset.value,
        cost_basis: asset.cost_basis || null,
        unrealizedPnL,
        unrealizedPnLPercent,
        periodRealizedPnL: periodRealized,
        periodTransactions: periodTxs.sort(
          (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        ),
        allTransactions: allTxs.sort(
          (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        ),
      });
    });

    // Add period realized P&L to category breakdown
    periodSellTransactions.forEach(t => {
      if (!pnlByCategory[t.category]) {
        pnlByCategory[t.category] = { unrealized: 0, realized: 0, total: 0 };
      }
      pnlByCategory[t.category].realized += t.realized_pnl || 0;
    });

    // Calculate totals for each category
    Object.keys(pnlByCategory).forEach(category => {
      pnlByCategory[category].total = 
        pnlByCategory[category].unrealized + pnlByCategory[category].realized;
    });

    // Identify positions closed within the period
    const closedThisPeriod: ClosedThisPeriod[] = [];
    
    transactionsByAsset.forEach((txs, key) => {
      // Skip if asset still exists
      if (currentAssetKeys.has(key)) return;
      
      const sellTxs = txs.filter(t => t.transaction_type === 'sell');
      const buyTxs = txs.filter(t => t.transaction_type === 'buy');
      
      if (sellTxs.length === 0) return;
      
      // Check if last sell was in this period
      const sortedSells = [...sellTxs].sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );
      const lastSell = sortedSells[0];
      const lastSellDate = new Date(lastSell.transaction_date);
      
      // Filter: only include if closed within period
      const inPeriod = (!periodStart || lastSellDate >= periodStart) && 
                       (!periodEnd || lastSellDate <= periodEnd);
      
      if (!inPeriod && periodStart) return; // Skip if period is set and position wasn't closed in it
      
      const totalRealizedPnL = sellTxs.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
      const totalSold = sellTxs.reduce((sum, t) => sum + t.quantity, 0);
      const totalProceeds = sellTxs.reduce((sum, t) => sum + t.total_value, 0);
      const totalCostBasis = buyTxs.reduce((sum, t) => sum + t.total_value, 0);
      
      const percentBasis = totalCostBasis > 0 ? totalCostBasis : totalProceeds - totalRealizedPnL;
      const realizedPnLPercent = percentBasis > 0 ? (totalRealizedPnL / percentBasis) * 100 : 0;
      
      closedThisPeriod.push({
        id: `closed-${key}`,
        name: txs[0].asset_name,
        symbol: txs[0].symbol,
        category: txs[0].category,
        realizedPnL: totalRealizedPnL,
        realizedPnLPercent,
        totalSold,
        totalProceeds,
        totalCostBasis,
        transactions: txs.sort(
          (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        ),
        closedDate: lastSell.transaction_date,
      });
    });

    // Sort closed positions by date (most recent first)
    closedThisPeriod.sort(
      (a, b) => new Date(b.closedDate).getTime() - new Date(a.closedDate).getTime()
    );

    // Sort open positions by total P&L (unrealized + period realized)
    openPositionsWithPeriodData.sort(
      (a, b) => (b.unrealizedPnL + b.periodRealizedPnL) - (a.unrealizedPnL + a.periodRealizedPnL)
    );

    const totalRealizedPnL = transactions
      .filter(t => t.transaction_type === 'sell' && typeof t.realized_pnl === 'number')
      .reduce((sum, t) => sum + (t.realized_pnl || 0), 0);

    const totalPnL = totalUnrealizedPnL + periodRealizedPnL;
    const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

    // Build legacy format for compatibility
    const assetsWithCostBasis = assets
      .filter(a => a.cost_basis && a.cost_basis > 0)
      .map(asset => {
        const { pnl, percent } = calculateAssetUnrealizedPnL(asset);
        return { ...asset, unrealizedPnL: pnl, unrealizedPnLPercent: percent };
      })
      .sort((a, b) => b.unrealizedPnL - a.unrealizedPnL);

    const assetsWithoutCostBasis = assets.filter(a => !a.cost_basis || a.cost_basis === 0);

    // Build closed positions (all-time, for legacy compatibility)
    const closedPositions: ClosedPosition[] = [];
    transactionsByAsset.forEach((txs, key) => {
      if (currentAssetKeys.has(key)) return;
      const sellTxs = txs.filter(t => t.transaction_type === 'sell');
      const buyTxs = txs.filter(t => t.transaction_type === 'buy');
      if (sellTxs.length === 0) return;
      
      const totalRealizedPnL = sellTxs.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
      const totalSold = sellTxs.reduce((sum, t) => sum + t.quantity, 0);
      const totalProceeds = sellTxs.reduce((sum, t) => sum + t.total_value, 0);
      const totalCostBasis = buyTxs.reduce((sum, t) => sum + t.total_value, 0);
      const percentBasis = totalCostBasis > 0 ? totalCostBasis : totalProceeds - totalRealizedPnL;
      const realizedPnLPercent = percentBasis > 0 ? (totalRealizedPnL / percentBasis) * 100 : 0;
      
      closedPositions.push({
        id: `closed-${key}`,
        name: txs[0].asset_name,
        symbol: txs[0].symbol,
        category: txs[0].category,
        realizedPnL: totalRealizedPnL,
        realizedPnLPercent,
        totalSold,
        totalProceeds,
        totalCostBasis,
        transactions: txs.sort(
          (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        ),
      });
    });

    return {
      periodLabel,
      periodRealizedPnL,
      openPositionsWithPeriodData,
      closedThisPeriod,
      // Legacy fields
      unrealizedPnL: totalUnrealizedPnL,
      unrealizedPnLPercent: totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0,
      totalUnrealizedPnL,
      totalRealizedPnL,
      totalPnL,
      totalPnLPercent,
      pnlByCategory,
      assetsWithCostBasis,
      assetsWithoutCostBasis,
      closedPositions,
    };
  }, [assets, transactions, periodStart, periodEnd, periodLabel]);
}
