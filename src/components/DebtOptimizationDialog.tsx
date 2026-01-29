import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Lightbulb,
  Target,
  CreditCard,
  Wallet
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Debt } from '@/lib/types';
import { analyzeDebts, generateNegativeIncomeTips, HIGH_INTEREST_THRESHOLD } from '@/lib/debtAnalysis';

interface DebtOptimizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debts: Debt[];
  monthlyShortfall: number;
  monthlyPayments: number;
  formatValue: (value: number) => string;
}

export function DebtOptimizationDialog({
  open,
  onOpenChange,
  debts,
  monthlyShortfall,
  monthlyPayments,
  formatValue,
}: DebtOptimizationDialogProps) {
  const debtAnalysis = useMemo(() => analyzeDebts(debts, -monthlyShortfall), [debts, monthlyShortfall]);
  const negativeIncomeTips = useMemo(
    () => generateNegativeIncomeTips(debts, monthlyShortfall, formatValue),
    [debts, monthlyShortfall, formatValue]
  );

  const totalDebt = debts.reduce((sum, d) => sum + d.principal_amount, 0);
  const monthlyInterest = debts.reduce((sum, d) => {
    const monthlyRate = d.interest_rate / 100 / 12;
    return sum + d.principal_amount * monthlyRate;
  }, 0);

  const priorityDebts = debtAnalysis.priorityDebts;
  const allTips = [...negativeIncomeTips, ...debtAnalysis.tips.filter(t => !negativeIncomeTips.includes(t))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Debt Optimization Advisor
          </DialogTitle>
          <DialogDescription>
            Personalized strategies to balance your budget and optimize debt payoff.
          </DialogDescription>
        </DialogHeader>

        {/* Budget Gap Alert */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-lg bg-destructive/10 border border-destructive/30"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Budget Gap</p>
              <p className="text-xl font-bold text-destructive">
                -{formatValue(monthlyShortfall)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Debt Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Wallet className="w-4 h-4" />}
            label="Total Debt"
            value={formatValue(totalDebt)}
            delay={0.1}
          />
          <StatCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Monthly Payments"
            value={formatValue(monthlyPayments)}
            delay={0.15}
          />
          <StatCard
            icon={<Percent className="w-4 h-4" />}
            label="Monthly Interest"
            value={formatValue(monthlyInterest)}
            delay={0.2}
          />
        </div>

        {/* Priority Debts Section */}
        {priorityDebts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Priority Debts
            </h4>
            <div className="space-y-2">
              {priorityDebts.slice(0, 3).map((pd, index) => (
                <PriorityDebtCard
                  key={pd.debt.id}
                  debt={pd.debt}
                  reason={pd.reason}
                  monthlyInterest={pd.monthlyInterest}
                  formatValue={formatValue}
                  delay={0.3 + index * 0.1}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* No Priority Debts */}
        {priorityDebts.length === 0 && debts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="p-3 rounded-lg bg-muted/50"
          >
            <p className="text-sm text-muted-foreground">
              Your debts have relatively low interest rates. Focus on reducing expenses or increasing income.
            </p>
          </motion.div>
        )}

        {/* Optimization Tips */}
        {allTips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-warning" />
              Action Steps
            </h4>
            <ul className="space-y-2">
              {allTips.slice(0, 5).map((tip, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + index * 0.05 }}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary mt-0.5">•</span>
                  <span>{tip}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-3 rounded-lg bg-muted/50 text-center"
    >
      <div className="flex justify-center text-muted-foreground mb-1">
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </motion.div>
  );
}

function PriorityDebtCard({
  debt,
  reason,
  monthlyInterest,
  formatValue,
  delay,
}: {
  debt: Debt;
  reason: string;
  monthlyInterest: number;
  formatValue: (value: number) => string;
  delay: number;
}) {
  const isHighInterest = debt.interest_rate / 100 > HIGH_INTEREST_THRESHOLD;
  const isCreditCard = debt.debt_type === 'credit_card';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="p-3 rounded-lg border border-destructive/20 bg-destructive/5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isCreditCard ? (
            <CreditCard className="w-4 h-4 text-destructive" />
          ) : (
            <DollarSign className="w-4 h-4 text-destructive" />
          )}
          <div>
            <p className="font-medium text-sm">{debt.name}</p>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs shrink-0">
          {debt.interest_rate}% APR
        </Badge>
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Principal: {formatValue(debt.principal_amount)}</span>
        <span>Interest/mo: {formatValue(monthlyInterest)}</span>
      </div>
    </motion.div>
  );
}
