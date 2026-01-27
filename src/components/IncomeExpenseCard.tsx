import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Income, Expense } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EditIncomeDialog } from './EditIncomeDialog';
import { EditExpenseDialog } from './EditExpenseDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

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
}: IncomeExpenseCardProps) {
  const isIncome = type === 'income';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'p-2 rounded-lg',
              isIncome ? 'bg-success/20' : 'bg-danger/20'
            )}
          >
            {isIncome ? (
              <ArrowUpRight className="w-5 h-5 text-success" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-danger" />
            )}
          </div>
          <div>
            <h3 className="font-semibold capitalize">Monthly {type}</h3>
            <p className="text-xs text-muted-foreground">
              {items.length} {isIncome ? 'sources' : 'categories'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className={cn(
                'font-mono font-semibold text-xl',
                isIncome ? 'text-success' : 'text-danger'
              )}
            >
              {isIncome ? '+' : '-'}{total}
            </p>
            <p className="text-xs text-muted-foreground">per month</p>
          </div>
          {actionButton}
        </div>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 group"
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
              {'category' in item && !('source' in item) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {item.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{formatValue(item.amount)}</span>
              {isIncome && 'source' in item && onUpdateIncome && (
                <EditIncomeDialog income={item as Income} onUpdate={onUpdateIncome} />
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
        ))}
      </div>
    </motion.div>
  );
}
