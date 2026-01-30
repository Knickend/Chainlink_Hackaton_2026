import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Wifi, WifiOff, Database, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ExchangeRatesDialog } from '@/components/ExchangeRatesDialog';
import { LivePrices } from '@/hooks/useLivePrices';

interface PriceIndicatorProps {
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
  isCached?: boolean;
  forexTimestamp?: string;
  prices: LivePrices;
  onRefresh: () => void;
}

export function PriceIndicator({ isLoading, lastUpdated, error, isCached, forexTimestamp, prices, onRefresh }: PriceIndicatorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const forexDate = forexTimestamp ? new Date(forexTimestamp) : null;

  const getStatusColor = () => {
    if (error) return 'bg-destructive/20 text-destructive';
    if (isCached) return 'bg-warning/20 text-warning';
    return 'bg-success/20 text-success';
  };

  const getStatusIcon = () => {
    if (error) return <WifiOff className="w-3 h-3" />;
    if (isCached) return <Database className="w-3 h-3" />;
    return <Radio className="w-3 h-3" />;
  };

  const getStatusLabel = () => {
    if (error) return 'Offline';
    if (isCached) return 'Cached';
    return 'Live';
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setDialogOpen(true)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer hover:opacity-80',
                getStatusColor()
              )}
            >
              {getStatusIcon()}
              <span className="hidden sm:inline">{getStatusLabel()}</span>
              <span className="text-[10px] opacity-75">• {formatLastUpdated(lastUpdated)}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">
                {error ? 'Connection Error' : isCached ? 'Using Cached Prices' : 'Live Prices Active'}
              </p>
              <p className="text-xs text-muted-foreground">
                {error 
                  ? 'Unable to fetch live prices. Using last known values.'
                  : isCached 
                    ? 'Prices loaded from cache. Fetching live data...'
                    : 'Prices are updating in real-time.'
                }
              </p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Crypto/Commodities: {formatLastUpdated(lastUpdated)}
                </p>
              )}
              {forexDate && (
                <p className="text-xs text-muted-foreground">
                  Forex rates: {formatLastUpdated(forexDate)}
                </p>
              )}
              <p className="text-xs text-primary mt-2">Click to view all rates</p>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRefresh()}
              disabled={isLoading}
            >
              <motion.div
                animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                transition={isLoading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </motion.div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh prices</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <ExchangeRatesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prices={prices}
        lastUpdated={lastUpdated}
        forexTimestamp={forexTimestamp}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />
    </TooltipProvider>
  );
}
