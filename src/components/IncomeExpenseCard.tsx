import { ReactNode, useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Repeat, Zap, CalendarDays, CalendarClock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Income, Expense, DisplayUnit, isBitcoinCurrency, getBitcoinCurrencySymbol, BitcoinCurrency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EditIncomeDialog } from './EditIncomeDialog';
import { EditExpenseDialog } from './EditExpenseDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Badge } from '@/components/ui/badge';

type ExpenseFilter = 'all' | 'recurring' | 'one-time' | 'upcoming';

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
  allExpenses?: Expense[];
}

const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CHF: 'CHF ', JPY: '¥',
  CAD: 'C$', AUD: 'A$', CNY: '¥', INR: '₹', SEK: 'kr ',
  NOK: 'kr ', DKK: 'kr ', PLN: 'zł ', CZK: 'Kč ', HUF: 'Ft ',
  RON: 'lei ', BGN: 'лв ', HRK: 'kn ', RUB: '₽', TRY: '₺',
};

function formatNativeValue(amount: number, itemCurrency: string): string {
  if (isBitcoinCurrency(itemCurrency)) {
    const symbol = getBitcoinCurrencySymbol(itemCurrency as BitcoinCurrency);
    if (itemCurrency === 'BTC') return `${symbol}${amount.toFixed(8)}`;
    return `${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
  }
  const symbol = currencySymbols[itemCurrency] || '$';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  allExpenses,
}: IncomeExpenseCardProps) {
  const isIncome = type === 'income';
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>('all');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute upcoming expenses from allExpenses prop
  const upcomingExpenses = useMemo(() => {
    if (isIncome || !allExpenses) return [];
    return allExpenses
      .filter(e => !e.is_recurring && e.expense_date && e.expense_date > today)
      .sort((a, b) => (a.expense_date || '').localeCompare(b.expense_date || ''));
  }, [isIncome, allExpenses, today]);

  // Filter items for expense card
  const filteredItems = useMemo(() => {
    if (isIncome) return items;
    const expItems = items as Expense[];
    switch (expenseFilter) {
      case 'recurring': return expItems.filter(e => e.is_recurring);
      case 'one-time': return expItems.filter(e => !e.is_recurring);
      case 'upcoming': return upcomingExpenses;
      default: return expItems;
    }
  }, [isIncome, items, expenseFilter, upcomingExpenses]);

  // Counts for stats and tabs
  const expenseItems = !isIncome ? (items as Expense[]) : [];
  const recurringExpenseCount = expenseItems.filter(e => e.is_recurring).length;
  const oneTimeExpenseCount = expenseItems.filter(e => !e.is_recurring).length;
  const incomeItems = isIncome ? (items as Income[]) : [];
  const recurringIncomeCount = incomeItems.filter(i => i.is_recurring).length;
  const oneTimeIncomeCount = incomeItems.filter(i => !i.is_recurring).length;

  const filterTabs: { key: ExpenseFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: expenseItems.length },
    { key: 'recurring', label: 'Recurring', count: recurringExpenseCount },
    { key: 'one-time', label: 'One-time', count: oneTimeExpenseCount },
    { key: 'upcoming', label: 'Upcoming', count: upcomingExpenses.length },
  ];

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
      <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/30 rounded-lg mb-3">
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
            {isIncome ? recurringIncomeCount : recurringExpenseCount}
          </p>
          <p className="text-xs text-muted-foreground">recurring</p>
        </div>
        <div className="text-center">
          <p className="font-semibold">
            {isIncome ? oneTimeIncomeCount : oneTimeExpenseCount}
          </p>
          <p className="text-xs text-muted-foreground">non-recurring</p>
        </div>
      </div>

      {/* Filter Tabs (expense only) */}
      {!isIncome && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setExpenseFilter(tab.key)}
              className={cn(
                'text-[11px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1',
                expenseFilter === tab.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary/30 text-muted-foreground border-border/50 hover:bg-secondary/50'
              )}
            >
              {tab.key === 'upcoming' && <CalendarClock className="w-3 h-3" />}
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'text-[10px] font-mono',
                  expenseFilter === tab.key ? 'text-primary-foreground/80' : 'text-muted-foreground/70'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Row 3: List Items */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto">
        {filteredItems.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            {expenseFilter === 'upcoming' ? 'No upcoming expenses planned' : 'No expenses in this category'}
          </p>
        )}
        {filteredItems.map((item) => {
          const isExpenseItem = !isIncome && 'is_recurring' in item;
          const expense = isExpenseItem ? (item as Expense) : null;
          const isIncomeItem = isIncome && 'is_recurring' in item;
          const incomeItem = isIncomeItem ? (item as Income) : null;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">
                  {'source' in item ? item.source : item.name}
                </span>
                {'type' in item && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground flex-shrink-0">
                    {item.type}
                  </span>
                )}
                {incomeItem && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 whitespace-nowrap flex-shrink-0",
                      incomeItem.is_recurring
                        ? "border-muted-foreground/30 text-muted-foreground"
                        : "border-primary/50 text-primary"
                    )}
                  >
                    {incomeItem.is_recurring ? (
                      <><Repeat className="w-2.5 h-2.5 mr-0.5" />Recurring</>
                    ) : (
                      <><Zap className="w-2.5 h-2.5 mr-0.5" />Non-recurring</>
                    )}
                  </Badge>
                )}
                {expense && expenseFilter === 'all' && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 whitespace-nowrap flex-shrink-0",
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
                {expense && expense.expense_date && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <CalendarDays className="w-2.5 h-2.5" />
                    {format(parseISO(expense.expense_date), 'MMM d')}
                  </span>
                )}
                <span className={cn(
                  "font-mono text-sm",
                  expenseFilter === 'upcoming' && "text-warning"
                )}>
                  {expenseFilter === 'upcoming' && '-'}
                  {formatNativeValue(item.amount, (item as any).currency || 'USD')}
                </span>
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
