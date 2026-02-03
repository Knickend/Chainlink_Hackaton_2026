import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, ShoppingCart, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Asset, AssetCategory, BANKING_CURRENCIES, BankingCurrency, FOREX_RATES_TO_USD, getCurrencySymbol, COMMODITY_UNITS, CommodityUnit, convertToTroyOz, FundFlowMode } from '@/lib/types';
import { LivePrices } from '@/hooks/useLivePrices';
import { TickerSearchInput } from './TickerSearchInput';
import { TickerResult } from '@/hooks/useTickerSearch';
import { FundFlowSelector } from './FundFlowSelector';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['banking', 'crypto', 'stocks', 'commodities', 'realestate'] as const),
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

const buySchema = z.object({
  quantity: z.number().min(0.000001, 'Quantity is required'),
  price_per_unit: z.number().min(0, 'Price must be positive'),
  transaction_date: z.string().optional(),
});

const sellSchema = z.object({
  quantity: z.number().min(0.000001, 'Quantity is required'),
  price_per_unit: z.number().min(0, 'Price must be positive'),
  transaction_date: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;
type BuyFormData = z.infer<typeof buySchema>;
type SellFormData = z.infer<typeof sellSchema>;

export interface BuyMoreData {
  quantity: number;
  price_per_unit: number;
  transaction_date?: string;
  // Fund flow tracking
  fund_flow_mode?: FundFlowMode;
  source_asset_id?: string;
  source_label?: string;
  source_currency?: string;
  source_amount?: number;
}

export interface SellData {
  quantity: number;
  price_per_unit: number;
  total_value: number;
  realized_pnl?: number;
  transaction_date?: string;
  notes?: string;
  // Fund flow tracking
  fund_flow_mode?: FundFlowMode;
  destination_asset_id?: string;
  destination_label?: string;
  destination_currency?: string;
  destination_amount?: number;
}

interface EditAssetDialogProps {
  asset: Asset;
  onUpdate: (id: string, data: Partial<Omit<Asset, 'id'>>) => void;
  onBuyMore?: (assetId: string, data: BuyMoreData) => Promise<void>;
  onSell?: (assetId: string, data: SellData) => Promise<void>;
  livePrices?: LivePrices;
  onCryptoPriceUpdate?: (symbol: string, price: number, change: number, changePercent: number) => void;
  allAssets?: Asset[]; // For fund flow selector
}

const categories: { value: AssetCategory; label: string }[] = [
  { value: 'banking', label: 'Cash & Stablecoins' },
  { value: 'realestate', label: 'Real Estate, Equity & Misc.' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'stocks', label: 'Stocks, Bonds & ETFs' },
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

export function EditAssetDialog({ asset, onUpdate, onBuyMore, onSell, livePrices, onCryptoPriceUpdate, allAssets = [] }: EditAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'buy' | 'sell'>('edit');
  const [selectedTicker, setSelectedTicker] = useState<TickerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fund flow state for Buy
  const [buyFundFlowMode, setBuyFundFlowMode] = useState<FundFlowMode>('none');
  const [buySourceAssetId, setBuySourceAssetId] = useState<string | undefined>();
  const [buySourceLabel, setBuySourceLabel] = useState('');
  const [buySourceCurrency, setBuySourceCurrency] = useState('USD');
  const [buySourceAmount, setBuySourceAmount] = useState<number | undefined>();
  
  // Fund flow state for Sell
  const [sellFundFlowMode, setSellFundFlowMode] = useState<FundFlowMode>('none');
  const [sellDestAssetId, setSellDestAssetId] = useState<string | undefined>();
  const [sellDestLabel, setSellDestLabel] = useState('');
  const [sellDestCurrency, setSellDestCurrency] = useState('USD');
  const [sellDestAmount, setSellDestAmount] = useState<number | undefined>();
  
  // Only show buy/sell tabs for tradeable asset categories
  const isTradeableCategory = asset.category === 'crypto' || asset.category === 'stocks' || asset.category === 'commodities';
  
  // Get current price for this asset
  const currentPrice = getSymbolPrice(asset.symbol, asset.category, livePrices);
  
  // Edit form
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

  // Buy form
  const buyForm = useForm<BuyFormData>({
    resolver: zodResolver(buySchema),
    defaultValues: {
      quantity: undefined,
      price_per_unit: currentPrice || undefined,
      transaction_date: new Date().toISOString().split('T')[0],
    },
  });

  // Sell form
  const sellForm = useForm<SellFormData>({
    resolver: zodResolver(sellSchema),
    defaultValues: {
      quantity: undefined,
      price_per_unit: currentPrice || undefined,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const selectedCategory = form.watch('category');
  const selectedSymbol = form.watch('symbol');
  const quantity = form.watch('quantity');
  const selectedCurrency = form.watch('currency') || 'USD';
  const selectedUnit = (form.watch('unit') || 'oz') as CommodityUnit;
  const bankingAmount = form.watch('value');
  
  const livePrice = getSymbolPrice(selectedSymbol, selectedCategory, livePrices);
  const isMarketPricedCategory = selectedCategory === 'crypto' || selectedCategory === 'commodities' || selectedCategory === 'stocks';
  const isPriceAvailable = livePrice !== null && isMarketPricedCategory;
  const isCryptoTickerPriceAvailable = selectedCategory === 'crypto' && typeof selectedTicker?.price === 'number';
  const isCommodityTickerPriceAvailable = selectedCategory === 'commodities' && typeof selectedTicker?.price === 'number';

  // Buy form watchers
  const buyQuantity = buyForm.watch('quantity');
  const buyPricePerUnit = buyForm.watch('price_per_unit');
  
  // Sell form watchers
  const sellQuantity = sellForm.watch('quantity');
  const sellPricePerUnit = sellForm.watch('price_per_unit');

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
      buyForm.reset({
        quantity: undefined,
        price_per_unit: currentPrice || undefined,
        transaction_date: new Date().toISOString().split('T')[0],
      });
      sellForm.reset({
        quantity: undefined,
        price_per_unit: currentPrice || undefined,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setSelectedTicker(null);
      setActiveTab('edit');
    }
  }, [open, asset, form, buyForm, sellForm, currentPrice]);

  // Update buy/sell forms when live price changes
  useEffect(() => {
    if (currentPrice && open) {
      buyForm.setValue('price_per_unit', currentPrice);
      sellForm.setValue('price_per_unit', currentPrice);
    }
  }, [currentPrice, open, buyForm, sellForm]);

  // Auto-calculate value when quantity and price are available
  useEffect(() => {
    if (isPriceAvailable && typeof quantity === 'number' && typeof livePrice === 'number') {
      if (selectedCategory === 'commodities') {
        const quantityInOz = convertToTroyOz(quantity, selectedUnit);
        form.setValue('value', quantityInOz * livePrice);
      } else {
        form.setValue('value', quantity * livePrice);
      }
    }
  }, [quantity, livePrice, isPriceAvailable, selectedCategory, selectedUnit, form]);

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

  const handleBuySubmit = async (data: BuyFormData) => {
    if (!onBuyMore) return;
    
    setIsSubmitting(true);
    try {
      await onBuyMore(asset.id, {
        quantity: data.quantity,
        price_per_unit: data.price_per_unit,
        transaction_date: data.transaction_date,
        // Fund flow data
        fund_flow_mode: buyFundFlowMode,
        source_asset_id: buyFundFlowMode === 'linked' ? buySourceAssetId : undefined,
        source_label: buyFundFlowMode === 'manual' ? buySourceLabel : undefined,
        source_currency: buyFundFlowMode !== 'none' ? buySourceCurrency : undefined,
        source_amount: buyFundFlowMode !== 'none' ? buySourceAmount : undefined,
      });
      setOpen(false);
      // Reset fund flow state
      setBuyFundFlowMode('none');
      setBuySourceAssetId(undefined);
      setBuySourceLabel('');
      setBuySourceAmount(undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellSubmit = async (data: SellFormData) => {
    if (!onSell) return;
    
    // Calculate realized P&L
    const saleProceeds = data.quantity * data.price_per_unit;
    const costBasisPerUnit = asset.cost_basis && asset.quantity 
      ? asset.cost_basis / asset.quantity 
      : asset.purchase_price_per_unit || 0;
    const costOfSoldUnits = data.quantity * costBasisPerUnit;
    const realizedPnl = saleProceeds - costOfSoldUnits;
    
    setIsSubmitting(true);
    try {
      await onSell(asset.id, {
        quantity: data.quantity,
        price_per_unit: data.price_per_unit,
        total_value: saleProceeds,
        realized_pnl: realizedPnl,
        transaction_date: data.transaction_date,
        notes: data.notes,
        // Fund flow data
        fund_flow_mode: sellFundFlowMode,
        destination_asset_id: sellFundFlowMode === 'linked' ? sellDestAssetId : undefined,
        destination_label: sellFundFlowMode === 'manual' ? sellDestLabel : undefined,
        destination_currency: sellFundFlowMode !== 'none' ? sellDestCurrency : undefined,
        destination_amount: sellFundFlowMode !== 'none' ? sellDestAmount : undefined,
      });
      setOpen(false);
      // Reset fund flow state
      setSellFundFlowMode('none');
      setSellDestAssetId(undefined);
      setSellDestLabel('');
      setSellDestAmount(undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUnitLabel = (unit: CommodityUnit): string => {
    return COMMODITY_UNITS.find(u => u.value === unit)?.label.split(' ')[0] || unit;
  };

  // Calculate previews for buy/sell
  const buyPreview = {
    newQuantity: (asset.quantity || 0) + (buyQuantity || 0),
    additionalCost: (buyQuantity || 0) * (buyPricePerUnit || 0),
    newCostBasis: (asset.cost_basis || 0) + ((buyQuantity || 0) * (buyPricePerUnit || 0)),
  };
  buyPreview.newCostBasis = buyPreview.newQuantity > 0 
    ? (asset.cost_basis || 0) + buyPreview.additionalCost 
    : 0;

  const sellPreview = {
    remainingQuantity: Math.max(0, (asset.quantity || 0) - (sellQuantity || 0)),
    saleProceeds: (sellQuantity || 0) * (sellPricePerUnit || 0),
    costBasisPerUnit: asset.cost_basis && asset.quantity 
      ? asset.cost_basis / asset.quantity 
      : asset.purchase_price_per_unit || 0,
  };
  sellPreview.saleProceeds = (sellQuantity || 0) * (sellPricePerUnit || 0);
  const sellCostOfUnits = (sellQuantity || 0) * sellPreview.costBasisPerUnit;
  const sellRealizedPnl = sellPreview.saleProceeds - sellCostOfUnits;

  const getQuantityLabel = () => {
    switch (asset.category) {
      case 'crypto': return 'Units';
      case 'stocks': return 'Shares';
      case 'commodities': return asset.unit ? getUnitLabel(asset.unit as CommodityUnit) : 'oz';
      default: return 'Units';
    }
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
          <DialogTitle>{asset.name}</DialogTitle>
        </DialogHeader>
        
        {isTradeableCategory && onBuyMore && onSell ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'buy' | 'sell')} className="flex flex-col flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="edit" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="buy" className="gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" />
                Buy More
              </TabsTrigger>
              <TabsTrigger value="sell" className="gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" />
                Sell
              </TabsTrigger>
            </TabsList>
            
            {/* Edit Tab */}
            <TabsContent value="edit" className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                  <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
                    {renderEditFormFields()}
                  </div>
                  <div className="pt-4 flex-shrink-0">
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            {/* Buy Tab */}
            <TabsContent value="buy" className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
              <Form {...buyForm}>
                <form onSubmit={buyForm.handleSubmit(handleBuySubmit)} className="flex flex-col flex-1 min-h-0">
                  <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
                    <div className="p-3 rounded-lg bg-secondary/30 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Holdings</span>
                        <span className="font-mono font-medium">{asset.quantity?.toLocaleString() || 0} {getQuantityLabel()}</span>
                      </div>
                    </div>
                    
                    <FormField
                      control={buyForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity to Buy ({getQuantityLabel()})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              placeholder="e.g., 10"
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
                      control={buyForm.control}
                      name="price_per_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price per {getQuantityLabel() === 'Shares' ? 'Share' : 'Unit'} (USD)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 100.00"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="bg-secondary/50"
                            />
                          </FormControl>
                          {currentPrice && (
                            <p className="text-xs text-muted-foreground">
                              Current market price: ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={buyForm.control}
                      name="transaction_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="bg-secondary/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Fund Flow Selector for Buy */}
                    {allAssets.length > 0 && (
                      <FundFlowSelector
                        type="source"
                        assets={allAssets}
                        mode={buyFundFlowMode}
                        onModeChange={setBuyFundFlowMode}
                        selectedAssetId={buySourceAssetId}
                        onAssetSelect={setBuySourceAssetId}
                        label={buySourceLabel}
                        onLabelChange={setBuySourceLabel}
                        currency={buySourceCurrency}
                        onCurrencyChange={setBuySourceCurrency}
                        amount={buySourceAmount}
                        onAmountChange={setBuySourceAmount}
                        transactionAmount={buyPreview.additionalCost}
                        excludeAssetId={asset.id}
                      />
                    )}
                    
                    {/* Buy Preview */}
                    {buyQuantity && buyQuantity > 0 && (
                      <div className="space-y-2 p-3 rounded-lg border border-success/30 bg-success/5">
                        <p className="text-xs font-medium text-success">Purchase Preview</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Purchase Cost</span>
                            <span className="font-mono">${buyPreview.additionalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between border-t border-border/50 pt-1">
                            <span className="text-muted-foreground">New Total Quantity</span>
                            <span className="font-mono font-semibold">{buyPreview.newQuantity.toLocaleString()} {getQuantityLabel()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">New Cost Basis</span>
                            <span className="font-mono font-semibold">${buyPreview.newCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex-shrink-0">
                    <Button 
                      type="submit" 
                      className="w-full bg-success hover:bg-success/90"
                      disabled={isSubmitting || !buyQuantity || buyQuantity <= 0}
                    >
                      {isSubmitting ? 'Processing...' : 'Confirm Purchase'}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            {/* Sell Tab */}
            <TabsContent value="sell" className="flex-1 min-h-0 mt-4 overflow-hidden flex flex-col">
              <Form {...sellForm}>
                <form onSubmit={sellForm.handleSubmit(handleSellSubmit)} className="flex flex-col flex-1 min-h-0">
                  <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
                    <div className="p-3 rounded-lg bg-secondary/30 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available to Sell</span>
                        <span className="font-mono font-medium">{asset.quantity?.toLocaleString() || 0} {getQuantityLabel()}</span>
                      </div>
                      {asset.cost_basis && asset.quantity && (
                        <div className="flex justify-between mt-1">
                          <span className="text-muted-foreground">Avg. Cost Basis</span>
                          <span className="font-mono">${(asset.cost_basis / asset.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/unit</span>
                        </div>
                      )}
                    </div>
                    
                    <FormField
                      control={sellForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity to Sell ({getQuantityLabel()})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              max={asset.quantity || 0}
                              placeholder={`Max: ${asset.quantity || 0}`}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || undefined;
                                const maxQty = asset.quantity || 0;
                                field.onChange(val && val > maxQty ? maxQty : val);
                              }}
                              className="bg-secondary/50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={sellForm.control}
                      name="price_per_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Price per {getQuantityLabel() === 'Shares' ? 'Share' : 'Unit'} (USD)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 100.00"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              className="bg-secondary/50"
                            />
                          </FormControl>
                          {currentPrice && (
                            <p className="text-xs text-muted-foreground">
                              Current market price: ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={sellForm.control}
                      name="transaction_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="bg-secondary/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={sellForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any notes about this sale..."
                              {...field}
                              className="bg-secondary/50 min-h-[60px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Fund Flow Selector for Sell */}
                    {allAssets.length > 0 && (
                      <FundFlowSelector
                        type="destination"
                        assets={allAssets}
                        mode={sellFundFlowMode}
                        onModeChange={setSellFundFlowMode}
                        selectedAssetId={sellDestAssetId}
                        onAssetSelect={setSellDestAssetId}
                        label={sellDestLabel}
                        onLabelChange={setSellDestLabel}
                        currency={sellDestCurrency}
                        onCurrencyChange={setSellDestCurrency}
                        amount={sellDestAmount}
                        onAmountChange={setSellDestAmount}
                        transactionAmount={sellPreview.saleProceeds}
                        excludeAssetId={asset.id}
                      />
                    )}
                    
                    {/* Sell Preview */}
                    {sellQuantity && sellQuantity > 0 && (
                      <div className={`space-y-2 p-3 rounded-lg border ${sellRealizedPnl >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                        <p className={`text-xs font-medium ${sellRealizedPnl >= 0 ? 'text-success' : 'text-destructive'}`}>Sale Preview</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sale Proceeds</span>
                            <span className="font-mono">${sellPreview.saleProceeds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost of Sold Units</span>
                            <span className="font-mono">-${sellCostOfUnits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between border-t border-border/50 pt-1">
                            <span className="text-muted-foreground">Realized P&L</span>
                            <span className={`font-mono font-semibold ${sellRealizedPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {sellRealizedPnl >= 0 ? '+' : ''}${sellRealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-border/50 pt-1">
                            <span className="text-muted-foreground">Remaining Holdings</span>
                            <span className="font-mono font-semibold">{sellPreview.remainingQuantity.toLocaleString()} {getQuantityLabel()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex-shrink-0">
                    <Button 
                      type="submit" 
                      variant="destructive"
                      className="w-full"
                      disabled={isSubmitting || !sellQuantity || sellQuantity <= 0 || sellQuantity > (asset.quantity || 0)}
                    >
                      {isSubmitting ? 'Processing...' : 'Confirm Sale'}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        ) : (
          // Non-tradeable categories (banking) - just show edit form
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
                {renderEditFormFields()}
              </div>
              <div className="pt-4 flex-shrink-0">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );

  // Helper function to render edit form fields based on category
  function renderEditFormFields() {
    return (
      <>
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
                    ${(selectedTicker?.price ?? livePrice)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    ${((quantity || 0) * (selectedTicker?.price ?? livePrice ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    ${(selectedTicker?.price ?? livePrice)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    ${(convertToTroyOz(quantity || 0, selectedUnit) * (selectedTicker?.price ?? livePrice ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    ${livePrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="font-mono font-semibold">
                    ${((quantity || 0) * (livePrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      </>
    );
  }
}
