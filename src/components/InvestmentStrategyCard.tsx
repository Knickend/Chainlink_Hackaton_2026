import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Settings2, AlertTriangle, Plus, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useInvestmentPreferences, InvestmentAllocation } from '@/hooks/useInvestmentPreferences';
import { InvestmentPreferencesDialog } from './InvestmentPreferencesDialog';
import { Debt } from '@/lib/types';
import { analyzeDebts, calculateDebtAwareAllocations, DebtAnalysis, DebtAwareAllocation } from '@/lib/debtAnalysis';

interface InvestmentStrategyCardProps {
  freeMonthlyIncome: number;
  formatValue: (value: number) => string;
  debts?: Debt[];
  monthlyPayments?: number;
  delay?: number;
}

export function InvestmentStrategyCard({
  freeMonthlyIncome,
  formatValue,
  debts = [],
  monthlyPayments = 0,
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

  const baseAllocations = calculateAllocations();
  const debtAnalysis = analyzeDebts(debts, freeMonthlyIncome);
  
  // Calculate debt-aware allocations if there's priority debt
  const allocations = debtAnalysis.hasPriorityDebt && hasPreferences
    ? calculateDebtAwareAllocations(freeMonthlyIncome, debtAnalysis, baseAllocations)
    : baseAllocations;

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

  // Show strategy with debt awareness
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

      {/* Priority Debt Section */}
      {debtAnalysis.hasPriorityDebt && (
        <PriorityDebtSection 
          debtAnalysis={debtAnalysis} 
          formatValue={formatValue} 
        />
      )}

      {/* Low Interest Debt Note */}
      {!debtAnalysis.hasPriorityDebt && debts.length > 0 && (
        <LowInterestDebtNote debts={debts} />
      )}

      {/* Allocations */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          {debtAnalysis.hasPriorityDebt ? 'Recommended Allocation' : 'Monthly Investment Allocation'}
        </h4>
        {allocations.map((allocation, index) => (
          <AllocationRow
            key={allocation.category}
            allocation={allocation}
            formatValue={formatValue}
            index={index}
          />
        ))}
      </div>

      {/* Smart Tips */}
      {debtAnalysis.tips.length > 0 && (
        <SmartTipsSection tips={debtAnalysis.tips} />
      )}

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Investable</span>
          <span className="font-semibold text-lg">{formatValue(totalInvestable)}/month</span>
        </div>
      </div>
    </motion.div>
  );
}

function PriorityDebtSection({
  debtAnalysis,
  formatValue,
}: {
  debtAnalysis: DebtAnalysis;
  formatValue: (value: number) => string;
}) {
  const topPriorityDebt = debtAnalysis.priorityDebts[0];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-6 p-4 rounded-lg bg-destructive/5 border border-destructive/20"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <AlertCircle className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm">Priority: Pay Off High-Interest Debt</h4>
            <Badge variant="destructive" className="text-xs">
              {topPriorityDebt.debt.interest_rate}% APR
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {topPriorityDebt.debt.name}
          </p>
          {topPriorityDebt.potentialSavings > 0 && (
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="text-muted-foreground">
                Extra payments save{' '}
                <span className="font-medium text-foreground">
                  {formatValue(topPriorityDebt.potentialSavings)}
                </span>{' '}
                in interest
              </span>
              {topPriorityDebt.monthsSavedWithExtra > 0 && (
                <span className="text-muted-foreground">
                  Debt-free{' '}
                  <span className="font-medium text-foreground">
                    {topPriorityDebt.monthsSavedWithExtra} months
                  </span>{' '}
                  sooner
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function LowInterestDebtNote({ debts }: { debts: Debt[] }) {
  const avgRate = debts.reduce((sum, d) => sum + d.interest_rate, 0) / debts.length;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-6 p-3 rounded-lg bg-muted/50"
    >
      <p className="text-sm text-muted-foreground">
        Your {avgRate.toFixed(1)}% average debt rate is below typical market returns — 
        maintaining while investing makes sense.
      </p>
    </motion.div>
  );
}

function SmartTipsSection({ tips }: { tips: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-6 pt-4 border-t border-border"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h4 className="text-sm font-medium">Smart Tips</h4>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className="text-sm text-muted-foreground flex items-start gap-2"
          >
            <span className="text-primary mt-1">•</span>
            <span>{tip}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function AllocationRow({
  allocation,
  formatValue,
  index,
}: {
  allocation: DebtAwareAllocation | InvestmentAllocation;
  formatValue: (value: number) => string;
  index: number;
}) {
  const isPriority = 'isPriority' in allocation && allocation.isPriority;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="space-y-2"
    >
      <div className="flex justify-between items-center text-sm">
        <span className={`font-medium ${isPriority ? 'text-destructive' : ''}`}>
          {allocation.category}
          {isPriority && (
            <Badge variant="destructive" className="ml-2 text-xs">
              Priority
            </Badge>
          )}
        </span>
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
