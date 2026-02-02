import { useState, useMemo } from 'react';
import { Search, Filter, List, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Asset, AssetCategory, getCurrencySymbol } from '@/lib/types';
import { EditAssetDialog } from './EditAssetDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { SellAssetDialog } from './SellAssetDialog';
import { LivePrices } from '@/hooks/useLivePrices';

interface SellData {
  quantity: number;
  price_per_unit: number;
  total_value: number;
  realized_pnl?: number;
  transaction_date: string;
  notes?: string;
}

interface ViewAllAssetsDialogProps {
  assets: Asset[];
  formatValue: (value: number) => string;
  onUpdateAsset?: (id: string, data: Partial<Omit<Asset, 'id'>>) => void;
  onDeleteAsset?: (id: string) => void;
  onSellAsset?: (assetId: string, data: SellData) => Promise<void>;
  livePrices?: LivePrices;
}

const categoryLabels: Record<AssetCategory, string> = {
  banking: 'Banking',
  crypto: 'Crypto',
  stocks: 'Stocks',
  commodities: 'Commodities',
};

export function ViewAllAssetsDialog({
  assets,
  formatValue,
  onUpdateAsset,
  onDeleteAsset,
  onSellAsset,
  livePrices,
}: ViewAllAssetsDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sellDialogAsset, setSellDialogAsset] = useState<Asset | null>(null);

  // Categories that can be sold (have quantity and market prices)
  const sellableCategories = ['stocks', 'crypto', 'commodities'];

  const canSellAsset = (asset: Asset) => {
    return sellableCategories.includes(asset.category) && (asset.quantity ?? 0) > 0;
  };

  const getCurrentPrice = (asset: Asset): number | undefined => {
    if (!livePrices || !asset.symbol) return undefined;
    
    const symbolUpper = asset.symbol.toUpperCase();
    
    if (asset.category === 'crypto') {
      // Check dedicated crypto lookup first, then top-level shortcuts
      const cryptoData = livePrices.crypto?.[symbolUpper];
      if (cryptoData) return cryptoData.price;
      // Fallback to top-level for BTC/ETH/LINK
      if (symbolUpper === 'BTC') return livePrices.btc;
      if (symbolUpper === 'ETH') return livePrices.eth;
      if (symbolUpper === 'LINK') return livePrices.link;
      return undefined;
    }
    if (asset.category === 'stocks') {
      const stockData = livePrices.stocks?.[symbolUpper];
      return stockData?.price;
    }
    if (asset.category === 'commodities') {
      // Check commodities lookup, then top-level shortcuts
      const commodityData = livePrices.commodities?.[symbolUpper];
      if (commodityData) return commodityData.price;
      // Fallback to top-level for gold/silver
      if (symbolUpper === 'GOLD' || symbolUpper === 'XAU') return livePrices.gold;
      if (symbolUpper === 'SILVER' || symbolUpper === 'XAG') return livePrices.silver;
      return undefined;
    }
    return undefined;
  };

  const handleSell = async (assetId: string, data: SellData) => {
    if (onSellAsset) {
      await onSellAsset(assetId, data);
      setSellDialogAsset(null);
    }
  };

  // Format asset value in native format (show what user entered)
  const formatNativeAssetValue = (asset: Asset): string => {
    // Banking: show original currency amount
    if (asset.category === 'banking' && asset.symbol && asset.quantity) {
      return `${getCurrencySymbol(asset.symbol)}${asset.quantity.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    
    // Crypto/Stocks: show quantity + symbol
    if ((asset.category === 'crypto' || asset.category === 'stocks') && asset.quantity && asset.symbol) {
      return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset.symbol}`;
    }
    
    // Commodities: show quantity + unit
    if (asset.category === 'commodities' && asset.quantity) {
      const unit = asset.unit || 'oz';
      return `${asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${unit}`;
    }
    
    // Fallback to formatted value in display unit
    return formatValue(asset.value);
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory =
        categoryFilter === 'all' || asset.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [assets, searchQuery, categoryFilter]);

  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => b.value - a.value);
  }, [filteredAssets]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <List className="w-4 h-4" />
          View All
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>All Assets ({assets.length})</DialogTitle>
        </DialogHeader>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="banking">Banking</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="stocks">Stocks</SelectItem>
              <SelectItem value="commodities">Commodities</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assets Table */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Value</TableHead>
                {(onUpdateAsset || onDeleteAsset || onSellAsset) && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={onUpdateAsset || onDeleteAsset || onSellAsset ? 6 : 5}
                    className="text-center text-muted-foreground py-8"
                  >
                    {searchQuery || categoryFilter !== 'all'
                      ? 'No assets match your filters'
                      : 'No assets added yet'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      {asset.symbol ? (
                        <span className="font-mono text-xs bg-secondary px-2 py-1 rounded">
                          {asset.symbol}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {categoryLabels[asset.category as AssetCategory] || asset.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      {asset.quantity ? (
                        <span className="font-mono text-sm">{asset.quantity}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNativeAssetValue(asset)}
                    </TableCell>
                    {(onUpdateAsset || onDeleteAsset || onSellAsset) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onUpdateAsset && (
                            <EditAssetDialog
                              asset={asset}
                              onUpdate={onUpdateAsset}
                              livePrices={livePrices}
                            />
                          )}
                          {onSellAsset && canSellAsset(asset) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                              onClick={() => setSellDialogAsset(asset)}
                              title="Sell asset"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          {onDeleteAsset && (
                            <DeleteConfirmDialog
                              itemName={asset.name}
                              itemType="asset"
                              onConfirm={() => onDeleteAsset(asset.id)}
                            />
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        {sortedAssets.length > 0 && (
          <div className="pt-4 border-t flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Showing {sortedAssets.length} of {assets.length} assets
            </span>
            <span className="font-medium">
              Total: <span className="font-mono">{formatValue(sortedAssets.reduce((sum, a) => sum + a.value, 0))}</span>
            </span>
          </div>
        )}
      </DialogContent>

      {/* Sell Asset Dialog */}
      <SellAssetDialog
        asset={sellDialogAsset}
        open={!!sellDialogAsset}
        onOpenChange={(open) => !open && setSellDialogAsset(null)}
        onSell={handleSell}
        currentPrice={sellDialogAsset ? getCurrentPrice(sellDialogAsset) : undefined}
      />
    </Dialog>
  );
}
