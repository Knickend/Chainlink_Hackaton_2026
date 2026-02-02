import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  delay?: number;
}

const variantStyles = {
  default: 'border-border/50',
  primary: 'border-primary/30 gold-glow',
  success: 'border-success/30',
  warning: 'border-bitcoin/30',
  danger: 'border-destructive/30',
};

const iconVariantStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'bg-primary/20 text-primary',
  success: 'bg-success/20 text-success',
  warning: 'bg-bitcoin/20 text-bitcoin',
  danger: 'bg-destructive/20 text-destructive',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn('glass-card p-6 h-full flex flex-col', variantStyles[variant])}
    >
      <div className="flex items-start justify-between mb-4 min-h-[40px]">
        <div className={cn('p-2.5 rounded-xl', iconVariantStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-[60px] text-right">
          {trend && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center justify-end gap-1 text-sm font-medium cursor-pointer',
                      trend.isPositive ? 'text-success' : 'text-danger'
                    )}
                  >
                    <span>{trend.isPositive ? '↑' : '↓'}</span>
                    <span>{Math.abs(trend.value).toFixed(1)}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Change vs last month</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <div className="flex-1">
        <p className="stat-label mb-1">{title}</p>
        <p className="stat-value gradient-text">{value}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-2 min-h-[20px]">{subtitle || '\u00A0'}</p>
    </motion.div>
  );
}
