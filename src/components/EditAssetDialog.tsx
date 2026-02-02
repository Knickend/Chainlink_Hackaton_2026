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
import { Asset, AssetCategory, BANKING_CURRENCIES, BankingCurrency, FOREX_RATES_TO_USD, getCurrencySymbol, COMMODITY_UNITS, CommodityUnit, convertToTroyOz } from '@/lib/types';
import { LivePrices } from '@/hooks/useLivePrices';
import { TickerSearchInput } from './TickerSearchInput';
import { TickerResult } from '@/hooks/useTickerSearch';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['banking', 'crypto', 'stocks', 'commodities'] as const),
  value: z.number().min(0, 'Value must be positive'),
  quantity: z.number().optional(),
  symbol: z.string().optional(),
  yield: z.number().min(0).max(100).optional(),
  currency: z.string().optional(),
  unit: z.string().optional(),
  // Cost basis fields for P&L tracking
  purchase_price_per_unit: z.number().min(0).optional(),
  purchase_date: z.string().optional(),
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
  { value: 'commodities', label: 'Commodities' },
];

function getSymbolPrice(symbol: string | undefined, category: string | undefined, prices?: LivePrices): number | null {
  if (!symbol || !prices) return null;
  const upperSymbol = symbol.toUpperCase();
  
  // Check crypto prices (dedicated fields)
  if (category === 'crypto') {
    switch (upperSymbol) {
      case 'BTC':
      case 'BITCOIN':
        return prices.btc;
      case 'ETH':
      case 'ETHEREUM':
        return prices.eth;
      case 'LINK':
      case 'CHAINLINK':
        return prices.link;
      default:
        // Check if it's cached as a stock/generic ticker
        return prices.stocks?.[upperSymbol]?.price ?? null;
    }
  }
  
  // Check commodity prices
  switch (upperSymbol) {
    case 'GOLD':
    case 'XAU':
      return prices.gold;
    case 'SILVER':
    case 'XAG':
      return prices.silver;
    default:
      // Check stocks
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
      unit: asset.unit || 'oz',
      purchase_price_per_unit: asset.purchase_price_per_unit,
      purchase_date: asset.purchase_date || '',
    },
  });

  const selectedCategory = form.watch('category');
  const selectedSymbol = form.watch('symbol');
  const quantity = form.watch('quantity');
  const selectedCurrency = form.watch('currency') || 'USD';
  const selectedUnit = (form.watch('unit') || 'oz') as CommodityUnit;
  const bankingAmount = form.watch('value');
  
  const currentPrice = getSymbolPrice(selectedSymbol, selectedCategory, livePrices);
  const isMarketPricedCategory = selectedCategory === 'crypto' || selectedCategory === 'commodities' || selectedCategory === 'stocks';
  const isPriceAvailable = currentPrice !== null && isMarketPricedCategory;
  const isCryptoTickerPriceAvailable = selectedCategory === 'crypto' && typeof selectedTicker?.price === 'number';
  const isCommodityTickerPriceAvailable = selectedCategory === 'commodities' && typeof selectedTicker?.price === 'number';

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
        unit: asset.unit || 'oz',
        purchase_price_per_unit: asset.purchase_price_per_unit,
        purchase_date: asset.purchase_date || '',
      });
      setSelectedTicker(null);
    }
  }, [open, asset, form]);

  // Auto-calculate value when quantity and price are available
  useEffect(() => {
    if (isPriceAvailable && typeof quantity === 'number' && typeof currentPrice === 'number') {
      if (selectedCategory === 'commodities') {
        const quantityInOz = convertToTroyOz(quantity, selectedUnit);
        form.setValue('value', quantityInOz * currentPrice);
      } else {
        form.setValue('value', quantity * currentPrice);
      }
    }
  }, [quantity, currentPrice, isPriceAvailable, selectedCategory, selectedUnit, form]);

  // Auto-calculate value for crypto/commodity ticker
  useEffect(() => {
    if ((isCryptoTickerPriceAvailable || isCommodityTickerPriceAvailable) && typeof quantity === 'number' && typeof selectedTicker?.price === 'number') {
      if (selectedCategory === 'commodities') {
        const quantityInOz = convertToTroyOz(quantity, selectedUnit);
        form.setValue('value', quantityInOz * selectedTicker.price);
      } else {
        form.setValue('value', quantity * selectedTicker.price);
      }
    }
  }, [quantity, selectedTicker, isCryptoTickerPriceAvailable, isCommodityTickerPriceAvailable, selectedCategory, selectedUnit, form]);

  const handleTickerSelect = (ticker: TickerResult) => {
    setSelectedTicker(ticker);
    form.setValue('symbol', ticker.symbol);
    form.setValue('name', ticker.name);
    
    if (ticker.price && onCryptoPriceUpdate) {
      onCryptoPriceUpdate(ticker.symbol, ticker.price, ticker.change || 0, ticker.changePercent || 0);
    }
    
    const currentQuantity = form.getValues('quantity');
    if (typeof ticker.price === 'number' && typeof currentQuantity === 'number') {
      if (selectedCategory === 'commodities') {
        const quantityInOz = convertToTroyOz(currentQuantity, selectedUnit);
        form.setValue('value', quantityInOz * ticker.price);
      } else {
        form.setValue('value', currentQuantity * ticker.price);
      }
    }
  };

  const onSubmit = (data: AssetFormData) => {
    // For banking, handle forex conversion
    if (data.category === 'banking' && data.currency) {
      const forexRate = FOREX_RATES_TO_USD[data.currency as BankingCurrency] || 1;
      const usdValue = data.value * forexRate;
      onUpdate(asset.id, {
        name: data.name,
        category: data.category,
        value: usdValue,
        symbol: data.currency,
        quantity: data.value,
        yield: data.yield,
      });
      setOpen(false);
      setSelectedTicker(null);
      return;
    }
    
    // Determine best price source for other categories
    let priceForComputation: number | null = null;
    if ((selectedCategory === 'crypto' || selectedCategory === 'commodities') && selectedTicker?.price) {
      priceForComputation = selectedTicker.price;
    } else {
      priceForComputation = getSymbolPrice(data.symbol, data.category, livePrices);
    }
    
    let computedValue = data.value;
    if (isMarketPricedCategory && typeof data.quantity === 'number' && typeof priceForComputation === 'number') {
      if (data.category === 'commodities') {
        const quantityInOz = convertToTroyOz(data.quantity, (data.unit as CommodityUnit) || 'oz');
        computedValue = quantityInOz * priceForComputation;
      } else {
        computedValue = data.quantity * priceForComputation;
      }
    }

    // Calculate cost basis from purchase price if provided
    const costBasis = data.purchase_price_per_unit && data.quantity 
      ? data.purchase_price_per_unit * data.quantity 
      : undefined;

    onUpdate(asset.id, {
      name: data.name,
      category: data.category,
      value: computedValue,
      symbol: data.symbol,
      quantity: data.quantity,
      yield: data.yield,
      unit: data.category === 'commodities' ? ((data.unit as CommodityUnit) || 'oz') : undefined,
      cost_basis: costBasis,
      purchase_date: data.purchase_date || undefined,
      purchase_price_per_unit: data.purchase_price_per_unit,
    });
    setOpen(false);
    setSelectedTicker(null);
  };

  const getUnitLabel = (unit: CommodityUnit): string => {
    return COMMODITY_UNITS.find(u => u.value === unit)?.label.split(' ')[0] || unit;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Asset</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
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

                <FormField
                  control={form.control}
                  name="yield"
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

                {/* Cost Basis Section for P&L Tracking */}
                <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/10">
                  <p className="text-xs font-medium text-muted-foreground">Cost Basis (for P&L tracking)</p>
                  
                  <FormField
                    control={form.control}
                    name="purchase_price_per_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Purchase Price per Unit (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 45000"
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

                  <FormField
                    control={form.control}
                    name="purchase_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Purchase Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="bg-secondary/50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {selectedCategory === 'commodities' && (
              <>
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Commodity</FormLabel>
                      <FormControl>
                        <TickerSearchInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          onSelect={handleTickerSelect}
                          placeholder="Search gold, silver, oil, copper..."
                          assetType="commodities"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'oz'}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary/50">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMMODITY_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
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
                      <FormLabel>Quantity ({getUnitLabel(selectedUnit)})</FormLabel>
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

                {(isCommodityTickerPriceAvailable || isPriceAvailable) && (
                  <div className="space-y-2 p-3 rounded-lg bg-secondary/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price</span>
                      <span className="font-mono text-success">
                        ${(selectedTicker?.price ?? currentPrice)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-muted-foreground ml-1">{selectedTicker?.priceUnit || 'per oz'}</span>
                      </span>
                    </div>
                    {selectedTicker?.changePercent !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Today's Change</span>
                        <span className={`font-mono ${selectedTicker.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {selectedTicker.changePercent >= 0 ? '+' : ''}{selectedTicker.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {quantity && selectedUnit !== 'oz' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Equivalent (oz)</span>
                        <span className="font-mono">
                          {convertToTroyOz(quantity, selectedUnit).toFixed(4)} oz
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-mono font-semibold">
                        ${(convertToTroyOz(quantity || 0, selectedUnit) * (selectedTicker?.price ?? currentPrice ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {selectedCategory === 'stocks' && (
              <>
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="AAPL"
                          {...field}
                          value={field.value ?? ''}
                          className="bg-secondary/50 font-mono"
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

                {isPriceAvailable && (
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

                {/* Cost Basis Section for P&L Tracking */}
                <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/10">
                  <p className="text-xs font-medium text-muted-foreground">Cost Basis (for P&L tracking)</p>
                  
                  <FormField
                    control={form.control}
                    name="purchase_price_per_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Purchase Price per Share (USD)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 150.00"
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

                  <FormField
                    control={form.control}
                    name="purchase_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Purchase Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="bg-secondary/50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            </div>

            <div className="pt-4 flex-shrink-0">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
