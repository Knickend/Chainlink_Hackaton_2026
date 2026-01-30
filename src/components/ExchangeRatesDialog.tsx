import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign, Bitcoin, Gem } from 'lucide-react';
import { motion } from 'framer-motion';
import { LivePrices } from '@/hooks/useLivePrices';
import { BANKING_CURRENCIES, FOREX_RATES_TO_USD, BankingCurrency } from '@/lib/types';

interface ExchangeRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prices: LivePrices;
  lastUpdated: Date | null;
  forexTimestamp?: string;
  isLoading: boolean;
  onRefresh: () => void;
}

type RateStatus = 'live' | 'cached' | 'fallback';

function StatusBadge({ status }: { status: RateStatus }) {
  const variants = {
    live: 'bg-success/20 text-success border-success/30',
    cached: 'bg-warning/20 text-warning border-warning/30',
    fallback: 'bg-muted text-muted-foreground border-muted-foreground/30',
  };

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${variants[status]}`}>
      {status === 'live' ? 'Live' : status === 'cached' ? 'Cached' : 'Fallback'}
    </Badge>
  );
}

function formatRelativeTime(date: Date | null) {
  if (!date) return 'Never';
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatCurrency(value: number, decimals = 2): string {
  if (value >= 1000) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return value.toFixed(decimals);
}

export function ExchangeRatesDialog({
  open,
  onOpenChange,
  prices,
  lastUpdated,
  forexTimestamp,
  isLoading,
  onRefresh,
}: ExchangeRatesDialogProps) {
  const [activeTab, setActiveTab] = useState('forex');

  const forexDate = forexTimestamp ? new Date(forexTimestamp) : null;

  // Determine if forex rates are live or fallback
  const getForexStatus = (currency: string): RateStatus => {
    if (prices?.forex && prices.forex[currency] && prices.forex[currency] > 0) {
      return 'live';
    }
    return 'fallback';
  };

  // Get the forex rate (live or fallback)
  const getForexRate = (currency: BankingCurrency): number => {
    if (currency === 'USD') return 1;
    if (prices?.forex && prices.forex[currency] && prices.forex[currency] > 0) {
      return 1 / prices.forex[currency]; // Convert from USD→Currency to Currency→USD
    }
    return FOREX_RATES_TO_USD[currency];
  };

  // Crypto data - guard against undefined prices
  const cryptoAssets = prices ? [
    { name: 'Bitcoin', symbol: 'BTC', price: prices.btc ?? 0, status: 'live' as RateStatus },
    { name: 'Ethereum', symbol: 'ETH', price: prices.eth ?? 0, status: 'live' as RateStatus },
    { name: 'Chainlink', symbol: 'LINK', price: prices.link ?? 0, status: 'live' as RateStatus },
    ...(prices.crypto 
      ? Object.entries(prices.crypto)
          .map(([symbol, data]) => ({
            name: symbol,
            symbol,
            price: data.price,
            change: data.changePercent,
            status: 'live' as RateStatus,
          }))
      : []),
  ] : [];

  // Commodities data - guard against undefined prices
  const commodityAssets = prices ? [
    { name: 'Gold', symbol: 'XAU', price: prices.gold ?? 0, unit: '/oz' },
    { name: 'Silver', symbol: 'XAG', price: prices.silver ?? 0, unit: '/oz' },
    ...(prices.commodities
      ? Object.entries(prices.commodities)
          .filter(([symbol]) => !['GOLD', 'SILVER', 'XAU', 'XAG'].includes(symbol))
          .map(([symbol, data]) => ({
            name: symbol,
            symbol,
            price: data.price,
            unit: data.priceUnit || '',
            change: data.changePercent,
            status: 'live' as RateStatus,
          }))
      : []),
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Exchange Rates</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <motion.div
                animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                transition={isLoading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="forex" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Forex
            </TabsTrigger>
            <TabsTrigger value="crypto" className="gap-2">
              <Bitcoin className="w-4 h-4" />
              Crypto
            </TabsTrigger>
            <TabsTrigger value="commodities" className="gap-2">
              <Gem className="w-4 h-4" />
              Commodities
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="forex" className="mt-0 h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Rate (vs USD)</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BANKING_CURRENCIES.map((currency) => {
                    const rate = getForexRate(currency.value);
                    const status = getForexStatus(currency.value);
                    return (
                      <TableRow key={currency.value}>
                        <TableCell className="font-medium">{currency.label}</TableCell>
                        <TableCell className="text-muted-foreground">{currency.value}</TableCell>
                        <TableCell className="text-right font-mono">
                          {currency.value === 'USD' 
                            ? '1 USD = $1.00' 
                            : `1 ${currency.value} = $${formatCurrency(rate, rate < 0.01 ? 4 : 2)}`
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <StatusBadge status={status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4 px-1">
                Last updated: {formatRelativeTime(forexDate)}
              </p>
            </TabsContent>

            <TabsContent value="crypto" className="mt-0 h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cryptoAssets.map((asset) => (
                    <TableRow key={asset.symbol}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell className="text-muted-foreground">{asset.symbol}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${formatCurrency(asset.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {'change' in asset && asset.change !== undefined ? (
                          <span className={asset.change >= 0 ? 'text-success' : 'text-destructive'}>
                            {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                          </span>
                        ) : (
                          <StatusBadge status={asset.status} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4 px-1">
                Last updated: {formatRelativeTime(lastUpdated)}
              </p>
            </TabsContent>

            <TabsContent value="commodities" className="mt-0 h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commodityAssets.map((asset) => (
                    <TableRow key={asset.symbol}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell className="text-muted-foreground">{asset.symbol}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${formatCurrency(asset.price)}{asset.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge status="live" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4 px-1">
                Last updated: {formatRelativeTime(lastUpdated)}
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
