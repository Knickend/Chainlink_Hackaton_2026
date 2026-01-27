import { motion } from 'framer-motion';
import { Landmark, Bitcoin, TrendingUp, Gem, LucideIcon } from 'lucide-react';
import { AssetCategory, Asset } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EditAssetDialog } from './EditAssetDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { LivePrices } from '@/hooks/useLivePrices';

interface AssetCategoryCardProps {
  category: AssetCategory;
  assets: Asset[];
  total: string;
  percentage: number;
  formatValue: (value: number) => string;
  onUpdateAsset?: (id: string, data: Partial<Omit<Asset, 'id'>>) => void;
  onDeleteAsset?: (id: string) => void;
  livePrices?: LivePrices;
  delay?: number;
}

const categoryConfig: Record<AssetCategory, { icon: LucideIcon; label: string; color: string }> = {
  banking: { icon: Landmark, label: 'Banking', color: 'text-blue-400' },
  crypto: { icon: Bitcoin, label: 'Crypto', color: 'text-bitcoin' },
  stocks: { icon: TrendingUp, label: 'Stocks', color: 'text-success' },
  metals: { icon: Gem, label: 'Precious Metals', color: 'text-gold' },
};

export function AssetCategoryCard({
  category,
  assets,
  total,
  percentage,
  formatValue,
  onUpdateAsset,
  onDeleteAsset,
  livePrices,
  delay = 0,
}: AssetCategoryCardProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

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

      <div className="space-y-2">
        {assets.slice(0, 3).map((asset) => (
          <div
            key={asset.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 group"
          >
            <div className="flex items-center gap-2">
              {asset.symbol && (
                <span className="text-xs font-mono text-muted-foreground">{asset.symbol}</span>
              )}
              <span className="text-sm">{asset.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{formatValue(asset.value)}</span>
              {onUpdateAsset && (
                <EditAssetDialog asset={asset} onUpdate={onUpdateAsset} livePrices={livePrices} />
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
        ))}
        {assets.length > 3 && (
          <p className="text-xs text-center text-muted-foreground pt-1">
            +{assets.length - 3} more assets
          </p>
        )}
      </div>

      <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            backgroundColor: category === 'banking' ? 'hsl(217, 91%, 60%)' :
                            category === 'crypto' ? 'hsl(var(--bitcoin))' :
                            category === 'stocks' ? 'hsl(var(--success))' :
                            'hsl(var(--gold))'
          }}
        />
      </div>
    </motion.div>
  );
}