import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CronJobLog {
  id: string;
  job_name: string;
  execution_time: string;
  status: 'success' | 'partial' | 'failed';
  processed_count: number;
  succeeded_count: number;
  failed_count: number;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export function useCronJobLogs(limit = 50) {
  return useQuery({
    queryKey: ['cron-job-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .order('execution_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as CronJobLog[];
    },
  });
}
