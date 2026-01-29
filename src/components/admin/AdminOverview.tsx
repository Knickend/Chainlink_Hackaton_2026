import { motion } from 'framer-motion';
import {
  Bug,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Clock,
  Hourglass,
  CheckCircle,
  XCircle,
  Users,
  UserPlus,
  Activity,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { AdminAnalytics } from '@/hooks/useAdminAnalytics';
import { FeedbackTrendChart } from './FeedbackTrendChart';
import { StatusDistributionChart } from './StatusDistributionChart';
import { PriorityBreakdownChart } from './PriorityBreakdownChart';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminOverviewProps {
  analytics: AdminAnalytics;
}

export function AdminOverview({ analytics }: AdminOverviewProps) {
  const { feedback, users, platform, isLoading } = analytics;

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  const feedbackStats = [
    {
      label: 'Total Bugs',
      value: feedback.bugs,
      icon: Bug,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Feature Requests',
      value: feedback.features,
      icon: Lightbulb,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Critical Issues',
      value: feedback.critical,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Resolution Rate',
      value: `${feedback.resolutionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Avg Response',
      value: formatHours(feedback.avgResponseHours),
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Pending',
      value: feedback.pending,
      icon: Hourglass,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Resolved',
      value: feedback.resolved,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Declined',
      value: feedback.declined,
      icon: XCircle,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  ];

  const userStats = [
    {
      label: 'Total Users',
      value: users.total,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'New (7 days)',
      value: users.newLast7Days,
      icon: UserPlus,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Active Users',
      value: users.activeUsers,
      icon: Activity,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  const platformStats = [
    {
      label: 'Total Portfolio Value',
      value: formatCurrency(platform.totalPortfolioValue),
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Total Tracked Debt',
      value: formatCurrency(platform.totalTrackedDebt),
      icon: CreditCard,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[350px] lg:col-span-2 rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Feedback Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Feedback Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {feedbackStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Charts Row */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FeedbackTrendChart data={feedback.trends} />
          </div>
          <StatusDistributionChart data={feedback.byStatus} />
        </div>
      </section>

      {/* Priority Chart */}
      {feedback.byPriority.length > 0 && (
        <section>
          <div className="max-w-md">
            <PriorityBreakdownChart data={feedback.byPriority} />
          </div>
        </section>
      )}

      {/* User & Platform Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4">User & Platform Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...userStats, ...platformStats].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="glass-card rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
