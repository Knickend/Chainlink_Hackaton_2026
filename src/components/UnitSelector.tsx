import { DisplayUnit } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UnitSelectorProps {
  value: DisplayUnit;
  onChange: (unit: DisplayUnit) => void;
}

const units: { value: DisplayUnit; label: string; icon: string }[] = [
  { value: 'USD', label: 'USD', icon: '$' },
  { value: 'BTC', label: 'BTC', icon: '₿' },
  { value: 'GOLD', label: 'Gold', icon: '🥇' },
  { value: 'EUR', label: 'EUR', icon: '€' },
  { value: 'GBP', label: 'GBP', icon: '£' },
];

export function UnitSelector({ value, onChange }: UnitSelectorProps) {
  const selectedUnit = units.find((u) => u.value === value);

  return (
    <Select value={value} onValueChange={(val) => onChange(val as DisplayUnit)}>
      <SelectTrigger 
        className="w-[90px] h-9 gap-1.5 bg-secondary/50 border-0"
        data-tutorial="unit-selector"
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span>{selectedUnit?.icon}</span>
            <span>{selectedUnit?.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {units.map((unit) => (
          <SelectItem key={unit.value} value={unit.value}>
            <span className="flex items-center gap-2">
              <span>{unit.icon}</span>
              <span>{unit.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
