import { useState, useMemo } from 'react';
import { Search, Filter, List } from 'lucide-react';
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
import { Asset, AssetCategory } from '@/lib/types';
import { EditAssetDialog } from './EditAssetDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { LivePrices } from '@/hooks/useLivePrices';

interface ViewAllAssetsDialogProps {
  assets: Asset[];
  formatValue: (value: number) => string;
  onUpdateAsset?: (id: string, data: Partial<Omit<Asset, 'id'>>) => void;
  onDeleteAsset?: (id: string) => void;
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
  livePrices,
}: ViewAllAssetsDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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
                {(onUpdateAsset || onDeleteAsset) && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={onUpdateAsset || onDeleteAsset ? 6 : 5}
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
                      {formatValue(asset.value)}
                    </TableCell>
                    {(onUpdateAsset || onDeleteAsset) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onUpdateAsset && (
                            <EditAssetDialog
                              asset={asset}
                              onUpdate={onUpdateAsset}
                              livePrices={livePrices}
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
    </Dialog>
  );
}
