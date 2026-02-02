import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { ProfitLossData } from '@/hooks/useProfitLoss';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface ProfitLossDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pnlData: ProfitLossData;
  formatValue: (value: number, showSign?: boolean) => string;
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
}: ProfitLossDetailDialogProps) {
  const { assetsWithCostBasis, assetsWithoutCostBasis, pnlByCategory, totalPnL, totalPnLPercent } = pnlData;

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
      <DialogContent className="glass-card border-primary/20 max-w-2xl max-h-[80vh] overflow-y-auto">
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
        <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg">
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

        <Tabs defaultValue="by-asset" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="by-asset">By Asset</TabsTrigger>
            <TabsTrigger value="by-category">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="by-asset" className="space-y-4 mt-4">
            {assetsWithCostBasis.length > 0 ? (
              <div className="space-y-2">
                {assetsWithCostBasis.map(asset => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.symbol ? `${asset.symbol} • ` : ''}{asset.category}
                      </p>
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
                ))}
              </div>
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
          </TabsContent>

          <TabsContent value="by-category" className="mt-4">
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
    </Dialog>
  );
}
