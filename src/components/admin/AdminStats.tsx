import { Feedback } from '@/lib/feedback.types';
import { Bug, Lightbulb, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminStatsProps {
  feedback: Feedback[];
}

export function AdminStats({ feedback }: AdminStatsProps) {
  const totalBugs = feedback.filter((f) => f.type === 'bug').length;
  const totalFeatures = feedback.filter((f) => f.type === 'feature').length;
  const pending = feedback.filter((f) => f.status === 'new' || f.status === 'in_progress').length;
  const resolved = feedback.filter((f) => f.status === 'resolved').length;

  const stats = [
    {
      label: 'Total Bugs',
      value: totalBugs,
      icon: Bug,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Feature Requests',
      value: totalFeatures,
      icon: Lightbulb,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Pending',
      value: pending,
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Resolved',
      value: resolved,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
