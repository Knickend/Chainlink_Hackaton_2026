import { FeedbackType, FeedbackStatus } from '@/lib/feedback.types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface FeedbackFiltersProps {
  type: FeedbackType | 'all';
  status: FeedbackStatus | 'all';
  onTypeChange: (type: FeedbackType | 'all') => void;
  onStatusChange: (status: FeedbackStatus | 'all') => void;
  onClear: () => void;
}

export function FeedbackFilters({
  type,
  status,
  onTypeChange,
  onStatusChange,
  onClear,
}: FeedbackFiltersProps) {
  const hasFilters = type !== 'all' || status !== 'all';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={type} onValueChange={(v) => onTypeChange(v as FeedbackType | 'all')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="bug">Bugs</SelectItem>
          <SelectItem value="feature">Features</SelectItem>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => onStatusChange(v as FeedbackStatus | 'all')}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="declined">Declined</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
          <X className="w-4 h-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
