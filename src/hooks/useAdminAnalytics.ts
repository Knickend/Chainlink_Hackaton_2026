import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks, format, parseISO, subDays } from 'date-fns';

export interface AdminAnalytics {
  feedback: {
    total: number;
    bugs: number;
    features: number;
    critical: number;
    resolutionRate: number;
    avgResponseHours: number;
    pending: number;
    resolved: number;
    declined: number;
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    trends: { week: string; bugs: number; features: number }[];
  };
  users: {
    total: number;
    newLast7Days: number;
    activeUsers: number;
    growth: { month: string; count: number }[];
  };
  platform: {
    totalPortfolioValue: number;
    totalTrackedDebt: number;
  };
  isLoading: boolean;
  error: Error | null;
}

export function useAdminAnalytics(): AdminAnalytics {
  // Fetch all feedback data
  const { data: feedbackData, isLoading: feedbackLoading, error: feedbackError } = useQuery({
    queryKey: ['admin-feedback-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user profiles
  const { data: profilesData, isLoading: profilesLoading, error: profilesError } = useQuery({
    queryKey: ['admin-profiles-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, created_at');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch assets aggregate
  const { data: assetsData, isLoading: assetsLoading, error: assetsError } = useQuery({
    queryKey: ['admin-assets-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('value, user_id, updated_at');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch debts aggregate
  const { data: debtsData, isLoading: debtsLoading, error: debtsError } = useQuery({
    queryKey: ['admin-debts-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('principal_amount');
      
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = feedbackLoading || profilesLoading || assetsLoading || debtsLoading;
  const error = feedbackError || profilesError || assetsError || debtsError;

  // Process feedback analytics
  const feedback = processFeedbackAnalytics(feedbackData || []);

  // Process user analytics
  const users = processUserAnalytics(profilesData || [], assetsData || []);

  // Process platform analytics
  const platform = processPlatformAnalytics(assetsData || [], debtsData || []);

  return {
    feedback,
    users,
    platform,
    isLoading,
    error: error as Error | null,
  };
}

function processFeedbackAnalytics(feedback: any[]) {
  const total = feedback.length;
  const bugs = feedback.filter(f => f.type === 'bug').length;
  const features = feedback.filter(f => f.type === 'feature').length;
  const critical = feedback.filter(f => f.priority === 'critical').length;
  const resolved = feedback.filter(f => f.status === 'resolved').length;
  const declined = feedback.filter(f => f.status === 'declined').length;
  const pending = feedback.filter(f => f.status === 'new' || f.status === 'in_progress').length;
  
  const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
  
  // Calculate average response time (time from created to first update)
  const responseTimes = feedback
    .filter(f => f.updated_at && f.created_at && f.updated_at !== f.created_at)
    .map(f => {
      const created = new Date(f.created_at).getTime();
      const updated = new Date(f.updated_at).getTime();
      return (updated - created) / (1000 * 60 * 60); // hours
    });
  
  const avgResponseHours = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  // Group by status
  const statusCounts: Record<string, number> = {};
  feedback.forEach(f => {
    const status = f.status || 'new';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // Group by priority (bugs only)
  const priorityCounts: Record<string, number> = {};
  feedback.filter(f => f.type === 'bug').forEach(f => {
    const priority = f.priority || 'medium';
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  });
  const byPriority = Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count }));

  // Weekly trends (last 8 weeks)
  const trends = generateWeeklyTrends(feedback);

  return {
    total,
    bugs,
    features,
    critical,
    resolutionRate,
    avgResponseHours,
    pending,
    resolved,
    declined,
    byStatus,
    byPriority,
    trends,
  };
}

function generateWeeklyTrends(feedback: any[]) {
  const weeks: { week: string; bugs: number; features: number }[] = [];
  const now = new Date();

  for (let i = 7; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });
    
    const weekLabel = format(weekStart, 'MMM d');
    
    const bugsInWeek = feedback.filter(f => {
      const created = parseISO(f.created_at);
      return f.type === 'bug' && created >= weekStart && created < weekEnd;
    }).length;
    
    const featuresInWeek = feedback.filter(f => {
      const created = parseISO(f.created_at);
      return f.type === 'feature' && created >= weekStart && created < weekEnd;
    }).length;
    
    weeks.push({ week: weekLabel, bugs: bugsInWeek, features: featuresInWeek });
  }

  return weeks;
}

function processUserAnalytics(profiles: any[], assets: any[]) {
  const total = profiles.length;
  
  const sevenDaysAgo = subDays(new Date(), 7);
  const newLast7Days = profiles.filter(p => {
    const created = parseISO(p.created_at);
    return created >= sevenDaysAgo;
  }).length;

  // Active users = users with assets updated in last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const activeUserIds = new Set(
    assets
      .filter(a => parseISO(a.updated_at) >= thirtyDaysAgo)
      .map(a => a.user_id)
  );
  const activeUsers = activeUserIds.size;

  // Monthly growth (last 6 months)
  const growth = generateMonthlyGrowth(profiles);

  return {
    total,
    newLast7Days,
    activeUsers,
    growth,
  };
}

function generateMonthlyGrowth(profiles: any[]) {
  const months: { month: string; count: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = format(monthDate, 'MMM yyyy');
    
    // Cumulative count up to end of this month
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const count = profiles.filter(p => {
      const created = parseISO(p.created_at);
      return created <= monthEnd;
    }).length;
    
    months.push({ month: monthLabel, count });
  }

  return months;
}

function processPlatformAnalytics(assets: any[], debts: any[]) {
  const totalPortfolioValue = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  const totalTrackedDebt = debts.reduce((sum, d) => sum + (Number(d.principal_amount) || 0), 0);

  return {
    totalPortfolioValue,
    totalTrackedDebt,
  };
}
