import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Repeat, Zap } from 'lucide-react';
import { Income, Expense, DisplayUnit } from '@/lib/types';
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
  secondaryActionButton?: ReactNode;
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
  secondaryActionButton,
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
            <h3 className="font-semibold capitalize">{isIncome ? 'Monthly Income' : 'Expenses'}</h3>
            <p className="text-xs text-muted-foreground">
              {isIncome 
                ? `${items.length} sources`
                : `${recurringCount} monthly${oneTimeCount > 0 ? `, ${oneTimeCount} one-time` : ''}`
              }
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
            <p className="text-xs text-muted-foreground">
              {isIncome ? 'per month' : 'total this period'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {actionButton}
            {secondaryActionButton}
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {items.map((item) => {
          const isExpense = !isIncome && 'is_recurring' in item;
          const expense = isExpense ? (item as Expense) : null;
          
          return (
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
                      <><Repeat className="w-2.5 h-2.5 mr-0.5" />Monthly</>
                    ) : (
                      <><Zap className="w-2.5 h-2.5 mr-0.5" />One-time</>
                    )}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{formatValue(item.amount)}</span>
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
                  <EditExpenseDialog expense={item as Expense} onUpdate={onUpdateExpense} displayUnit={displayUnit} />
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
          );
        })}
      </div>
    </motion.div>
  );
}
