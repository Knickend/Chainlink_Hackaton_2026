import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, History } from 'lucide-react';
import type { DCAExecution } from '@/hooks/useDCAStrategies';

interface DCAExecutionHistoryProps {
  executions: DCAExecution[];
}

export function DCAExecutionHistory({ executions }: DCAExecutionHistoryProps) {
  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Execution History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No executions yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tx</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map(exec => (
                <TableRow key={exec.id}>
                  <TableCell className="text-xs">
                    {new Date(exec.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {exec.from_token} → {exec.to_token}
                  </TableCell>
                  <TableCell className="text-xs">${exec.amount_usd}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{exec.trigger_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColor(exec.status)} className="text-xs capitalize">
                      {exec.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {exec.tx_hash ? (
                      <a
                        href={`https://basescan.org/tx/${exec.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {exec.tx_hash.slice(0, 8)}…
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
