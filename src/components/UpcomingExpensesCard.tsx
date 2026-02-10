import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Expense, isBitcoinCurrency, getBitcoinCurrencySymbol, BitcoinCurrency } from '@/lib/types';
import { EditExpenseDialog } from './EditExpenseDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Badge } from '@/components/ui/badge';

interface UpcomingExpensesCardProps {
  expenses: Expense[];
  onUpdateExpense?: (id: string, data: Partial<Omit<Expense, 'id'>>) => void;
  onDeleteExpense?: (id: string) => void;
}

const currencySymbols: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CHF: 'CHF ', JPY: '¥',
  CAD: 'C$', AUD: 'A$', CNY: '¥', INR: '₹', SEK: 'kr ',
  NOK: 'kr ', DKK: 'kr ', PLN: 'zł ', CZK: 'Kč ', HUF: 'Ft ',
  RON: 'lei ', BGN: 'лв ', HRK: 'kn ', RUB: '₽', TRY: '₺',
};

function formatNative(amount: number, currency: string): string {
  if (isBitcoinCurrency(currency)) {
    const symbol = getBitcoinCurrencySymbol(currency as BitcoinCurrency);
    return currency === 'BTC'
      ? `${symbol}${amount.toFixed(8)}`
      : `${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
  }
  const symbol = currencySymbols[currency] || '$';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function UpcomingExpensesCard({ expenses, onUpdateExpense, onDeleteExpense }: UpcomingExpensesCardProps) {
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(() => {
    return expenses
      .filter(exp => !exp.is_recurring && exp.expense_date && exp.expense_date > today)
      .sort((a, b) => (a.expense_date || '').localeCompare(b.expense_date || ''));
  }, [expenses, today]);

  if (upcoming.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="glass-card rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/10">
          <CalendarClock className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="font-semibold">Upcoming Expenses</h3>
          <p className="text-xs text-muted-foreground">
            {upcoming.length} planned expense{upcoming.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {upcoming.map((exp) => (
          <div
            key={exp.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm truncate">{exp.name}</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 whitespace-nowrap flex-shrink-0 border-warning/50 text-warning"
              >
                <CalendarDays className="w-2.5 h-2.5 mr-0.5" />
                {format(parseISO(exp.expense_date!), 'MMM d')}
              </Badge>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground flex-shrink-0">
                {exp.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-warning">
                -{formatNative(exp.amount, exp.currency || 'USD')}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onUpdateExpense && (
                  <EditExpenseDialog expense={exp} onUpdate={onUpdateExpense} />
                )}
                {onDeleteExpense && (
                  <DeleteConfirmDialog
                    itemName={exp.name}
                    itemType="expense"
                    onConfirm={() => onDeleteExpense(exp.id)}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
