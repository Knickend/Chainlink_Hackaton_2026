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
import { AssetCategory, BANKING_CURRENCIES, BankingCurrency, FOREX_RATES_TO_USD, getCurrencySymbol, COMMODITY_UNITS, CommodityUnit, convertToTroyOz } from '@/lib/types';
import { LivePrices } from '@/hooks/useLivePrices';
import { TickerSearchInput } from './TickerSearchInput';
import { TickerResult } from '@/hooks/useTickerSearch';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['banking', 'crypto', 'stocks', 'commodities'] as const),
  value: z.number().min(0, 'Value must be positive'),
  quantity: z.number().optional(),
  symbol: z.string().max(10).optional(),
  yield: z.number().min(0).max(100).optional(),
  stakingRate: z.number().min(0).max(100).optional(),
  currency: z.string().optional(),
  unit: z.string().optional(),
  // Cost basis fields for P&L tracking
  purchase_price_per_unit: z.number().min(0).optional(),
  purchase_date: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface AddAssetDialogProps {
  onAdd: (asset: AssetFormData & { 
    unit?: CommodityUnit;
    cost_basis?: number;
    purchase_date?: string;
    purchase_price_per_unit?: number;
  }) => void;
  livePrices?: LivePrices;
  onStockPriceUpdate?: (symbol: string, price: number, change: number, changePercent: number) => void;
  onCryptoPriceUpdate?: (symbol: string, price: number, change: number, changePercent: number) => void;
}

const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: 'banking', label: 'Banking' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'stocks', label: 'Stocks & ETFs' },
  { value: 'commodities', label: 'Commodities' },
];

function getSymbolPrice(symbol: string | undefined, prices?: LivePrices): number | null {
  if (!symbol || !prices) return null;
  const upperSymbol = symbol.toUpperCase();
  switch (upperSymbol) {
    case 'GOLD':
    case 'XAU':
      return prices.gold;
    case 'SILVER':
    case 'XAG':
      return prices.silver;
    default:
      return prices.stocks?.[upperSymbol]?.price ?? null;
  }
}

export function AddAssetDialog({ onAdd, livePrices, onStockPriceUpdate, onCryptoPriceUpdate }: AddAssetDialogProps) {
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
      currency: 'USD',
      unit: 'oz',
      purchase_price_per_unit: undefined,
      purchase_date: '',
    },
  });

  const selectedCategory = form.watch('category');
  const selectedSymbol = form.watch('symbol');
  const quantity = form.watch('quantity');
  const selectedCurrency = form.watch('currency') || 'USD';
  const selectedUnit = (form.watch('unit') || 'oz') as CommodityUnit;
  const bankingAmount = form.watch('value');
  
  const currentPrice = getSymbolPrice(selectedSymbol, livePrices);
  const isCommodityPriceAvailable = selectedCategory === 'commodities' && typeof selectedTicker?.price === 'number';
  const isCryptoPriceAvailable = selectedCategory === 'crypto' && typeof selectedTicker?.price === 'number';
  const isStockPriceAvailable = selectedCategory === 'stocks' && typeof selectedTicker?.price === 'number';
  
  // Auto-calculate value for commodities when quantity changes
  useEffect(() => {
    if (isCommodityPriceAvailable && typeof quantity === 'number' && typeof selectedTicker?.price === 'number') {
      const quantityInOz = convertToTroyOz(quantity, selectedUnit);
      form.setValue('value', quantityInOz * selectedTicker.price);
    }
  }, [quantity, selectedTicker, isCommodityPriceAvailable, selectedUnit, form]);

  // Auto-calculate value for stocks/crypto when quantity changes
  useEffect(() => {
    if ((isStockPriceAvailable || isCryptoPriceAvailable) && typeof quantity === 'number' && typeof selectedTicker?.price === 'number') {
      form.setValue('value', quantity * selectedTicker.price);
    }
  }, [quantity, selectedTicker, isStockPriceAvailable, isCryptoPriceAvailable, form]);

  const handleTickerSelect = (ticker: TickerResult) => {
    setSelectedTicker(ticker);
    form.setValue('symbol', ticker.symbol);
    form.setValue('name', ticker.name);
    
    // Store the price
    if (ticker.price) {
      if (ticker.type === 'Crypto' && onCryptoPriceUpdate) {
        onCryptoPriceUpdate(ticker.symbol, ticker.price, ticker.change || 0, ticker.changePercent || 0);
      } else if (onStockPriceUpdate) {
        onStockPriceUpdate(ticker.symbol, ticker.price, ticker.change || 0, ticker.changePercent || 0);
      }
    }
    
    // Auto-calculate value if quantity is set
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
    // Calculate cost basis from purchase price if provided
    const costBasis = data.purchase_price_per_unit && data.quantity 
      ? data.purchase_price_per_unit * data.quantity 
      : undefined;

    // For banking, store the currency in symbol and original amount in quantity
    if (data.category === 'banking' && data.currency) {
      const forexRate = FOREX_RATES_TO_USD[data.currency as BankingCurrency] || 1;
      const usdValue = data.value * forexRate;
      onAdd({
        name: data.name,
        category: data.category,
        value: usdValue,
        symbol: data.currency,
        quantity: data.value,
        yield: data.yield,
        stakingRate: data.stakingRate,
      });
    } else if (data.category === 'commodities') {
      // For commodities, store the unit
      onAdd({
        name: data.name,
        category: data.category,
        value: data.value,
        symbol: data.symbol,
        quantity: data.quantity,
        unit: (data.unit as CommodityUnit) || 'oz',
        cost_basis: costBasis,
        purchase_date: data.purchase_date || undefined,
        purchase_price_per_unit: data.purchase_price_per_unit,
      });
    } else {
      onAdd({
        name: data.name,
        category: data.category,
        value: data.value,
        symbol: data.symbol,
        quantity: data.quantity,
        yield: data.yield,
        stakingRate: data.stakingRate,
        cost_basis: costBasis,
        purchase_date: data.purchase_date || undefined,
        purchase_price_per_unit: data.purchase_price_per_unit,
      });
    }
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

  const getUnitLabel = (unit: CommodityUnit): string => {
    return COMMODITY_UNITS.find(u => u.value === unit)?.label.split(' ')[0] || unit;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 glass-card border-primary/30 hover:border-primary/50">
          <Plus className="w-4 h-4" />
          Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[425px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="gradient-text">Add New Asset</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
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

            {selectedCategory === 'crypto' && (
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
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={selectedCategory === 'stocks' || selectedCategory === 'commodities' || selectedCategory === 'crypto' ? 'Auto-filled from search' : 'e.g., Chase Savings'} 
                      {...field} 
                      className="bg-secondary/50"
                      readOnly={(selectedCategory === 'stocks' || selectedCategory === 'commodities' || selectedCategory === 'crypto') && !!selectedTicker}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === 'crypto' && (
              <>

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

                {isCryptoPriceAvailable && selectedTicker && (
                  <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price</span>
                      <span className="font-mono text-success">
                        ${selectedTicker.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedTicker.changePercent !== undefined && (
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

                {/* Cost Basis Section for P&L Tracking */}
                <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/10">
                  <p className="text-xs font-medium text-muted-foreground">Cost Basis (optional - for P&L tracking)</p>
                  
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

                <FormField
                  control={form.control}
                  name="stakingRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staking Rate (%)</FormLabel>
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

                {isCommodityPriceAvailable && selectedTicker && (
                  <div className="space-y-2 rounded-lg bg-secondary/30 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Price</span>
                      <span className="font-mono text-success">
                        ${selectedTicker.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-muted-foreground ml-1">{selectedTicker.priceUnit || 'per oz'}</span>
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
                        ${(convertToTroyOz(quantity || 0, selectedUnit) * (selectedTicker.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                {/* Cost Basis Section for P&L Tracking */}
                <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-secondary/10">
                  <p className="text-xs font-medium text-muted-foreground">Cost Basis (optional - for P&L tracking)</p>
                  
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

            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4 flex-shrink-0">
              Add Asset
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
