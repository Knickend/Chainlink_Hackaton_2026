import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, ChevronRight } from 'lucide-react';
import { Asset, AssetTransaction } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { UpdateTransactionData } from '@/hooks/useAssetTransactions';
import { PnLPeriodSelector, PeriodRange, getDefaultPeriod } from './PnLPeriodSelector';
import { usePeriodPnL, OpenPositionWithPeriodData, ClosedThisPeriod } from '@/hooks/usePeriodPnL';
import { AssetDetailModal } from './AssetDetailModal';

interface ProfitLossDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
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
  assets,
  formatValue,
  transactions = [],
  onEditTransaction,
  onDeleteTransaction,
}: ProfitLossDetailDialogProps) {
  const [period, setPeriod] = useState<PeriodRange>(getDefaultPeriod);
  const [selectedAsset, setSelectedAsset] = useState<OpenPositionWithPeriodData | ClosedThisPeriod | null>(null);

  const pnlData = usePeriodPnL(
    assets,
    transactions,
    period.start,
    period.end,
    period.label
  );

  const { 
    totalPnL, 
    totalPnLPercent, 
    totalUnrealizedPnL, 
    periodRealizedPnL,
    pnlByCategory, 
    assetsWithoutCostBasis,
    openPositionsWithPeriodData,
    closedThisPeriod,
  } = pnlData;

  // Prepare pie chart data
  const pieData = Object.entries(pnlByCategory)
    .filter(([_, data]) => data.total !== 0)
    .map(([category, data]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: Math.abs(data.total),
      actualValue: data.total,
      color: CATEGORY_COLORS[category] || '#888',
    }));

  // Filter open positions to only those with cost basis
  const positionsWithData = openPositionsWithPeriodData.filter(
    p => p.cost_basis && p.cost_basis > 0
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card border-primary/20 max-w-2xl h-[85vh] max-h-[85vh] min-h-0 overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 space-y-3">
            <DialogTitle className="flex items-center gap-2">
              {totalPnL >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
              Profit & Loss Hub
            </DialogTitle>
            
            {/* Period Selector */}
            <PnLPeriodSelector value={period} onChange={setPeriod} />
          </DialogHeader>

          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-secondary/30 rounded-lg flex-shrink-0">
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
                totalUnrealizedPnL >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}{formatValue(totalUnrealizedPnL)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Realized ({period.label})</p>
              <p className={cn(
                'text-lg font-bold',
                periodRealizedPnL >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {periodRealizedPnL >= 0 ? '+' : ''}{formatValue(periodRealizedPnL)}
              </p>
            </div>
          </div>

          <Tabs defaultValue="by-asset" className="w-full flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="by-asset">By Asset</TabsTrigger>
              <TabsTrigger value="by-category">By Category</TabsTrigger>
            </TabsList>

            <TabsContent value="by-asset" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4">
                
                {/* Open Positions Section */}
                {positionsWithData.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        Open Positions ({positionsWithData.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {positionsWithData.map(position => (
                        <button
                          key={position.id}
                          onClick={() => setSelectedAsset(position)}
                          className={cn(
                            "w-full text-left p-3 bg-secondary/20 rounded-lg transition-colors",
                            "hover:bg-secondary/30 cursor-pointer border border-transparent hover:border-primary/20"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{position.name}</p>
                                {position.symbol && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                    {position.symbol}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {position.quantity 
                                  ? `${position.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${position.symbol || ''}`
                                  : position.category
                                } • {formatValue(position.value)}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <div>
                                <p className={cn(
                                  'font-semibold text-sm',
                                  position.unrealizedPnL >= 0 ? 'text-success' : 'text-destructive'
                                )}>
                                  {position.unrealizedPnL >= 0 ? '+' : ''}{formatValue(position.unrealizedPnL)}
                                </p>
                                <p className={cn(
                                  'text-xs',
                                  position.unrealizedPnLPercent >= 0 ? 'text-success' : 'text-destructive'
                                )}>
                                  {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(1)}%
                                </p>
                                {position.periodRealizedPnL !== 0 && (
                                  <p className={cn(
                                    'text-[10px]',
                                    position.periodRealizedPnL >= 0 ? 'text-success/80' : 'text-destructive/80'
                                  )}>
                                    Realized: {position.periodRealizedPnL >= 0 ? '+' : ''}{formatValue(position.periodRealizedPnL)}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Closed This Period Section */}
                {closedThisPeriod.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        Closed {period.preset !== 'all' ? period.label : ''} ({closedThisPeriod.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {closedThisPeriod.map(position => (
                        <button
                          key={position.id}
                          onClick={() => setSelectedAsset(position)}
                          className={cn(
                            "w-full text-left p-3 bg-secondary/20 rounded-lg transition-colors",
                            "hover:bg-secondary/30 cursor-pointer border border-transparent hover:border-primary/20"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{position.name}</p>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                  Closed
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {position.symbol} • {position.category}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <div>
                                <p className={cn(
                                  'font-semibold text-sm',
                                  position.realizedPnL >= 0 ? 'text-success' : 'text-destructive'
                                )}>
                                  {position.realizedPnL >= 0 ? '+' : ''}{formatValue(position.realizedPnL)}
                                </p>
                                <p className={cn(
                                  'text-xs',
                                  position.realizedPnLPercent >= 0 ? 'text-success' : 'text-destructive'
                                )}>
                                  {position.realizedPnLPercent >= 0 ? '+' : ''}{position.realizedPnLPercent.toFixed(1)}%
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {positionsWithData.length === 0 && closedThisPeriod.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No positions with P&L data found.
                  </div>
                )}

                {/* Assets without cost basis warning */}
                {assetsWithoutCostBasis.length > 0 && (
                  <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
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
            </TabsContent>

            <TabsContent value="by-category" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
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
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        open={!!selectedAsset}
        onOpenChange={(open) => {
          if (!open) setSelectedAsset(null);
        }}
        asset={selectedAsset}
        periodLabel={period.label}
        formatValue={formatValue}
        onEditTransaction={onEditTransaction}
        onDeleteTransaction={onDeleteTransaction}
      />
    </>
  );
}
