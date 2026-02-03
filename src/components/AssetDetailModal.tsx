import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Download, ArrowUpRight, ArrowDownRight, Pencil, Trash2 } from 'lucide-react';
import { AssetTransaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { EditTransactionDialog } from './EditTransactionDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { UpdateTransactionData } from '@/hooks/useAssetTransactions';
import { OpenPositionWithPeriodData, ClosedThisPeriod } from '@/hooks/usePeriodPnL';

type TransactionFilter = 'all' | 'buy' | 'sell';

interface AssetDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: OpenPositionWithPeriodData | ClosedThisPeriod | null;
  periodLabel: string;
  formatValue: (value: number, showSign?: boolean) => string;
  onEditTransaction?: (id: string, data: UpdateTransactionData) => Promise<any>;
  onDeleteTransaction?: (id: string) => Promise<void>;
}

function isOpenPosition(asset: OpenPositionWithPeriodData | ClosedThisPeriod): asset is OpenPositionWithPeriodData {
  return 'unrealizedPnL' in asset;
}

export function AssetDetailModal({
  open,
  onOpenChange,
  asset,
  periodLabel,
  formatValue,
  onEditTransaction,
  onDeleteTransaction,
}: AssetDetailModalProps) {
  const [txFilter, setTxFilter] = useState<TransactionFilter>('all');
  const [editingTransaction, setEditingTransaction] = useState<AssetTransaction | null>(null);

  const transactions = useMemo(() => {
    if (!asset) return [];
    const allTxs = isOpenPosition(asset) ? asset.allTransactions : asset.transactions;
    if (txFilter === 'all') return allTxs;
    return allTxs.filter(t => t.transaction_type === txFilter);
  }, [asset, txFilter]);

  const avgCostPerUnit = useMemo(() => {
    if (!asset) return undefined;
    if (isOpenPosition(asset)) {
      return asset.quantity && asset.cost_basis ? asset.cost_basis / asset.quantity : undefined;
    }
    return asset.totalCostBasis > 0 && asset.totalSold > 0 
      ? asset.totalCostBasis / asset.totalSold 
      : undefined;
  }, [asset]);

  const handleExportCSV = () => {
    if (!asset) return;
    
    const headers = ['Date', 'Type', 'Quantity', 'Price', 'Total', 'P&L', 'Notes'];
    const rows = transactions.map(tx => [
      tx.transaction_date,
      tx.transaction_type.toUpperCase(),
      tx.quantity.toString(),
      tx.price_per_unit.toString(),
      tx.total_value.toString(),
      tx.realized_pnl?.toString() ?? '',
      tx.notes ?? '',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${asset.name}_transactions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!asset) return null;

  const isOpen = isOpenPosition(asset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20 max-w-lg h-[80vh] max-h-[80vh] min-h-0 overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {asset.name}
            {asset.symbol && (
              <Badge variant="secondary" className="text-xs">
                {asset.symbol}
              </Badge>
            )}
            {!isOpen && (
              <Badge variant="outline" className="text-xs">
                Closed
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="lots">Lots/Tax</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 min-h-0 overflow-y-auto mt-4 space-y-4">
            {isOpen ? (
              <>
                {/* Current Position */}
                <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Current Position</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Quantity</p>
                      <p className="font-semibold">
                        {asset.quantity?.toLocaleString(undefined, { maximumFractionDigits: 8 })} {asset.symbol}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Avg Cost</p>
                      <p className="font-semibold">
                        {avgCostPerUnit ? formatValue(avgCostPerUnit) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Value</p>
                      <p className="font-semibold">{formatValue(asset.value)}</p>
                    </div>
                  </div>
                </div>

                {/* Unrealized P&L */}
                <div className="p-4 bg-secondary/20 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Unrealized P&L</p>
                  <div className="flex items-center gap-3">
                    {asset.unrealizedPnL >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-success" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    )}
                    <div>
                      <p className={cn(
                        'text-xl font-bold',
                        asset.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {asset.unrealizedPnL >= 0 ? '+' : ''}{formatValue(asset.unrealizedPnL)}
                      </p>
                      <p className={cn(
                        'text-sm',
                        asset.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {asset.unrealizedPnLPercent >= 0 ? '+' : ''}{asset.unrealizedPnLPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Period Realized */}
                {asset.periodRealizedPnL !== 0 && (
                  <div className="p-4 bg-secondary/20 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Realized ({periodLabel})
                    </p>
                    <p className={cn(
                      'text-lg font-bold',
                      asset.periodRealizedPnL >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {asset.periodRealizedPnL >= 0 ? '+' : ''}{formatValue(asset.periodRealizedPnL)}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Closed Position Summary */}
                <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Position Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Total Sold</p>
                      <p className="font-semibold">{asset.totalSold} {asset.symbol}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Proceeds</p>
                      <p className="font-semibold">{formatValue(asset.totalProceeds)}</p>
                    </div>
                    {asset.totalCostBasis > 0 && (
                      <div>
                        <p className="text-muted-foreground text-xs">Cost Basis</p>
                        <p className="font-semibold">{formatValue(asset.totalCostBasis)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Realized P&L */}
                <div className="p-4 bg-secondary/20 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Realized P&L</p>
                  <div className="flex items-center gap-3">
                    {asset.realizedPnL >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-success" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    )}
                    <div>
                      <p className={cn(
                        'text-xl font-bold',
                        asset.realizedPnL >= 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {asset.realizedPnL >= 0 ? '+' : ''}{formatValue(asset.realizedPnL)}
                      </p>
                      <p className={cn(
                        'text-sm',
                        asset.realizedPnL >= 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {asset.realizedPnLPercent >= 0 ? '+' : ''}{asset.realizedPnLPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="flex-1 min-h-0 overflow-hidden mt-4 flex flex-col">
            {/* Filters */}
            <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
              <div className="flex items-center gap-1">
                {(['all', 'buy', 'sell'] as TransactionFilter[]).map(filter => (
                  <Button
                    key={filter}
                    variant={txFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs capitalize"
                    onClick={() => setTxFilter(filter)}
                  >
                    {filter === 'all' ? 'All' : filter === 'buy' ? 'Buys' : 'Sells'}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={handleExportCSV}
              >
                <Download className="w-3 h-3" />
                CSV
              </Button>
            </div>

            {/* Transaction List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {transactions.length > 0 ? (
                transactions.map(tx => (
                  <div
                    key={tx.id}
                    className="group flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      {tx.transaction_type === 'buy' ? (
                        <div className="p-1.5 rounded bg-success/10">
                          <ArrowUpRight className="w-4 h-4 text-success" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded bg-destructive/10">
                          <ArrowDownRight className="w-4 h-4 text-destructive" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={tx.transaction_type === 'buy' ? 'default' : 'destructive'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tx.transaction_type.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            {tx.quantity} @ {formatValue(tx.price_per_unit)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                        </p>
                        {/* Fund flow info */}
                        {tx.fund_flow_mode === 'linked' && tx.source_asset_id && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            └─ Funded from linked asset
                          </p>
                        )}
                        {tx.fund_flow_mode === 'manual' && tx.source_label && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            └─ Source: {tx.source_label}
                          </p>
                        )}
                        {tx.fund_flow_mode === 'linked' && tx.destination_asset_id && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            └─ Proceeds to linked asset
                          </p>
                        )}
                        {tx.fund_flow_mode === 'manual' && tx.destination_label && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            └─ Destination: {tx.destination_label}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatValue(tx.total_value)}</p>
                        {tx.transaction_type === 'sell' && tx.realized_pnl !== undefined && (
                          <p className={cn(
                            'text-xs font-medium',
                            tx.realized_pnl >= 0 ? 'text-success' : 'text-destructive'
                          )}>
                            P&L: {tx.realized_pnl >= 0 ? '+' : ''}{formatValue(tx.realized_pnl)}
                          </p>
                        )}
                      </div>
                      {(onEditTransaction || onDeleteTransaction) && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEditTransaction && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingTransaction(tx)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          )}
                          {onDeleteTransaction && (
                            <DeleteConfirmDialog
                              title="Delete transaction?"
                              description={`Are you sure you want to delete this ${tx.transaction_type} transaction for ${tx.quantity} ${tx.symbol}? This action cannot be undone.`}
                              onConfirm={() => onDeleteTransaction(tx.id)}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No {txFilter !== 'all' ? txFilter : ''} transactions found.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Lots/Tax Tab */}
          <TabsContent value="lots" className="flex-1 min-h-0 overflow-y-auto mt-4">
            <div className="p-6 bg-secondary/20 rounded-lg text-center">
              <p className="text-muted-foreground mb-2">FIFO Tax Lots</p>
              <p className="text-sm text-muted-foreground">
                Coming soon — shows lot-level breakdown for tax reporting.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Edit Transaction Dialog */}
      {onEditTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          open={!!editingTransaction}
          onOpenChange={(open) => {
            if (!open) setEditingTransaction(null);
          }}
          onSave={async (id, data) => {
            await onEditTransaction(id, data);
          }}
          formatValue={formatValue}
          avgCostPerUnit={avgCostPerUnit}
        />
      )}
    </Dialog>
  );
}
