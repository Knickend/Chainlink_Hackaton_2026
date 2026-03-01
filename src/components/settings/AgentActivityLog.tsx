import { format } from 'date-fns';
import { Activity, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LogEntry {
  id: string;
  action_type: string;
  status: string;
  params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  created_at: string;
}

interface AgentActivityLogProps {
  logs: LogEntry[];
}

export function AgentActivityLog({ logs }: AgentActivityLogProps) {
  if (logs.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Log
        </CardTitle>
        <CardDescription>Recent agent actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm">
              <div className="flex items-center gap-3">
                {log.status === 'executed' ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : log.status === 'failed' ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium capitalize">{log.action_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.params?.amount && `$${log.params.amount}`}
                    {log.params?.recipient && ` → ${log.params.recipient}`}
                    {log.params?.from_token && log.params?.to_token && ` ${log.params.from_token} → ${log.params.to_token}`}
                  </p>
                  {log.result && (() => {
                    const result = log.result as Record<string, unknown>;
                    const hashFields = ['tx_hash', 'wrap_tx', 'approve_tx', 'deposit_tx', 'transfer_tx', 'transaction_id'];
                    const hashes = hashFields
                      .filter(f => result[f] && typeof result[f] === 'string')
                      .map(f => ({ label: f.replace(/_/g, ' '), hash: result[f] as string }));
                    if (hashes.length === 0) return null;
                    const explorerBase = log.action_type.includes('privacy')
                      ? 'https://sepolia.etherscan.io/tx/'
                      : 'https://basescan.org/tx/';
                    return (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {hashes.map(({ label, hash }) => (
                          <a
                            key={hash}
                            href={`${explorerBase}${hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <span className="capitalize">{label}:</span>
                            <span className="font-mono">{hash.slice(0, 6)}…{hash.slice(-4)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), 'MMM d, HH:mm')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
