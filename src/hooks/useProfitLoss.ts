import { useMemo } from 'react';
import { Asset, AssetTransaction } from '@/lib/types';

export interface ProfitLossData {
  // Per-asset P&L
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  // Portfolio totals
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
  // Breakdown by category
  pnlByCategory: Record<string, { unrealized: number; realized: number; total: number }>;
  // Assets with cost basis
  assetsWithCostBasis: Array<Asset & { unrealizedPnL: number; unrealizedPnLPercent: number }>;
  assetsWithoutCostBasis: Asset[];
}

// Calculate unrealized P&L for a single asset
export function calculateAssetUnrealizedPnL(asset: Asset): { pnl: number; percent: number } {
  if (!asset.cost_basis || asset.cost_basis === 0) {
    return { pnl: 0, percent: 0 };
  }
  
  const currentValue = asset.value;
  const costBasis = asset.cost_basis;
  const pnl = currentValue - costBasis;
  const percent = (pnl / costBasis) * 100;
  
  return { pnl, percent };
}

// Calculate total realized P&L from transactions
export function calculateTotalRealizedPnL(transactions: AssetTransaction[]): number {
  return transactions
    .filter(t => t.transaction_type === 'sell' && typeof t.realized_pnl === 'number')
    .reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
}

export function useProfitLoss(
  assets: Asset[],
  transactions: AssetTransaction[] = []
): ProfitLossData {
  return useMemo(() => {
    // Separate assets with and without cost basis
    const assetsWithCostBasis: Array<Asset & { unrealizedPnL: number; unrealizedPnLPercent: number }> = [];
    const assetsWithoutCostBasis: Asset[] = [];
    
    let totalUnrealizedPnL = 0;
    let totalCostBasis = 0;
    const pnlByCategory: Record<string, { unrealized: number; realized: number; total: number }> = {};
    
    // Process each asset
    assets.forEach(asset => {
      if (asset.cost_basis && asset.cost_basis > 0) {
        const { pnl, percent } = calculateAssetUnrealizedPnL(asset);
        totalUnrealizedPnL += pnl;
        totalCostBasis += asset.cost_basis;
        
        // Track by category
        if (!pnlByCategory[asset.category]) {
          pnlByCategory[asset.category] = { unrealized: 0, realized: 0, total: 0 };
        }
        pnlByCategory[asset.category].unrealized += pnl;
        
        assetsWithCostBasis.push({
          ...asset,
          unrealizedPnL: pnl,
          unrealizedPnLPercent: percent,
        });
      } else {
        assetsWithoutCostBasis.push(asset);
      }
    });
    
    // Calculate realized P&L from transactions
    const totalRealizedPnL = calculateTotalRealizedPnL(transactions);
    
    // Add realized P&L to category breakdown
    transactions
      .filter(t => t.transaction_type === 'sell' && typeof t.realized_pnl === 'number')
      .forEach(t => {
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
    
    const totalPnL = totalUnrealizedPnL + totalRealizedPnL;
    const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;
    
    // Sort assets by unrealized P&L (descending)
    assetsWithCostBasis.sort((a, b) => b.unrealizedPnL - a.unrealizedPnL);
    
    return {
      unrealizedPnL: totalUnrealizedPnL,
      unrealizedPnLPercent: totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0,
      totalUnrealizedPnL,
      totalRealizedPnL,
      totalPnL,
      totalPnLPercent,
      pnlByCategory,
      assetsWithCostBasis,
      assetsWithoutCostBasis,
    };
  }, [assets, transactions]);
}
