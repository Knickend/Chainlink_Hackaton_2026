import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks, format, parseISO, subDays, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';

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

export interface UseAdminAnalyticsOptions {
  dateRange?: DateRange;
}

export function useAdminAnalytics(options: UseAdminAnalyticsOptions = {}): AdminAnalytics {
  const { dateRange } = options;
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

  // Fetch platform analytics via secure aggregate function (no individual data exposed)
  const { data: platformData, isLoading: platformLoading, error: platformError } = useQuery({
    queryKey: ['admin-platform-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_analytics');
      
      if (error) throw error;
      return data as {
        total_portfolio_value: number;
        total_tracked_debt: number;
        active_users: number;
      } | null;
    },
  });

  const isLoading = feedbackLoading || profilesLoading || platformLoading;
  const error = feedbackError || profilesError || platformError;

  // Filter data by date range if provided
  const filterByDateRange = <T extends { created_at?: string | null }>(data: T[]): T[] => {
    if (!dateRange?.from) return data;
    
    return data.filter(item => {
      if (!item.created_at) return true;
      const itemDate = parseISO(item.created_at);
      const from = dateRange.from!;
      const to = dateRange.to || new Date();
      return isWithinInterval(itemDate, { start: from, end: to });
    });
  };

  const filteredFeedback = filterByDateRange(feedbackData || []);
  const filteredProfiles = filterByDateRange(profilesData || []);

  // Process feedback analytics
  const feedback = processFeedbackAnalytics(filteredFeedback, dateRange);

  // Process user analytics (uses all profiles for total, filtered for trends)
  // Active users now comes from the secure platform analytics function
  const users = processUserAnalytics(profilesData || [], filteredProfiles, platformData?.active_users ?? 0, dateRange);

  // Process platform analytics from secure function
  const platform = {
    totalPortfolioValue: platformData?.total_portfolio_value ?? 0,
    totalTrackedDebt: platformData?.total_tracked_debt ?? 0,
  };

  return {
    feedback,
    users,
    platform,
    isLoading,
    error: error as Error | null,
  };
}

function processFeedbackAnalytics(feedback: any[], dateRange?: DateRange) {
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

function processUserAnalytics(allProfiles: any[], filteredProfiles: any[], activeUsers: number, dateRange?: DateRange) {
  const total = allProfiles.length;
  
  // New users calculation - use date range if provided, otherwise last 7 days
  const newUsers = dateRange?.from 
    ? filteredProfiles.length 
    : allProfiles.filter(p => {
        const created = parseISO(p.created_at);
        return created >= subDays(new Date(), 7);
      }).length;

  // Monthly growth (last 6 months)
  const growth = generateMonthlyGrowth(allProfiles);

  return {
    total,
    newLast7Days: newUsers,
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

