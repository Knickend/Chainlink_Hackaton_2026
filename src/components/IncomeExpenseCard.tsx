import { ReactNode, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Repeat, Zap } from 'lucide-react';
import { Income, Expense, DisplayUnit, convertCurrency, UNIT_SYMBOLS, FOREX_RATES_TO_USD, BankingCurrency, DEFAULT_CONVERSION_RATES, isBitcoinCurrency, getBitcoinCurrencySymbol, BitcoinCurrency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EditIncomeDialog } from './EditIncomeDialog';
import { EditExpenseDialog } from './EditExpenseDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Badge } from '@/components/ui/badge';

interface IncomeExpenseCardProps {
  type: 'income' | 'expense';
  items: Income[] | Expense[];
  total: string;
  formatValue: (value: number) => string;
  actionButton?: ReactNode;
  onUpdateIncome?: (id: string, data: Partial<Omit<Income, 'id'>>) => void;
  onDeleteIncome?: (id: string) => void;
  onUpdateExpense?: (id: string, data: Partial<Omit<Expense, 'id'>>) => void;
  onDeleteExpense?: (id: string) => void;
  displayUnit: DisplayUnit;
}

export function IncomeExpenseCard({
  type,
  items,
  total,
  formatValue,
  actionButton,
  onUpdateIncome,
  onDeleteIncome,
  onUpdateExpense,
  onDeleteExpense,
  displayUnit,
}: IncomeExpenseCardProps) {
  const isIncome = type === 'income';
  
  // Count recurring vs one-time for expenses
  const expenseItems = !isIncome ? (items as Expense[]) : [];
  const recurringCount = expenseItems.filter(e => e.is_recurring).length;
  const oneTimeCount = expenseItems.filter(e => !e.is_recurring).length;
  
  // Count income types
  const incomeItems = isIncome ? (items as Income[]) : [];
  const workIncomeCount = incomeItems.filter(i => i.type === 'work').length;
  
  // Helper to format a value with its stored currency (for display in native currency)
  const formatNativeValue = useCallback((amount: number, itemCurrency: string): string => {
    // For Bitcoin currencies, format with appropriate symbol and precision
    if (isBitcoinCurrency(itemCurrency)) {
      const symbol = getBitcoinCurrencySymbol(itemCurrency as BitcoinCurrency);
      if (itemCurrency === 'BTC') {
        return `${symbol}${amount.toFixed(8)}`;
      }
      // SATS - whole numbers
      return `${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
    }
    
    // For fiat currencies, always show in native currency (the currency it was entered in)
    // This preserves the user's original entry: €2,300 stays as €2,300
    const currencySymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CHF: 'CHF ',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CNY: '¥',
      INR: '₹',
      SEK: 'kr ',
      NOK: 'kr ',
      DKK: 'kr ',
      PLN: 'zł ',
      CZK: 'Kč ',
      HUF: 'Ft ',
      RON: 'lei ',
      BGN: 'лв ',
      HRK: 'kn ',
      RUB: '₽',
      TRY: '₺',
    };
    
    const symbol = currencySymbols[itemCurrency] || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-xl p-5 overflow-hidden"
    >
      {/* Row 1: Title + Action Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              isIncome ? 'bg-success/10' : 'bg-danger/10'
            )}
          >
            {isIncome ? (
              <ArrowUpRight className="w-5 h-5 text-success" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-danger" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{isIncome ? 'Monthly Income' : 'Expenses'}</h3>
            <p className="text-xs text-muted-foreground">
              {isIncome ? 'Track your earnings' : 'Track your spending'}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {actionButton}
        </div>
      </div>

      {/* Row 2: Stats Summary Grid */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/30 rounded-lg mb-4">
        <div className="text-center">
          <p className={cn(
            'font-mono font-semibold text-lg',
            isIncome ? 'text-success' : 'text-danger'
          )}>
            {isIncome ? '+' : '-'}{total}
          </p>
          <p className="text-xs text-muted-foreground">
            {isIncome ? 'per month' : 'total'}
          </p>
        </div>
        <div className="text-center border-x border-border/50">
          <p className="font-semibold">
            {isIncome ? items.length : recurringCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {isIncome ? 'sources' : 'recurring'}
          </p>
        </div>
        <div className="text-center">
          <p className="font-semibold">
            {isIncome ? workIncomeCount : oneTimeCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {isIncome ? 'work income' : 'non-recurring'}
          </p>
        </div>
      </div>

      {/* Row 3: List Items */}
      <div className="space-y-2 max-h-[180px] overflow-y-auto">
        {items.map((item) => {
          const isExpense = !isIncome && 'is_recurring' in item;
          const expense = isExpense ? (item as Expense) : null;
          
          return (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {'source' in item ? item.source : item.name}
                </span>
                {'type' in item && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {item.type}
                  </span>
                )}
                {expense && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4",
                      expense.is_recurring 
                        ? "border-muted-foreground/30 text-muted-foreground" 
                        : "border-warning/50 text-warning"
                    )}
                  >
                    {expense.is_recurring ? (
                      <><Repeat className="w-2.5 h-2.5 mr-0.5" />Recurring</>
                    ) : (
                      <><Zap className="w-2.5 h-2.5 mr-0.5" />Non-recurring</>
                    )}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{formatNativeValue(item.amount, (item as any).currency || 'USD')}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isIncome && 'source' in item && onUpdateIncome && (
                    <EditIncomeDialog income={item as Income} onUpdate={onUpdateIncome} displayUnit={displayUnit} />
                  )}
                  {isIncome && onDeleteIncome && (
                    <DeleteConfirmDialog
                      itemName={'source' in item ? item.source : item.name}
                      itemType="income"
                      onConfirm={() => onDeleteIncome(item.id)}
                    />
                  )}
                  {!isIncome && 'name' in item && onUpdateExpense && (
                    <EditExpenseDialog expense={item as Expense} onUpdate={onUpdateExpense} />
                  )}
                  {!isIncome && onDeleteExpense && (
                    <DeleteConfirmDialog
                      itemName={'name' in item ? item.name : ''}
                      itemType="expense"
                      onConfirm={() => onDeleteExpense(item.id)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
