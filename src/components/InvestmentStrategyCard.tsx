import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Settings2, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useInvestmentPreferences, InvestmentAllocation } from '@/hooks/useInvestmentPreferences';
import { InvestmentPreferencesDialog } from './InvestmentPreferencesDialog';

interface InvestmentStrategyCardProps {
  freeMonthlyIncome: number;
  formatValue: (value: number) => string;
  delay?: number;
}

export function InvestmentStrategyCard({
  freeMonthlyIncome,
  formatValue,
  delay = 0,
}: InvestmentStrategyCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    preferences,
    loading,
    savePreferences,
    calculateAllocations,
    totalInvestable,
    hasPreferences,
  } = useInvestmentPreferences(freeMonthlyIncome);

  const allocations = calculateAllocations();

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-card rounded-xl p-6"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="space-y-3">
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Negative income warning
  if (freeMonthlyIncome < 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-card rounded-xl p-6 border-destructive/50"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-destructive/10">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No Investable Income</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your expenses and debt payments exceed your income by {formatValue(Math.abs(freeMonthlyIncome))}/month.
              Consider reviewing your budget before setting up an investment strategy.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Zero income warning
  if (freeMonthlyIncome === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-warning/10">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No Free Income</h3>
            <p className="text-sm text-muted-foreground mt-1">
              All your income is currently allocated to expenses and debt payments.
              Add income sources or reduce expenses to start investing.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // No preferences set - prompt to create
  if (!hasPreferences) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-card rounded-xl p-6"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Investment Strategy</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Based on your {formatValue(freeMonthlyIncome)}/month free income, 
              set up a personalized investment allocation strategy.
            </p>
          </div>
          <InvestmentPreferencesDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            currentPreferences={null}
            onSave={savePreferences}
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Strategy
              </Button>
            }
          />
        </div>
      </motion.div>
    );
  }

  // Show strategy
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Investment Strategy
          </h3>
          <p className="text-sm text-muted-foreground">
            Based on {formatValue(freeMonthlyIncome)}/mo free income
          </p>
        </div>
        <InvestmentPreferencesDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          currentPreferences={preferences}
          onSave={savePreferences}
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Edit
            </Button>
          }
        />
      </div>

      <div className="space-y-4">
        {allocations.map((allocation, index) => (
          <AllocationRow
            key={allocation.category}
            allocation={allocation}
            formatValue={formatValue}
            index={index}
          />
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Investable</span>
          <span className="font-semibold text-lg">{formatValue(totalInvestable)}/month</span>
        </div>
      </div>
    </motion.div>
  );
}

function AllocationRow({
  allocation,
  formatValue,
  index,
}: {
  allocation: InvestmentAllocation;
  formatValue: (value: number) => string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="space-y-2"
    >
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{allocation.category}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{allocation.percentage}%</span>
          <span className="font-medium">{formatValue(allocation.amount)}</span>
        </div>
      </div>
      <Progress
        value={allocation.percentage}
        className="h-2"
        style={{
          // @ts-ignore - custom CSS variable
          '--progress-color': allocation.color,
        }}
      />
    </motion.div>
  );
}
