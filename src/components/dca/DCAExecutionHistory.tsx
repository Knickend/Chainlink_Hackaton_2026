import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { DCAExecution } from '@/hooks/useDCAStrategies';

interface DCAExecutionHistoryProps {
  executions: DCAExecution[];
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  pending: 'secondary',
  failed: 'destructive',
  skipped: 'outline',
};

export function DCAExecutionHistory({ executions }: DCAExecutionHistoryProps) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No executions yet. Strategies will execute automatically based on their schedule.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Pair</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions.map(ex => (
            <TableRow key={ex.id}>
              <TableCell className="text-xs">{format(new Date(ex.created_at), 'MMM d, HH:mm')}</TableCell>
              <TableCell className="font-mono text-xs">{ex.from_token}→{ex.to_token}</TableCell>
              <TableCell>${Number(ex.amount_usd).toFixed(2)}</TableCell>
              <TableCell>{ex.token_price_usd ? `$${Number(ex.token_price_usd).toFixed(2)}` : '—'}</TableCell>
              <TableCell>{ex.token_amount ? Number(ex.token_amount).toFixed(6) : '—'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs capitalize">{ex.trigger_type}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[ex.status] || 'secondary'} className="text-xs capitalize">
                  {ex.status}
                </Badge>
              </TableCell>
              <TableCell>
                {ex.tx_hash ? (
                  <a
                    href={`https://sepolia.basescan.org/tx/${ex.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
