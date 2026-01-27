import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Income, Expense } from '@/lib/types';
import { cn } from '@/lib/utils';

interface IncomeExpenseCardProps {
  type: 'income' | 'expense';
  items: Income[] | Expense[];
  total: string;
  formatValue: (value: number) => string;
}

export function IncomeExpenseCard({
  type,
  items,
  total,
  formatValue,
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
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30"
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
              {'category' in item && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {item.category}
                </span>
              )}
            </div>
            <span className="font-mono text-sm">{formatValue(item.amount)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
