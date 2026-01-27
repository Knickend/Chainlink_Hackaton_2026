import { motion } from 'framer-motion';
import { DisplayUnit } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
      {units.map((unit) => (
        <button
          key={unit.value}
          onClick={() => onChange(unit.value)}
          className={cn(
            'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            value === unit.value
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {value === unit.value && (
            <motion.div
              layoutId="unit-selector-bg"
              className="absolute inset-0 bg-primary rounded-md"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
            <span>{unit.icon}</span>
            <span className="hidden sm:inline">{unit.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
