import { Eye, Wallet, TrendingUp, TrendingDown, Landmark, Bitcoin, BarChart3, Gem, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PortfolioSnapshot } from '@/hooks/usePortfolioHistory';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Button } from '@/components/ui/button';

interface SnapshotDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: PortfolioSnapshot | null;
  formatValue: (value: number, showDecimals?: boolean) => string;
  formatDisplayUnitValue?: (value: number, showDecimals?: boolean) => string;
  currentNetWorth?: number;
  onDelete?: (snapshotId: string) => void;
  isDeleting?: boolean;
}

const CATEGORY_CONFIG = [
  { key: 'banking', label: 'Cash, Stablecoins & Real Estate', color: '#3b82f6', icon: Landmark },
  { key: 'crypto', label: 'Cryptocurrency', color: '#f59e0b', icon: Bitcoin },
  { key: 'stocks', label: 'Stocks, Bonds & ETFs', color: '#10b981', icon: BarChart3 },
  { key: 'commodities', label: 'Commodities', color: '#8b5cf6', icon: Gem },
] as const;

export function SnapshotDetailView({ open, onOpenChange, snapshot, formatValue, formatDisplayUnitValue, currentNetWorth, onDelete, isDeleting }: SnapshotDetailViewProps) {
  if (!snapshot) return null;

  const totalAssets = snapshot.total_assets;
  
  // Check if this snapshot is from the current month
  const isCurrentMonth = snapshot.snapshot_month.startsWith(
    new Date().toISOString().slice(0, 7)
  );
  
  // Prepare pie chart data
  const pieData = CATEGORY_CONFIG
    .map(cat => ({
      name: cat.label,
      value: snapshot.assets_breakdown[cat.key as keyof typeof snapshot.assets_breakdown] || 0,
      color: cat.color,
    }))
    .filter(item => item.value > 0);

  // Use stored monthly_debt_payments if available (new snapshots), otherwise 0
  const storedDebtPayments = (snapshot as any).monthly_debt_payments || 0;
  const netCashFlow = snapshot.total_income - snapshot.total_expenses - storedDebtPayments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            {format(parseISO(snapshot.snapshot_month), 'MMMM yyyy')} Snapshot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Net Worth</span>
              </div>
              <p className="text-2xl font-bold">
                {isCurrentMonth && currentNetWorth !== undefined && formatDisplayUnitValue
                  ? formatDisplayUnitValue(currentNetWorth, false)
                  : formatValue(snapshot.net_worth, false)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                {netCashFlow >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger" />
                )}
                <span className="text-sm text-muted-foreground">Net Cash Flow</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                netCashFlow >= 0 ? "text-success" : "text-danger"
              )}>
                {netCashFlow >= 0 ? '+' : ''}{formatValue(netCashFlow, false)}
              </p>
            </div>
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-lg font-semibold">{formatValue(snapshot.total_assets, false)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Debt</p>
              <p className="text-lg font-semibold text-danger">{formatValue(snapshot.total_debt, false)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Monthly Income</p>
              <p className="text-lg font-semibold text-success">{formatValue(snapshot.total_income)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Monthly Expenses</p>
              <p className="text-lg font-semibold">{formatValue(snapshot.total_expenses)}</p>
            </div>
          </div>

          {/* Asset Allocation Pie Chart */}
          {pieData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Asset Allocation</h3>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatValue(value, false)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {CATEGORY_CONFIG.map((cat) => {
                    const value = snapshot.assets_breakdown[cat.key as keyof typeof snapshot.assets_breakdown] || 0;
                    const percentage = totalAssets > 0 ? (value / totalAssets) * 100 : 0;
                    const Icon = cat.icon;
                    
                    if (value === 0) return null;

                    return (
                      <div key={cat.key} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        <span className="text-sm flex-1">{cat.label}</span>
                        <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Snapshot Info */}
          <p className="text-xs text-muted-foreground text-center">
            Snapshot taken on {format(parseISO(snapshot.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
          </p>

          {/* Delete Button */}
          {onDelete && (
            <div className="pt-4 border-t border-border">
              <DeleteConfirmDialog
                title="Delete this snapshot?"
                description={`This will permanently remove the ${format(parseISO(snapshot.snapshot_month), 'MMMM yyyy')} snapshot. This action cannot be undone.`}
                onConfirm={() => {
                  onDelete(snapshot.id);
                  onOpenChange(false);
                }}
                trigger={
                  <Button 
                    variant="outline" 
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete Snapshot'}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
