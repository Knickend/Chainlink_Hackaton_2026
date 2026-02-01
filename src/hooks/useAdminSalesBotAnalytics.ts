import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface SalesBotAnalytics {
  totalConversations: number;
  totalMessages: number;
  uniqueVisitors: number;
  ctaClicks: {
    signup: number;
    demo: number;
    total: number;
  };
  conversationsByDay: Array<{ date: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  isLoading: boolean;
  error: Error | null;
}

interface SalesBotInteraction {
  id: string;
  session_id: string;
  event_type: string;
  visitor_ip_hash: string | null;
  message_role: string | null;
  cta_type: string | null;
  created_at: string;
}

export function useAdminSalesBotAnalytics(options?: { dateRange?: DateRange }): SalesBotAnalytics {
  const { dateRange } = options || {};
  
  // Default to last 30 days if no range specified
  const startDate = dateRange?.from || subDays(new Date(), 30);
  const endDate = dateRange?.to || new Date();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sales-bot-analytics', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data: interactions, error } = await supabase
        .from('sales_bot_interactions')
        .select('*')
        .gte('created_at', startOfDay(startDate).toISOString())
        .lte('created_at', endOfDay(endDate).toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return interactions as SalesBotInteraction[];
    },
  });

  // Calculate metrics from raw data
  const interactions = data || [];

  // Unique sessions = unique conversations
  const uniqueSessions = new Set(interactions.map(i => i.session_id));
  const totalConversations = uniqueSessions.size;

  // Count messages (both user and assistant)
  const totalMessages = interactions.filter(i => i.event_type === 'message').length;

  // Unique visitors (by IP hash)
  const uniqueVisitorHashes = new Set(
    interactions.filter(i => i.visitor_ip_hash).map(i => i.visitor_ip_hash)
  );
  const uniqueVisitors = uniqueVisitorHashes.size;

  // CTA clicks
  const ctaInteractions = interactions.filter(i => i.event_type === 'cta_click');
  const signupClicks = ctaInteractions.filter(i => i.cta_type === 'signup').length;
  const demoClicks = ctaInteractions.filter(i => i.cta_type === 'demo').length;

  // Group conversations by day
  const conversationsByDayMap = new Map<string, Set<string>>();
  interactions.forEach(i => {
    const day = format(new Date(i.created_at), 'yyyy-MM-dd');
    if (!conversationsByDayMap.has(day)) {
      conversationsByDayMap.set(day, new Set());
    }
    conversationsByDayMap.get(day)!.add(i.session_id);
  });
  
  const conversationsByDay = Array.from(conversationsByDayMap.entries())
    .map(([date, sessions]) => ({ date, count: sessions.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Hourly distribution (0-23)
  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
  
  interactions.forEach(i => {
    const hour = new Date(i.created_at).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  });
  
  const hourlyDistribution = Array.from(hourlyMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  return {
    totalConversations,
    totalMessages,
    uniqueVisitors,
    ctaClicks: {
      signup: signupClicks,
      demo: demoClicks,
      total: signupClicks + demoClicks,
    },
    conversationsByDay,
    hourlyDistribution,
    isLoading,
    error: error as Error | null,
  };
}
