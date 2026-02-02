import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ChevronRight, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProBadge } from './ProBadge';
import { ProfitLossData } from '@/hooks/useProfitLoss';
import { ProfitLossDetailDialog } from './ProfitLossDetailDialog';
import { AssetTransaction } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProfitLossCardProps {
  pnlData: ProfitLossData;
  formatValue: (value: number, showSign?: boolean) => string;
  delay?: number;
  transactions?: AssetTransaction[];
}

export function ProfitLossCard({ pnlData, formatValue, delay = 0, transactions = [] }: ProfitLossCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const { totalPnL, totalUnrealizedPnL, totalRealizedPnL, totalPnLPercent } = pnlData;
  const isPositive = totalPnL >= 0;
  const isUnrealizedPositive = totalUnrealizedPnL >= 0;
  const isRealizedPositive = totalRealizedPnL >= 0;
  const hasData = pnlData.assetsWithCostBasis.length > 0 || totalRealizedPnL !== 0;

  // Calculate individual percentages for unrealized/realized
  const totalCostBasis = pnlData.assetsWithCostBasis.reduce((sum, a) => sum + (a.cost_basis || 0), 0);
  const unrealizedPercent = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
      >
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Profit & Loss
              </CardTitle>
              <ProBadge />
            </div>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Total P&L - main stat */}
                <div className="flex items-center gap-4">
                  {isPositive ? (
                    <div className="p-3 rounded-full bg-success/10">
                      <TrendingUp className="w-6 h-6 text-success" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-full bg-destructive/10">
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <span className={cn(
                      'text-2xl font-bold',
                      isPositive ? 'text-success' : 'text-destructive'
                    )}>
                      {isPositive ? '+' : ''}{formatValue(totalPnL)}
                    </span>
                    <p className={cn(
                      'text-sm font-medium',
                      isPositive ? 'text-success' : 'text-destructive'
                    )}>
                      {isPositive ? '+' : ''}{totalPnLPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Unrealized & Realized - side by side */}
                <div className="flex gap-4 md:gap-6">
                  <div className="bg-secondary/30 rounded-lg p-4 min-w-[140px]">
                    <p className="text-xs text-muted-foreground mb-1">Unrealized</p>
                    <p className={cn(
                      'text-lg font-semibold',
                      isUnrealizedPositive ? 'text-success' : 'text-destructive'
                    )}>
                      {isUnrealizedPositive ? '+' : ''}{formatValue(totalUnrealizedPnL)}
                    </p>
                    <p className={cn(
                      'text-xs',
                      isUnrealizedPositive ? 'text-success/80' : 'text-destructive/80'
                    )}>
                      {isUnrealizedPositive ? '+' : ''}{unrealizedPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-4 min-w-[140px]">
                    <p className="text-xs text-muted-foreground mb-1">Realized</p>
                    <p className={cn(
                      'text-lg font-semibold',
                      isRealizedPositive ? 'text-success' : 'text-destructive'
                    )}>
                      {isRealizedPositive ? '+' : ''}{formatValue(totalRealizedPnL)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From sales
                    </p>
                  </div>
                </div>

                {/* View Details button */}
                <Button
                  variant="outline"
                  className="gap-2 md:w-auto"
                  onClick={() => setShowDetails(true)}
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  No cost basis data yet.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Add purchase price when editing assets to track P&L.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ProfitLossDetailDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        pnlData={pnlData}
        formatValue={formatValue}
        transactions={transactions}
      />
    </>
  );
}
