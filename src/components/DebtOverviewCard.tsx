import { motion } from 'framer-motion';
import { CreditCard, Trash2, Home, Car, GraduationCap, Wallet } from 'lucide-react';
import { Debt, DebtType, DEBT_TYPES, DisplayUnit, convertCurrency, UNIT_SYMBOLS, FOREX_RATES_TO_USD, BankingCurrency, DEFAULT_CONVERSION_RATES } from '@/lib/types';
import { EditDebtDialog } from './EditDebtDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Button } from '@/components/ui/button';

interface DebtOverviewCardProps {
  debts: Debt[];
  totalDebt: number;
  monthlyPayments: number;
  monthlyInterest: number;
  formatValue: (value: number, showSign?: boolean) => string;
  onUpdateDebt?: (id: string, data: Partial<Omit<Debt, 'id'>>) => void;
  onDeleteDebt?: (id: string) => void;
  actionButton?: React.ReactNode;
  delay?: number;
  displayUnit: DisplayUnit;
}

const getDebtIcon = (type: DebtType) => {
  switch (type) {
    case 'mortgage':
      return Home;
    case 'credit_card':
      return CreditCard;
    case 'auto_loan':
      return Car;
    case 'student_loan':
      return GraduationCap;
    default:
      return Wallet;
  }
};

const getDebtTypeLabel = (type: DebtType): string => {
  return DEBT_TYPES.find(t => t.value === type)?.label || type;
};

export function DebtOverviewCard({
  debts,
  totalDebt,
  monthlyPayments,
  monthlyInterest,
  formatValue,
  onUpdateDebt,
  onDeleteDebt,
  actionButton,
  delay = 0,
  displayUnit,
}: DebtOverviewCardProps) {
  // Helper to format a debt value with its stored currency
  const formatDebtValue = (amount: number, debtCurrency: string): string => {
    // For BTC and GOLD display units, convert via USD
    if (displayUnit === 'BTC' || displayUnit === 'GOLD') {
      const amountInUSD = amount * (FOREX_RATES_TO_USD[debtCurrency as BankingCurrency] || 1);
      const converted = amountInUSD * DEFAULT_CONVERSION_RATES[displayUnit];
      const symbol = UNIT_SYMBOLS[displayUnit];
      if (displayUnit === 'GOLD') {
        return `${converted.toFixed(4)} ${symbol}`;
      }
      return `${symbol}${converted.toFixed(6)}`;
    }
    
    // For fiat display units - if same currency, show original amount
    if (debtCurrency === displayUnit) {
      const symbol = UNIT_SYMBOLS[displayUnit];
      return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // Otherwise, convert from stored currency to display currency
    const converted = convertCurrency(amount, debtCurrency, displayUnit);
    const symbol = UNIT_SYMBOLS[displayUnit];
    return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card rounded-xl p-5 overflow-hidden"
    >
      {/* Row 1: Title + Action Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold">Debts & Liabilities</h3>
            <p className="text-xs text-muted-foreground">Track loans and interest</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {actionButton}
        </div>
      </div>

      {/* Row 2: Stats Summary Grid */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/30 rounded-lg mb-4">
        <div className="text-center">
          <p className="font-mono font-semibold text-lg text-destructive/90">{formatValue(totalDebt)}</p>
          <p className="text-xs text-muted-foreground">Total Debt</p>
        </div>
        <div className="text-center border-x border-border/50">
          <p className="font-semibold">{formatValue(monthlyPayments)}</p>
          <p className="text-xs text-muted-foreground">Monthly</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-amber-500">{formatValue(monthlyInterest)}</p>
          <p className="text-xs text-muted-foreground">Interest/mo</p>
        </div>
      </div>

      {/* Row 3: Debt List */}
      <div className="space-y-2 max-h-[180px] overflow-y-auto">
        {debts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No debts tracked yet
          </p>
        ) : (
          debts.map((debt) => {
            const Icon = getDebtIcon(debt.debt_type);
            const monthlyRate = debt.interest_rate / 100 / 12;
            const estimatedMonthlyInterest = debt.principal_amount * monthlyRate;

            return (
              <div
                key={debt.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{debt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDebtTypeLabel(debt.debt_type)} • {debt.interest_rate}% APR
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-semibold text-sm text-destructive/90">
                      {formatDebtValue(debt.principal_amount, debt.currency || 'USD')}
                    </p>
                    {debt.monthly_payment ? (
                      <p className="text-xs text-muted-foreground">
                        {formatDebtValue(debt.monthly_payment, debt.currency || 'USD')}/mo
                      </p>
                    ) : (
                      <p className="text-xs text-amber-500">
                        ~{formatDebtValue(estimatedMonthlyInterest, debt.currency || 'USD')} int/mo
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onUpdateDebt && (
                      <EditDebtDialog debt={debt} onUpdate={onUpdateDebt} displayUnit={displayUnit} />
                    )}
                    {onDeleteDebt && (
                      <DeleteConfirmDialog
                        title="Delete Debt"
                        description={`Are you sure you want to delete "${debt.name}"? This action cannot be undone.`}
                        onConfirm={() => onDeleteDebt(debt.id)}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
