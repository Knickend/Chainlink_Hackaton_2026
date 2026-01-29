import { Feedback } from '@/lib/feedback.types';
import { Bug, Lightbulb, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface FeedbackTableProps {
  feedback: Feedback[];
  onSelect: (item: Feedback) => void;
  isLoading?: boolean;
}

const statusConfig = {
  new: { label: 'New', icon: AlertCircle, variant: 'default' as const },
  in_progress: { label: 'In Progress', icon: Clock, variant: 'secondary' as const },
  resolved: { label: 'Resolved', icon: CheckCircle, variant: 'outline' as const },
  declined: { label: 'Declined', icon: XCircle, variant: 'destructive' as const },
};

const priorityConfig = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-primary/20 text-primary' },
  high: { label: 'High', className: 'bg-warning/20 text-warning' },
  critical: { label: 'Critical', className: 'bg-destructive/20 text-destructive' },
};

export function FeedbackTable({ feedback, onSelect, isLoading }: FeedbackTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
        <p>No feedback submissions yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[100px]">Priority</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[150px]">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feedback.map((item) => {
            const status = statusConfig[item.status];
            const priority = priorityConfig[item.priority];
            const StatusIcon = status.icon;

            return (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelect(item)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.type === 'bug' ? (
                      <Bug className="w-4 h-4 text-destructive" />
                    ) : (
                      <Lightbulb className="w-4 h-4 text-warning" />
                    )}
                    <span className="capitalize">{item.type}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-[300px] truncate">
                  {item.title}
                </TableCell>
                <TableCell>
                  {item.type === 'bug' && (
                    <Badge variant="outline" className={priority.className}>
                      {priority.label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className="gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(item.created_at), 'MMM d, yyyy')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
