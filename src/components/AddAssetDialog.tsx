import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AssetCategory } from '@/lib/types';
import { LivePrices } from '@/hooks/useLivePrices';
import { TickerSearchInput } from './TickerSearchInput';
import { TickerResult } from '@/hooks/useTickerSearch';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['banking', 'crypto', 'stocks', 'metals'] as const),
  value: z.number().min(0, 'Value must be positive'),
  quantity: z.number().optional(),
  symbol: z.string().max(10).optional(),
  yield: z.number().min(0).max(100).optional(),
  stakingRate: z.number().min(0).max(100).optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface AddAssetDialogProps {
  onAdd: (asset: AssetFormData) => void;
  livePrices?: LivePrices;
  onStockPriceUpdate?: (symbol: string, price: number, change: number, changePercent: number) => void;
}

const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: 'banking', label: 'Banking' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'stocks', label: 'Stocks & ETFs' },
  { value: 'metals', label: 'Precious Metals' },
];

const cryptoSymbols = ['BTC', 'ETH', 'LINK'];
const metalSymbols = ['GOLD', 'SILVER'];

function getSymbolPrice(symbol: string | undefined, prices?: LivePrices): number | null {
  if (!symbol || !prices) return null;
  const upperSymbol = symbol.toUpperCase();
  switch (upperSymbol) {
    case 'BTC': return prices.btc;
    case 'ETH': return prices.eth;
    case 'LINK': return prices.link;
    case 'GOLD': return prices.gold;
    case 'SILVER': return prices.silver;
    default:
      // Check if it's a stock price
      return prices.stocks?.[upperSymbol]?.price ?? null;
  }
}

export function AddAssetDialog({ onAdd, livePrices, onStockPriceUpdate }: AddAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<TickerResult | null>(null);
  
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '',
      category: 'banking',
      value: 0,
      quantity: undefined,
      symbol: '',
      yield: undefined,
      stakingRate: undefined,
    },
  });

  const selectedCategory = form.watch('category');
  const selectedSymbol = form.watch('symbol');
  const quantity = form.watch('quantity');
  
  const currentPrice = getSymbolPrice(selectedSymbol, livePrices);
  const isPriceAvailable = currentPrice !== null && (selectedCategory === 'crypto' || selectedCategory === 'metals');
  const isStockPriceAvailable = selectedCategory === 'stocks' && selectedTicker?.price;
  
  // Auto-calculate value when quantity and price are available
  useEffect(() => {
    if (isPriceAvailable && quantity && currentPrice) {
      form.setValue('value', quantity * currentPrice);
    }
  }, [quantity, currentPrice, isPriceAvailable, form]);

  // Auto-calculate value for stocks when quantity changes
  useEffect(() => {
    if (isStockPriceAvailable && quantity && selectedTicker?.price) {
      form.setValue('value', quantity * selectedTicker.price);
    }
  }, [quantity, selectedTicker, isStockPriceAvailable, form]);

  const handleTickerSelect = (ticker: TickerResult) => {
    setSelectedTicker(ticker);
    form.setValue('symbol', ticker.symbol);
    form.setValue('name', ticker.name);
    
    // Store the stock price
    if (ticker.price && onStockPriceUpdate) {
      onStockPriceUpdate(ticker.symbol, ticker.price, ticker.change || 0, ticker.changePercent || 0);
    }
    
    // Auto-calculate value if quantity is set
    const currentQuantity = form.getValues('quantity');
    if (ticker.price && currentQuantity) {
      form.setValue('value', currentQuantity * ticker.price);
    }
  };

  const onSubmit = (data: AssetFormData) => {
    onAdd(data);
    form.reset();
    setSelectedTicker(null);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setSelectedTicker(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 glass-card border-primary/30 hover:border-primary/50">
          <Plus className="w-4 h-4" />
          Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="gradient-text">Add New Asset</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedTicker(null);
                    form.setValue('symbol', '');
                    form.setValue('name', '');
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === 'stocks' && (
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Stock/ETF</FormLabel>
                    <FormControl>
                      <TickerSearchInput
                        value={field.value || ''}
                        onChange={field.onChange}
                        onSelect={handleTickerSelect}
                        placeholder="Search by name or symbol..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={selectedCategory === 'stocks' ? 'Auto-filled from search' : 'e.g., Chase Savings'} 
                      {...field} 
                      className="bg-secondary/50"
                      readOnly={selectedCategory === 'stocks' && !!selectedTicker}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === 'crypto' && (
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cryptocurrency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue placeholder="Select crypto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cryptoSymbols.map((sym) => (
                          <SelectItem key={sym} value={sym}>
                            {sym} {livePrices && `($${getSymbolPrice(sym, livePrices)?.toLocaleString()})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedCategory === 'metals' && (
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
            )}

            {(selectedCategory === 'crypto' || selectedCategory === 'metals') && (
              <>
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedCategory === 'crypto' ? 'Amount' : 'Quantity (oz)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={selectedCategory === 'crypto' ? '0.000001' : '0.01'}
                          placeholder={selectedCategory === 'crypto' ? '0.5' : '10'}
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
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price</span>
                      <span className="font-mono text-success">
                        ${currentPrice?.toLocaleString()}{selectedCategory === 'metals' ? '/oz' : ''}
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

            {selectedCategory === 'stocks' && (
              <>
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

                {isStockPriceAvailable && selectedTicker && (
                  <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price</span>
                      <span className="font-mono text-success">
                        ${selectedTicker.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedTicker.changePercent !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Today's Change</span>
                        <span className={`font-mono ${selectedTicker.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {selectedTicker.changePercent >= 0 ? '+' : ''}{selectedTicker.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-mono font-semibold">
                        ${((quantity || 0) * (selectedTicker.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                {!selectedTicker && (
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
                            placeholder="10000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="bg-secondary/50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="yield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dividend Yield (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="2.5"
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
              </>
            )}

            {selectedCategory === 'banking' && (
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
                          placeholder="10000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                      <FormLabel>Symbol (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SAVINGS" {...field} className="bg-secondary/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="4.5"
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
              </>
            )}

            {selectedCategory === 'crypto' && (
              <FormField
                control={form.control}
                name="stakingRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staking Yield (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="4.5"
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

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Add Asset
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
