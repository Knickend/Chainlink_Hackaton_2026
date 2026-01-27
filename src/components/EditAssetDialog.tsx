import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Asset, AssetCategory, BANKING_CURRENCIES, BankingCurrency, FOREX_RATES_TO_USD, getCurrencySymbol } from '@/lib/types';
import { LivePrices } from '@/hooks/useLivePrices';
import { TickerSearchInput } from './TickerSearchInput';
import { TickerResult } from '@/hooks/useTickerSearch';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['banking', 'crypto', 'stocks', 'metals'] as const),
  value: z.number().min(0, 'Value must be positive'),
  quantity: z.number().optional(),
  symbol: z.string().optional(),
  yield: z.number().min(0).max(100).optional(),
  currency: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface EditAssetDialogProps {
  asset: Asset;
  onUpdate: (id: string, data: Partial<Omit<Asset, 'id'>>) => void;
  livePrices?: LivePrices;
  onCryptoPriceUpdate?: (symbol: string, price: number, change: number, changePercent: number) => void;
}

const categories: { value: AssetCategory; label: string }[] = [
  { value: 'banking', label: 'Banking' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'metals', label: 'Precious Metals' },
];

const metalSymbols = ['GOLD', 'SILVER'];

function getSymbolPrice(symbol: string | undefined, prices?: LivePrices): number | null {
  if (!symbol || !prices) return null;
  const upperSymbol = symbol.toUpperCase();
  switch (upperSymbol) {
    case 'GOLD': return prices.gold;
    case 'SILVER': return prices.silver;
    default:
      // Stock/ETF/Crypto prices cached in the LivePrices hook
      return prices.stocks?.[upperSymbol]?.price ?? null;
  }
}

export function EditAssetDialog({ asset, onUpdate, livePrices, onCryptoPriceUpdate }: EditAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<TickerResult | null>(null);
  
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: asset.name,
      category: asset.category,
      value: asset.category === 'banking' && asset.quantity ? asset.quantity : asset.value,
      quantity: asset.quantity,
      symbol: asset.symbol,
      yield: asset.yield,
      currency: asset.category === 'banking' ? (asset.symbol || 'USD') : undefined,
    },
  });

  const selectedCategory = form.watch('category');
  const selectedSymbol = form.watch('symbol');
  const quantity = form.watch('quantity');
  const selectedCurrency = form.watch('currency') || 'USD';
  const bankingAmount = form.watch('value');
  
  const currentPrice = getSymbolPrice(selectedSymbol, livePrices);
  const isMarketPricedCategory = selectedCategory === 'crypto' || selectedCategory === 'metals' || selectedCategory === 'stocks';
  const isPriceAvailable = currentPrice !== null && isMarketPricedCategory;
  const isCryptoTickerPriceAvailable = selectedCategory === 'crypto' && typeof selectedTicker?.price === 'number';

  useEffect(() => {
    if (open) {
      form.reset({
        name: asset.name,
        category: asset.category,
        value: asset.category === 'banking' && asset.quantity ? asset.quantity : asset.value,
        quantity: asset.quantity,
        symbol: asset.symbol,
        yield: asset.yield,
        currency: asset.category === 'banking' ? (asset.symbol || 'USD') : undefined,
      });
      setSelectedTicker(null);
    }
  }, [open, asset, form]);

  // Auto-calculate value when quantity and price are available
  useEffect(() => {
    if (isPriceAvailable && typeof quantity === 'number' && typeof currentPrice === 'number') {
      form.setValue('value', quantity * currentPrice);
    }
  }, [quantity, currentPrice, isPriceAvailable, form]);

  // Auto-calculate value for crypto ticker
  useEffect(() => {
    if (isCryptoTickerPriceAvailable && typeof quantity === 'number' && typeof selectedTicker?.price === 'number') {
      form.setValue('value', quantity * selectedTicker.price);
    }
  }, [quantity, selectedTicker, isCryptoTickerPriceAvailable, form]);

  const handleTickerSelect = (ticker: TickerResult) => {
    setSelectedTicker(ticker);
    form.setValue('symbol', ticker.symbol);
    form.setValue('name', ticker.name);
    
    if (ticker.price && onCryptoPriceUpdate) {
      onCryptoPriceUpdate(ticker.symbol, ticker.price, ticker.change || 0, ticker.changePercent || 0);
    }
    
    const currentQuantity = form.getValues('quantity');
    if (typeof ticker.price === 'number' && typeof currentQuantity === 'number') {
      form.setValue('value', currentQuantity * ticker.price);
    }
  };

  const onSubmit = (data: AssetFormData) => {
    // For banking, handle forex conversion
    if (data.category === 'banking' && data.currency) {
      const forexRate = FOREX_RATES_TO_USD[data.currency as BankingCurrency] || 1;
      const usdValue = data.value * forexRate;
      onUpdate(asset.id, {
        ...data,
        symbol: data.currency,
        quantity: data.value,
        value: usdValue,
      });
      setOpen(false);
      setSelectedTicker(null);
      return;
    }
    
    // Determine best price source for other categories
    let priceForComputation: number | null = null;
    if (selectedCategory === 'crypto' && selectedTicker?.price) {
      priceForComputation = selectedTicker.price;
    } else {
      priceForComputation = getSymbolPrice(data.symbol, livePrices);
    }
    
    const computedValue = (
      isMarketPricedCategory &&
      typeof data.quantity === 'number' &&
      typeof priceForComputation === 'number'
    )
      ? (data.quantity * priceForComputation)
      : data.value;

    onUpdate(asset.id, {
      ...data,
      value: computedValue,
    });
    setOpen(false);
    setSelectedTicker(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bitcoin Holdings" {...field} className="bg-secondary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === 'crypto' && (
              <>
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Cryptocurrency</FormLabel>
                      <FormControl>
                        <TickerSearchInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          onSelect={handleTickerSelect}
                          placeholder="Search by name or symbol (BTC, ETH...)"
                          assetType="crypto"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="0.5"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          className="bg-secondary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(isCryptoTickerPriceAvailable || isPriceAvailable) && (
                  <div className="space-y-2 p-3 rounded-lg bg-secondary/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price</span>
                      <span className="font-mono text-success">
                        ${(selectedTicker?.price ?? currentPrice)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedTicker?.changePercent !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">24h Change</span>
                        <span className={`font-mono ${selectedTicker.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {selectedTicker.changePercent >= 0 ? '+' : ''}{selectedTicker.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-mono font-semibold">
                        ${((quantity || 0) * (selectedTicker?.price ?? currentPrice ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedCategory === 'metals' && (
              <>
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metal</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary/50">
                            <SelectValue placeholder="Select metal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {metalSymbols.map((sym) => (
                            <SelectItem key={sym} value={sym}>
                              {sym} {livePrices && `($${getSymbolPrice(sym, livePrices)?.toLocaleString()}/oz)`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity (oz)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="10"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          className="bg-secondary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isPriceAvailable && (
                  <div className="space-y-2 p-3 rounded-lg bg-secondary/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price</span>
                      <span className="font-mono text-success">
                        ${currentPrice?.toLocaleString()}/oz
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-mono font-semibold">
                        ${((quantity || 0) * (currentPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedCategory === 'banking' && (
              <>
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'USD'}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary/50">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60 bg-popover">
                          {BANKING_CURRENCIES.map((curr) => (
                            <SelectItem key={curr.value} value={curr.value}>
                              {curr.symbol} {curr.value} - {curr.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ({getCurrencySymbol(selectedCurrency)})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="bg-secondary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCurrency !== 'USD' && bankingAmount > 0 && (
                  <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Exchange Rate</span>
                      <span className="font-mono">
                        1 {selectedCurrency} = ${(FOREX_RATES_TO_USD[selectedCurrency as BankingCurrency] || 1).toFixed(4)} USD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">USD Equivalent</span>
                      <span className="font-mono font-semibold text-success">
                        ${(bankingAmount * (FOREX_RATES_TO_USD[selectedCurrency as BankingCurrency] || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedCategory === 'stocks' && (
              <>
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          readOnly={isPriceAvailable}
                          className="bg-secondary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., AAPL" {...field} className="bg-secondary/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="yield"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Yield % (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5.0"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="bg-secondary/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === 'stocks' && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shares</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="100"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        className="bg-secondary/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCategory === 'stocks' && isPriceAvailable && (
              <div className="space-y-2 p-3 rounded-lg bg-secondary/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Price</span>
                  <span className="font-mono text-success">
                    ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-mono font-semibold">
                    ${((quantity || 0) * (currentPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
