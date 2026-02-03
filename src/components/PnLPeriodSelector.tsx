import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, subYears } from 'date-fns';
import { cn } from '@/lib/utils';

export type PeriodPreset = 'this-month' | 'last-month' | 'ytd' | '1y' | 'all' | 'custom';

export interface PeriodRange {
  start: Date | null;
  end: Date | null;
  label: string;
  preset: PeriodPreset;
}

interface PnLPeriodSelectorProps {
  value: PeriodRange;
  onChange: (range: PeriodRange) => void;
  className?: string;
}

export function getPeriodDates(preset: PeriodPreset): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (preset) {
    case 'this-month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last-month':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'ytd':
      return { start: startOfYear(now), end: now };
    case '1y':
      return { start: subYears(now, 1), end: now };
    case 'all':
      return { start: null, end: null };
    default:
      return { start: null, end: null };
  }
}

export function getDefaultPeriod(): PeriodRange {
  const dates = getPeriodDates('this-month');
  return {
    ...dates,
    label: 'This Month',
    preset: 'this-month',
  };
}

const PRESETS: { preset: PeriodPreset; label: string }[] = [
  { preset: 'this-month', label: 'This Month' },
  { preset: 'last-month', label: 'Last Month' },
  { preset: 'ytd', label: 'YTD' },
  { preset: '1y', label: '1Y' },
  { preset: 'all', label: 'All' },
];

export function PnLPeriodSelector({ value, onChange, className }: PnLPeriodSelectorProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(
    value.preset === 'custom' && value.start ? value.start : undefined
  );
  const [customEnd, setCustomEnd] = useState<Date | undefined>(
    value.preset === 'custom' && value.end ? value.end : undefined
  );

  const handlePresetClick = (preset: PeriodPreset) => {
    const dates = getPeriodDates(preset);
    const presetConfig = PRESETS.find(p => p.preset === preset);
    onChange({
      ...dates,
      label: presetConfig?.label || preset,
      preset,
    });
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        start: customStart,
        end: customEnd,
        label: `${format(customStart, 'MMM d')} - ${format(customEnd, 'MMM d, yyyy')}`,
        preset: 'custom',
      });
      setCustomOpen(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {PRESETS.map(({ preset, label }) => (
        <Button
          key={preset}
          variant={value.preset === preset ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handlePresetClick(preset)}
        >
          {label}
        </Button>
      ))}

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.preset === 'custom' ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
          >
            <CalendarIcon className="h-3 w-3" />
            {value.preset === 'custom' ? value.label : 'Custom'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Start Date</p>
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                className="pointer-events-auto"
                disabled={(date) => customEnd ? date > customEnd : false}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">End Date</p>
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                className="pointer-events-auto"
                disabled={(date) => customStart ? date < customStart : false}
              />
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
