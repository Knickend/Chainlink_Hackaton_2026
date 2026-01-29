import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Calendar, TrendingDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Debt, DEBT_TYPES, DisplayUnit, UNIT_SYMBOLS } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface DebtPayoffCalculatorProps {
  debts: Debt[];
  displayUnit: DisplayUnit;
  convertFromCurrency: (amount: number, fromCurrency: string) => number;
  formatCurrencyValue: (amount: number, fromCurrency: string, showDecimals?: boolean) => string;
  delay?: number;
}

interface PayoffDetails {
  debt: Debt;
  monthsToPayoff: number | null; // null means never (payment < interest)
  totalInterest: number;
  totalPayment: number;
  payoffDate: Date | null;
  minimumPayment: number;
  isPayable: boolean;
}

function calculatePayoffDetails(debt: Debt): PayoffDetails {
  const principal = debt.principal_amount;
  const annualRate = debt.interest_rate / 100;
  const monthlyRate = annualRate / 12;
  const monthlyPayment = debt.monthly_payment || 0;

  // Calculate minimum payment needed to cover interest
  const minimumPayment = principal * monthlyRate;

  // If no payment or payment <= interest only, can't pay off
  if (monthlyPayment <= minimumPayment) {
    return {
      debt,
      monthsToPayoff: null,
      totalInterest: 0,
      totalPayment: 0,
      payoffDate: null,
      minimumPayment,
      isPayable: false,
    };
  }

  // Calculate months to pay off using loan amortization formula
  // n = -log(1 - (r * P) / M) / log(1 + r)
  // where P = principal, r = monthly rate, M = monthly payment
  let months: number;
  let totalInterest: number;

  if (monthlyRate === 0) {
    // No interest - simple division
    months = Math.ceil(principal / monthlyPayment);
    totalInterest = 0;
  } else {
    const ratio = (monthlyRate * principal) / monthlyPayment;
    if (ratio >= 1) {
      // Payment doesn't cover interest
      return {
        debt,
        monthsToPayoff: null,
        totalInterest: 0,
        totalPayment: 0,
        payoffDate: null,
        minimumPayment,
        isPayable: false,
      };
    }
    months = Math.ceil(-Math.log(1 - ratio) / Math.log(1 + monthlyRate));
    
    // Calculate total interest paid
    const totalPayment = monthlyPayment * months;
    totalInterest = totalPayment - principal;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return {
    debt,
    monthsToPayoff: months,
    totalInterest,
    totalPayment: monthlyPayment * months,
    payoffDate,
    minimumPayment,
    isPayable: true,
  };
}

function formatMonthsToYears(months: number): string {
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  return `${years}y ${remainingMonths}m`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Helper to format values that are already in the display unit (no conversion needed)
function formatDisplayUnitValue(value: number, displayUnit: DisplayUnit, showDecimals = true): string {
  const symbol = UNIT_SYMBOLS[displayUnit];
  
  if (displayUnit === 'GOLD') {
    return `${value.toFixed(4)} ${symbol}`;
  }
  
  if (displayUnit === 'BTC') {
    return `${symbol}${value.toFixed(6)}`;
  }
  
  const formatted = showDecimals 
    ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  
  return `${symbol}${formatted}`;
}

export function DebtPayoffCalculator({
  debts,
  displayUnit,
  convertFromCurrency,
  formatCurrencyValue,
  delay = 0,
}: DebtPayoffCalculatorProps) {
  const [isOpen, setIsOpen] = useState(true);

  const payoffDetails = useMemo(() => debts.map(calculatePayoffDetails), [debts]);
  const payableDebts = useMemo(() => payoffDetails.filter(d => d.isPayable), [payoffDetails]);
  
  // Calculate totals in display unit by converting each debt's values first
  const totalMonthlyPaymentsDisplay = useMemo(() => 
    debts.reduce((sum, d) => sum + convertFromCurrency(d.monthly_payment || 0, d.currency || 'USD'), 0),
    [debts, convertFromCurrency]
  );
  
  const totalInterestToPayDisplay = useMemo(() => 
    payableDebts.reduce((sum, d) => sum + convertFromCurrency(d.totalInterest, d.debt.currency || 'USD'), 0),
    [payableDebts, convertFromCurrency]
  );
  
  // Find the longest payoff time
  const longestPayoff = Math.max(...payableDebts.map(d => d.monthsToPayoff || 0), 0);
  const debtFreeDate = longestPayoff > 0 ? (() => {
    const date = new Date();
    date.setMonth(date.getMonth() + longestPayoff);
    return date;
  })() : null;

  if (debts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-xl p-6"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Debt Payoff Calculator</h3>
              <p className="text-sm text-muted-foreground">
                {debtFreeDate ? `Debt-free by ${formatDate(debtFreeDate)}` : 'Set payments to calculate'}
              </p>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-secondary/30 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Time to Debt-Free</p>
            <p className="font-semibold text-primary">
              {longestPayoff > 0 ? formatMonthsToYears(longestPayoff) : '—'}
            </p>
          </div>
          <div className="text-center border-x border-border/50">
            <p className="text-xs text-muted-foreground">Total Interest</p>
            <p className="font-semibold text-amber-500">
              {totalInterestToPayDisplay > 0 ? formatDisplayUnitValue(totalInterestToPayDisplay, displayUnit) : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Monthly Payments</p>
            <p className="font-semibold">{formatDisplayUnitValue(totalMonthlyPaymentsDisplay, displayUnit)}</p>
          </div>
        </div>

        <CollapsibleContent>
          {/* Individual Debt Payoff Details */}
          <div className="space-y-3 mt-4">
            {payoffDetails.map((details) => {
              const debtTypeLabel = DEBT_TYPES.find(t => t.value === details.debt.debt_type)?.label || details.debt.debt_type;
              const debtCurrency = details.debt.currency || 'USD';
              const progressPercent = details.isPayable && details.monthsToPayoff 
                ? Math.min(100, (1 - details.debt.principal_amount / (details.debt.principal_amount + details.totalInterest)) * 100)
                : 0;

              return (
                <div
                  key={details.debt.id}
                  className="p-4 rounded-lg bg-secondary/20 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{details.debt.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {debtTypeLabel} • {details.debt.interest_rate}% APR
                      </p>
                    </div>
                    <div className="text-right">
                      {details.isPayable && details.monthsToPayoff ? (
                        <>
                          <p className="font-semibold text-sm text-primary">
                            {formatMonthsToYears(details.monthsToPayoff)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {details.payoffDate && formatDate(details.payoffDate)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-destructive font-medium">
                          {details.debt.monthly_payment 
                            ? 'Payment too low' 
                            : 'No payment set'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {details.isPayable && (
                    <div className="space-y-1">
                      <Progress value={progressPercent} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Principal: {formatCurrencyValue(details.debt.principal_amount, debtCurrency)}</span>
                        <span>Interest: {formatCurrencyValue(details.totalInterest, debtCurrency)}</span>
                      </div>
                    </div>
                  )}

                  {/* Warning for insufficient payment */}
                  {!details.isPayable && details.debt.monthly_payment && details.debt.monthly_payment > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                      <TrendingDown className="w-3 h-3" />
                      <span>
                        Minimum payment needed: {formatCurrencyValue(details.minimumPayment, debtCurrency)}/mo to cover interest
                      </span>
                    </div>
                  )}

                  {/* Payment details */}
                  {details.isPayable && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        <span>Payment: {formatCurrencyValue(details.debt.monthly_payment || 0, debtCurrency)}/mo</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Total: {formatCurrencyValue(details.totalPayment, debtCurrency)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tip */}
          {payableDebts.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium text-foreground">Tip:</span> Increasing your monthly payment by just {formatDisplayUnitValue(totalMonthlyPaymentsDisplay * 0.1, displayUnit)} could save you months of interest payments.
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}
