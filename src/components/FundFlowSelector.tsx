import { useState } from 'react';
import { ArrowRight, Link2, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Asset, FundFlowMode, BANKING_CURRENCIES, getCurrencySymbol } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FundFlowSelectorProps {
  type: 'source' | 'destination';
  assets: Asset[];
  mode: FundFlowMode;
  onModeChange: (mode: FundFlowMode) => void;
  // Linked mode
  selectedAssetId?: string;
  onAssetSelect: (assetId: string | undefined) => void;
  // Manual mode
  label?: string;
  onLabelChange: (label: string) => void;
  // Common
  currency?: string;
  onCurrencyChange: (currency: string) => void;
  amount?: number;
  onAmountChange: (amount: number | undefined) => void;
  // Context
  transactionAmount: number;
  excludeAssetId?: string; // Prevent circular reference
  disabled?: boolean;
}

export function FundFlowSelector({
  type,
  assets,
  mode,
  onModeChange,
  selectedAssetId,
  onAssetSelect,
  label,
  onLabelChange,
  currency,
  onCurrencyChange,
  amount,
  onAmountChange,
  transactionAmount,
  excludeAssetId,
  disabled,
}: FundFlowSelectorProps) {
  const [isOpen, setIsOpen] = useState(mode !== 'none');

  const title = type === 'source' ? 'Source of Funds' : 'Destination for Proceeds';
  const subtitle = type === 'source' 
    ? 'Where are the funds coming from?' 
    : 'Where will the proceeds go?';

  // Filter out the current asset being traded and group by category
  const availableAssets = assets.filter(a => a.id !== excludeAssetId);
  
  const groupedAssets = availableAssets.reduce((acc, asset) => {
    const category = asset.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const categoryLabels: Record<string, string> = {
    banking: 'Banking',
    crypto: 'Cryptocurrency',
    stocks: 'Stocks & ETFs',
    commodities: 'Commodities',
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  // Validate balance for source in linked mode
  const insufficientBalance = type === 'source' && 
    mode === 'linked' && 
    selectedAsset && 
    amount !== undefined && 
    (selectedAsset.quantity || 0) < amount;

  const handleModeChange = (newMode: FundFlowMode) => {
    onModeChange(newMode);
    if (newMode === 'none') {
      onAssetSelect(undefined);
      onLabelChange('');
      onAmountChange(undefined);
    }
  };

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    if (!open && mode !== 'none') {
      // Don't close if user has already set something
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className={cn(
            "w-full justify-between p-3 h-auto border border-dashed hover:border-primary/50 hover:bg-secondary/30",
            isOpen && "border-primary/30 bg-secondary/20"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 text-left">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 space-y-3">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={mode === 'linked' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('linked')}
            className="gap-1.5 flex-1"
          >
            <Link2 className="w-3.5 h-3.5" />
            Linked (auto-update)
          </Button>
          <Button
            type="button"
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('manual')}
            className="gap-1.5 flex-1"
          >
            <FileText className="w-3.5 h-3.5" />
            Manual (text only)
          </Button>
        </div>

        {/* Linked Mode */}
        {mode === 'linked' && (
          <div className="space-y-3 p-3 border border-border/50 rounded-lg bg-secondary/10">
            <div className="space-y-2">
              <Label className="text-sm">Select Asset</Label>
              <Select
                value={selectedAssetId || ''}
                onValueChange={(value) => {
                  onAssetSelect(value || undefined);
                  // Auto-set currency from selected asset
                  const asset = assets.find(a => a.id === value);
                  if (asset) {
                    const assetCurrency = asset.category === 'banking' 
                      ? (asset.symbol || 'USD') 
                      : 'USD';
                    onCurrencyChange(assetCurrency);
                    // Auto-calculate amount based on transaction
                    if (transactionAmount > 0) {
                      onAmountChange(transactionAmount);
                    }
                  }
                }}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Choose an asset..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedAssets).map(([category, categoryAssets]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {categoryLabels[category] || category}
                      </div>
                      {categoryAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          <div className="flex items-center justify-between gap-4">
                            <span>{asset.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {asset.quantity?.toLocaleString(undefined, { maximumFractionDigits: 4 })} {asset.symbol}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAsset && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount ?? ''}
                    onChange={(e) => onAmountChange(parseFloat(e.target.value) || undefined)}
                    className={cn("bg-secondary/50", insufficientBalance && "border-destructive")}
                    placeholder={`Max: ${selectedAsset.quantity?.toLocaleString() || 0}`}
                  />
                  {insufficientBalance && (
                    <p className="text-xs text-destructive">
                      Insufficient balance (available: {selectedAsset.quantity?.toLocaleString() || 0})
                    </p>
                  )}
                </div>

                {/* Preview */}
                <div className="p-2 rounded bg-secondary/30 text-sm">
                  <p className="text-muted-foreground text-xs mb-1">
                    {type === 'source' ? 'Will deduct from:' : 'Will add to:'}
                  </p>
                  <p className="font-medium">
                    {type === 'source' ? '-' : '+'}{amount?.toLocaleString() || 0} {selectedAsset.symbol} {type === 'source' ? 'from' : 'to'} {selectedAsset.name}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <div className="space-y-3 p-3 border border-border/50 rounded-lg bg-secondary/10">
            <div className="space-y-2">
              <Label className="text-sm">{type === 'source' ? 'Source Label' : 'Destination Label'}</Label>
              <Input
                value={label || ''}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder={type === 'source' ? 'e.g., Kraken EUR Wallet' : 'e.g., Chase Checking'}
                className="bg-secondary/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount ?? ''}
                  onChange={(e) => onAmountChange(parseFloat(e.target.value) || undefined)}
                  className="bg-secondary/50"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Currency</Label>
                <Select value={currency || 'USD'} onValueChange={onCurrencyChange}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKING_CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.symbol} {curr.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              ℹ️ Manual mode records the {type} for reference only. No automatic balance updates.
            </p>
          </div>
        )}

        {/* Clear Button */}
        {mode !== 'none' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleModeChange('none')}
            className="w-full text-muted-foreground"
          >
            Clear {type} selection
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
