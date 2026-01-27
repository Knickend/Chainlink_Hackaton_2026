import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTickerSearch, TickerResult } from '@/hooks/useTickerSearch';
import { useDebouncedCallback } from '@/hooks/useDebounce';

interface TickerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (ticker: TickerResult) => void;
  placeholder?: string;
  className?: string;
}

export function TickerSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Search stocks & ETFs...',
  className,
}: TickerSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const { results, isLoading, search, clearResults } = useTickerSearch();

  const debouncedSearch = useDebouncedCallback((query: string) => {
    search(query);
  }, 300);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    if (newValue.length >= 1) {
      setIsOpen(true);
      debouncedSearch(newValue);
    } else {
      setIsOpen(false);
      clearResults();
    }
  };

  const handleSelect = (ticker: TickerResult) => {
    setInputValue(ticker.symbol);
    onChange(ticker.symbol);
    onSelect(ticker);
    setIsOpen(false);
    clearResults();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9 bg-secondary/50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {results.map((ticker) => (
              <li
                key={ticker.symbol}
                onClick={() => handleSelect(ticker)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{ticker.symbol}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {ticker.type}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {ticker.name}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  {ticker.price !== undefined && (
                    <span className="font-mono text-sm">
                      ${ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {ticker.changePercent !== undefined && (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs font-mono',
                        ticker.changePercent >= 0 ? 'text-success' : 'text-destructive'
                      )}
                    >
                      {ticker.changePercent >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {ticker.changePercent >= 0 ? '+' : ''}
                      {ticker.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
