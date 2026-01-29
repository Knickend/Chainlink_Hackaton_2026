import { motion } from 'framer-motion';
import { Users, UserPlus, Activity, TrendingUp } from 'lucide-react';
import { AdminAnalytics } from '@/hooks/useAdminAnalytics';
import { UserGrowthChart } from './UserGrowthChart';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminUserStatsProps {
  analytics: AdminAnalytics;
}

export function AdminUserStats({ analytics }: AdminUserStatsProps) {
  const { users, isLoading } = analytics;

  const userStats = [
    {
      label: 'Total Users',
      value: users.total,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
      description: 'All registered accounts',
    },
    {
      label: 'New Users (7d)',
      value: users.newLast7Days,
      icon: UserPlus,
      color: 'text-success',
      bg: 'bg-success/10',
      description: 'Signups in the last week',
    },
    {
      label: 'Active Users',
      value: users.activeUsers,
      icon: Activity,
      color: 'text-warning',
      bg: 'bg-warning/10',
      description: 'Updated assets in last 30 days',
    },
    {
      label: 'Activation Rate',
      value: users.total > 0 ? `${((users.activeUsers / users.total) * 100).toFixed(1)}%` : '0%',
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
      description: 'Users with portfolio activity',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Stats Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">User Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {userStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm font-medium">{stat.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* User Growth Chart */}
      <section>
        <UserGrowthChart data={users.growth} />
      </section>

      {/* Recent Activity Summary */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-3xl font-bold text-primary">{users.total}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Registered</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-success/5 border border-success/10">
              <p className="text-3xl font-bold text-success">{users.activeUsers}</p>
              <p className="text-sm text-muted-foreground mt-1">Active This Month</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-warning/5 border border-warning/10">
              <p className="text-3xl font-bold text-warning">
                {users.total - users.activeUsers}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Inactive Users</p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
