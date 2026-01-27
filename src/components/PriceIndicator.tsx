import { motion } from 'framer-motion';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PriceIndicatorProps {
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
  onRefresh: () => void;
}

export function PriceIndicator({ isLoading, lastUpdated, error, onRefresh }: PriceIndicatorProps) {
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
              error ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'
            )}>
              {error ? (
                <WifiOff className="w-3 h-3" />
              ) : (
                <Wifi className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{formatLastUpdated()}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Live prices: {error ? 'Offline' : 'Connected'}</p>
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
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
    </TooltipProvider>
  );
}
