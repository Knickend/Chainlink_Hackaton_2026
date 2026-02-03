import { useMemo } from 'react';
import { Asset, AssetTransaction } from '@/lib/types';

// Interface for closed positions (fully sold assets)
export interface ClosedPosition {
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
}

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
  // Closed positions (fully sold assets)
  closedPositions: ClosedPosition[];
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

// Extract closed positions from transactions (assets that were fully sold)
function extractClosedPositions(
  transactions: AssetTransaction[],
  currentAssets: Asset[]
): ClosedPosition[] {
  // Create a set of current asset identifiers (symbol + name combinations)
  const currentAssetKeys = new Set(
    currentAssets.map(a => `${a.symbol || ''}::${a.name}`)
  );
  
  // Group transactions by asset (symbol + name)
  const transactionsByAsset = new Map<string, AssetTransaction[]>();
  
  transactions.forEach(tx => {
    const key = `${tx.symbol}::${tx.asset_name}`;
    if (!transactionsByAsset.has(key)) {
      transactionsByAsset.set(key, []);
    }
    transactionsByAsset.get(key)!.push(tx);
  });
  
  const closedPositions: ClosedPosition[] = [];
  
  transactionsByAsset.forEach((txs, key) => {
    // Skip if asset still exists in portfolio
    if (currentAssetKeys.has(key)) {
      return;
    }
    
    // Check if there are any sell transactions with realized P&L
    const sellTxs = txs.filter(t => t.transaction_type === 'sell');
    const buyTxs = txs.filter(t => t.transaction_type === 'buy');
    
    if (sellTxs.length === 0) {
      return; // No sells, not a closed position
    }
    
    // Calculate totals
    const totalRealizedPnL = sellTxs.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const totalSold = sellTxs.reduce((sum, t) => sum + t.quantity, 0);
    const totalProceeds = sellTxs.reduce((sum, t) => sum + t.total_value, 0);
    const totalCostBasis = buyTxs.reduce((sum, t) => sum + t.total_value, 0);
    
    // Calculate percentage (based on cost basis if available)
    const percentBasis = totalCostBasis > 0 ? totalCostBasis : totalProceeds - totalRealizedPnL;
    const realizedPnLPercent = percentBasis > 0 ? (totalRealizedPnL / percentBasis) * 100 : 0;
    
    // Use first transaction for metadata
    const firstTx = txs[0];
    
    closedPositions.push({
      id: `closed-${key}`,
      name: firstTx.asset_name,
      symbol: firstTx.symbol,
      category: firstTx.category,
      realizedPnL: totalRealizedPnL,
      realizedPnLPercent,
      totalSold,
      totalProceeds,
      totalCostBasis,
      transactions: txs.sort((a, b) => 
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      ),
    });
  });
  
  // Sort by realized P&L (descending by absolute value)
  return closedPositions.sort((a, b) => Math.abs(b.realizedPnL) - Math.abs(a.realizedPnL));
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
    
    // Extract closed positions
    const closedPositions = extractClosedPositions(transactions, assets);
    
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
      closedPositions,
    };
  }, [assets, transactions]);
}
