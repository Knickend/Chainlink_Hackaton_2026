import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from './DateRangePicker';
import { cn } from '@/lib/utils';

interface AnalyticsFiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const presets = [
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    label: 'Last 3 months',
    getValue: () => ({
      from: subMonths(new Date(), 3),
      to: new Date(),
    }),
  },
  {
    label: 'This month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'All time',
    getValue: () => undefined,
  },
];

export function AnalyticsFilters({
  dateRange,
  onDateRangeChange,
}: AnalyticsFiltersProps) {
  const isPresetActive = (preset: typeof presets[0]) => {
    const presetValue = preset.getValue();
    if (!presetValue && !dateRange) return true;
    if (!presetValue || !dateRange) return false;
    
    const fromMatch = presetValue.from.toDateString() === dateRange.from?.toDateString();
    const toMatch = presetValue.to.toDateString() === dateRange.to?.toDateString();
    return fromMatch && toMatch;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            onClick={() => onDateRangeChange(preset.getValue())}
            className={cn(
              'h-8 text-xs',
              isPresetActive(preset) && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />
    </div>
  );
}
