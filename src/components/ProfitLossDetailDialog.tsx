import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, AlertCircle, ChevronDown, ArrowUpRight, ArrowDownRight, Pencil, Trash2 } from 'lucide-react';
import { ProfitLossData } from '@/hooks/useProfitLoss';
import { AssetTransaction } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { EditTransactionDialog } from './EditTransactionDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { UpdateTransactionData } from '@/hooks/useAssetTransactions';

interface ProfitLossDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pnlData: ProfitLossData;
  formatValue: (value: number, showSign?: boolean) => string;
  transactions?: AssetTransaction[];
  onEditTransaction?: (id: string, data: UpdateTransactionData) => Promise<any>;
  onDeleteTransaction?: (id: string) => Promise<void>;
}

const CATEGORY_COLORS: Record<string, string> = {
  crypto: '#F7931A',
  stocks: '#4CAF50',
  commodities: '#FFD700',
  banking: '#2196F3',
};

export function ProfitLossDetailDialog({
  open,
  onOpenChange,
  pnlData,
  formatValue,
  transactions = [],
  onEditTransaction,
  onDeleteTransaction,
}: ProfitLossDetailDialogProps) {
  const { assetsWithCostBasis, assetsWithoutCostBasis, pnlByCategory, totalPnL, totalPnLPercent } = pnlData;
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<AssetTransaction | null>(null);

  // Get transactions for a specific asset
  const getAssetTransactions = (asset: { id: string; symbol?: string | null; name: string }) => {
    return transactions
      .filter(t => 
        t.asset_id === asset.id || 
        (t.symbol === asset.symbol && t.asset_name === asset.name)
      )
      .sort((a, b) => 
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );
  };

  // Prepare pie chart data
  const pieData = Object.entries(pnlByCategory)
    .filter(([_, data]) => data.total !== 0)
    .map(([category, data]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: Math.abs(data.total),
      actualValue: data.total,
      color: CATEGORY_COLORS[category] || '#888',
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {totalPnL >= 0 ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-destructive" />
            )}
            Profit & Loss Details
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg flex-shrink-0">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={cn(
              'text-lg font-bold',
              totalPnL >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {totalPnL >= 0 ? '+' : ''}{formatValue(totalPnL)}
            </p>
            <p className={cn(
              'text-xs',
              totalPnL >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Unrealized</p>
            <p className={cn(
              'text-lg font-bold',
              pnlData.totalUnrealizedPnL >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {pnlData.totalUnrealizedPnL >= 0 ? '+' : ''}{formatValue(pnlData.totalUnrealizedPnL)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Realized</p>
            <p className={cn(
              'text-lg font-bold',
              pnlData.totalRealizedPnL >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {pnlData.totalRealizedPnL >= 0 ? '+' : ''}{formatValue(pnlData.totalRealizedPnL)}
            </p>
          </div>
        </div>

        <Tabs defaultValue="by-asset" className="w-full flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="by-asset">By Asset</TabsTrigger>
            <TabsTrigger value="by-category">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="by-asset" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full max-h-[40vh]">
              <div className="space-y-2 pr-4">
                {assetsWithCostBasis.length > 0 ? (
                  assetsWithCostBasis.map(asset => {
                    const assetTransactions = getAssetTransactions(asset);
                    const isExpanded = expandedAssetId === asset.id;
                    const hasTransactions = assetTransactions.length > 0;

                    return (
                      <Collapsible
                        key={asset.id}
                        open={isExpanded}
                        onOpenChange={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className={cn(
                            "flex items-center justify-between p-3 bg-secondary/20 rounded-lg transition-colors",
                            "hover:bg-secondary/30 cursor-pointer"
                          )}>
                            <div className="flex items-center gap-3">
                              <ChevronDown className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                              <div className="text-left">
                                <p className="font-medium">{asset.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {asset.symbol ? `${asset.symbol} • ` : ''}{asset.category}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                'font-semibold',
                                asset.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'
                              )}>
                                {asset.unrealizedPnL >= 0 ? '+' : ''}{formatValue(asset.unrealizedPnL)}
                              </p>
                              <p className={cn(
                                'text-xs',
                                asset.unrealizedPnLPercent >= 0 ? 'text-success' : 'text-destructive'
                              )}>
                                {asset.unrealizedPnLPercent >= 0 ? '+' : ''}{asset.unrealizedPnLPercent.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="mt-2 ml-7 space-y-3 pb-2">
                            {hasTransactions ? (
                              <>
                                {/* Transaction History */}
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">Transaction History</p>
                                  {assetTransactions.map(tx => (
                                    <div 
                                      key={tx.id}
                                      className="group flex items-center justify-between p-2 bg-background/50 rounded border border-border/50"
                                    >
                                      <div className="flex items-center gap-2">
                                        {tx.transaction_type === 'buy' ? (
                                          <div className="p-1 rounded bg-success/10">
                                            <ArrowUpRight className="w-3 h-3 text-success" />
                                          </div>
                                        ) : (
                                          <div className="p-1 rounded bg-destructive/10">
                                            <ArrowDownRight className="w-3 h-3 text-destructive" />
                                          </div>
                                        )}
                                        <Badge 
                                          variant={tx.transaction_type === 'buy' ? 'default' : 'destructive'}
                                          className="text-[10px] px-1.5 py-0"
                                        >
                                          {tx.transaction_type.toUpperCase()}
                                        </Badge>
                                        <span className="text-sm">
                                          {tx.quantity} {tx.symbol}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <p className="text-sm">
                                            @{formatValue(tx.price_per_unit)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                                          </p>
                                          {tx.transaction_type === 'sell' && tx.realized_pnl !== undefined && (
                                            <p className={cn(
                                              'text-xs font-medium',
                                              tx.realized_pnl >= 0 ? 'text-success' : 'text-destructive'
                                            )}>
                                              P&L: {tx.realized_pnl >= 0 ? '+' : ''}{formatValue(tx.realized_pnl)}
                                            </p>
                                          )}
                                        </div>
                                        {/* Edit/Delete buttons */}
                                        {(onEditTransaction || onDeleteTransaction) && (
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onEditTransaction && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingTransaction(tx);
                                                }}
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
                                                    onClick={(e) => e.stopPropagation()}
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
                                  ))}
                                </div>

                                {/* Position Summary */}
                                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Current Position</p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Quantity:</span>
                                      <span className="ml-2 font-medium">{asset.quantity} {asset.symbol}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Avg Cost:</span>
                                      <span className="ml-2 font-medium">
                                        {asset.quantity && asset.cost_basis 
                                          ? formatValue(asset.cost_basis / asset.quantity)
                                          : 'N/A'
                                        }
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Cost Basis:</span>
                                      <span className="ml-2 font-medium">{formatValue(asset.cost_basis || 0)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Current Value:</span>
                                      <span className="ml-2 font-medium">{formatValue(asset.value)}</span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="p-3 bg-muted/30 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">
                                  No transactions recorded for this asset.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Use Buy/Sell from the asset card to track your trades.
                                </p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No assets with cost basis data.
                  </div>
                )}

                {assetsWithoutCostBasis.length > 0 && (
                  <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-warning" />
                      <p className="text-sm font-medium">Assets without cost basis</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Edit these assets to add purchase price for P&L tracking:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {assetsWithoutCostBasis.slice(0, 5).map(asset => (
                        <span
                          key={asset.id}
                          className="px-2 py-1 bg-secondary/50 rounded text-xs"
                        >
                          {asset.name}
                        </span>
                      ))}
                      {assetsWithoutCostBasis.length > 5 && (
                        <span className="px-2 py-1 bg-secondary/50 rounded text-xs">
                          +{assetsWithoutCostBasis.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="by-category" className="flex-1 min-h-0 mt-4">
            {pieData.length > 0 ? (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [
                          formatValue(props.payload.actualValue),
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-2">
                  {Object.entries(pnlByCategory).map(([category, data]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-2 bg-secondary/20 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[category] || '#888' }}
                        />
                        <span className="text-sm capitalize">{category}</span>
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        data.total >= 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {data.total >= 0 ? '+' : ''}{formatValue(data.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No P&L data by category.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Edit Transaction Dialog */}
      {onEditTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          onSave={async (id, data) => {
            await onEditTransaction(id, data);
          }}
          formatValue={formatValue}
        />
      )}
    </Dialog>
  );
}