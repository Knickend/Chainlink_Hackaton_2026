import { motion } from 'framer-motion';
import { Landmark, Bitcoin, TrendingUp, Package, Home, LucideIcon } from 'lucide-react';
import { AssetCategory, Asset, getCurrencySymbol, BANKING_CURRENCIES, DisplayUnit } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EditAssetDialog, BuyMoreData, SellData } from './EditAssetDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { LivePrices } from '@/hooks/useLivePrices';

interface AssetCategoryCardProps {
  category: AssetCategory;
  assets: Asset[];
  total: string;
  percentage: number;
  formatValue: (value: number) => string;
  formatDisplayUnitValue?: (value: number, showDecimals?: boolean) => string;
  displayUnit?: DisplayUnit;
  onUpdateAsset?: (id: string, data: Partial<Omit<Asset, 'id'>>) => void;
  onDeleteAsset?: (id: string) => void;
  onBuyMore?: (assetId: string, data: BuyMoreData) => Promise<void>;
  onSell?: (assetId: string, data: SellData) => Promise<void>;
  livePrices?: LivePrices;
  allAssets?: Asset[]; // For fund flow selector
  delay?: number;
}

const categoryConfig: Record<AssetCategory, { icon: LucideIcon; label: string; color: string }> = {
  banking: { icon: Landmark, label: 'Cash & Stablecoins', color: 'text-blue-400' },
  realestate: { icon: Home, label: 'Real Estate, Equity & Misc.', color: 'text-purple-400' },
  crypto: { icon: Bitcoin, label: 'Cryptocurrency', color: 'text-bitcoin' },
  stocks: { icon: TrendingUp, label: 'Stocks, Bonds & ETFs', color: 'text-success' },
  commodities: { icon: Package, label: 'Commodities', color: 'text-gold' },
};

// Helper function to get the unit price for an asset from live prices
function getUnitPrice(asset: Asset, category: AssetCategory, livePrices?: LivePrices): number | null {
  if (!livePrices) return null;
  
  const sym = asset.symbol?.toUpperCase();
  if (!sym) return null;
  
  if (category === 'crypto') {
    // Check dedicated crypto price fields
    if (sym === 'BTC') return livePrices.btc;
    if (sym === 'ETH') return livePrices.eth;
    if (sym === 'LINK') return livePrices.link;
    // Check crypto map
    return livePrices.crypto?.[sym]?.price ?? null;
  }
  
  if (category === 'commodities') {
    // Check dedicated commodity price fields
    if (sym === 'GOLD' || sym === 'XAU') return livePrices.gold;
    if (sym === 'SILVER' || sym === 'XAG') return livePrices.silver;
    // Check commodities map
    return livePrices.commodities?.[sym]?.price ?? null;
  }
  
  if (category === 'stocks') {
    return livePrices.stocks?.[sym]?.price ?? null;
  }
  
  return null;
}

export function AssetCategoryCard({
  category,
  assets,
  total,
  percentage,
  formatValue,
  formatDisplayUnitValue,
  displayUnit,
  onUpdateAsset,
  onDeleteAsset,
  onBuyMore,
  onSell,
  livePrices,
  allAssets,
  delay = 0,
}: AssetCategoryCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  // Determine if we should show the two-line layout with price details
  const showPriceDetails = (category === 'crypto' || category === 'commodities') && formatDisplayUnitValue;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-5 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-secondary', config.color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{config.label}</h3>
            <p className="text-xs text-muted-foreground">{assets.length} assets</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono font-semibold text-lg">{total}</p>
          <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of portfolio</p>
        </div>
      </div>

      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
        {assets.map((asset) => {
          // For banking and real estate assets, show the original currency amount
          const hasForexCurrency = (category === 'banking' || category === 'realestate') && 
            asset.symbol && BANKING_CURRENCIES.some(c => c.value === asset.symbol);
          
          // Get unit price for crypto/commodities
          const unitPrice = showPriceDetails ? getUnitPrice(asset, category, livePrices) : null;
          
          // Format the quantity display
          const formatQuantityDisplay = (): string | null => {
            if (category === 'crypto' && asset.quantity && asset.symbol) {
              return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset.symbol}`;
            }
            if (category === 'commodities' && asset.quantity) {
              const unit = asset.unit || 'oz';
              return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${unit}`;
            }
            return null;
          };
          
          // Format unit price display
          const formatUnitPriceDisplay = (): string | null => {
            if (!unitPrice || !formatDisplayUnitValue) return null;
            
            if (category === 'commodities') {
              // Show price per oz for commodities
              return `${formatDisplayUnitValue(unitPrice, true)}/oz`;
            }
            // For crypto, show the price
            return formatDisplayUnitValue(unitPrice, true);
          };
          
          // Format asset value in native format for banking/realestate (original display)
          const formatNativeAssetValue = (): string => {
            // Banking and Real Estate: show original currency amount to prevent forex drift
            if ((category === 'banking' || category === 'realestate') && asset.symbol && asset.quantity) {
              return `${getCurrencySymbol(asset.symbol)}${asset.quantity.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}`;
            }
            
            // Fallback for realestate without proper currency data
            if (category === 'realestate') {
              return formatValue(asset.value);
            }
            
            // Crypto/Stocks: show quantity + symbol (only for old layout)
            if ((category === 'crypto' || category === 'stocks') && asset.quantity && asset.symbol) {
              return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset.symbol}`;
            }
            
            // Commodities: show quantity + unit (only for old layout)
            if (category === 'commodities' && asset.quantity) {
              const unit = asset.unit || 'oz';
              return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${unit}`;
            }
            
            // Fallback to formatted value in display unit
            return formatValue(asset.value);
          };

          const quantityDisplay = formatQuantityDisplay();
          const unitPriceDisplay = formatUnitPriceDisplay();

          return (
            <div
              key={asset.id}
              className={cn(
                "py-2 px-3 rounded-lg bg-secondary/30 group",
                showPriceDetails ? "flex flex-col gap-1" : "flex items-center justify-between"
              )}
            >
              {showPriceDetails ? (
                // Two-line layout for crypto/commodities
                <>
                  {/* Row 1: Symbol, Name, Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {asset.symbol && (
                        <span className="text-xs font-mono text-muted-foreground">{asset.symbol}</span>
                      )}
                      <span className="text-sm">{asset.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {onUpdateAsset && (
                        <EditAssetDialog 
                          asset={asset} 
                          onUpdate={onUpdateAsset} 
                          onBuyMore={onBuyMore}
                          onSell={onSell}
                          livePrices={livePrices}
                          allAssets={allAssets}
                        />
                      )}
                      {onDeleteAsset && (
                        <DeleteConfirmDialog
                          itemName={asset.name}
                          itemType="asset"
                          onConfirm={() => onDeleteAsset(asset.id)}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Row 2: Quantity × Price = Total */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {quantityDisplay}
                      {unitPriceDisplay && <span className="mx-1">×</span>}
                      {unitPriceDisplay}
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {formatDisplayUnitValue(asset.value, true)}
                    </span>
                  </div>
                </>
              ) : (
                // Original single-line layout for banking/stocks/realestate
                <>
                  <div className="flex items-center gap-2">
                    {asset.symbol && !hasForexCurrency && (
                      <span className="text-xs font-mono text-muted-foreground">{asset.symbol}</span>
                    )}
                    {hasForexCurrency && (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {asset.symbol}
                      </span>
                    )}
                    <span className="text-sm">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="font-mono text-sm">{formatNativeAssetValue()}</span>
                    </div>
                    {onUpdateAsset && (
                      <EditAssetDialog 
                        asset={asset} 
                        onUpdate={onUpdateAsset} 
                        onBuyMore={onBuyMore}
                        onSell={onSell}
                        livePrices={livePrices}
                        allAssets={allAssets}
                      />
                    )}
                    {onDeleteAsset && (
                      <DeleteConfirmDialog
                        itemName={asset.name}
                        itemType="asset"
                        onConfirm={() => onDeleteAsset(asset.id)}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            backgroundColor: category === 'banking' ? 'hsl(217, 91%, 60%)' :
                            category === 'realestate' ? 'hsl(270, 95%, 60%)' :
                            category === 'crypto' ? 'hsl(var(--bitcoin))' :
                            category === 'stocks' ? 'hsl(var(--success))' :
                            'hsl(var(--gold))'
          }}
        />
      </div>
    </motion.div>
  );
}
