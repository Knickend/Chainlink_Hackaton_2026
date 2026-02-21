import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Clock, Globe, BarChart3, Zap } from 'lucide-react';
import chainlinkLogo from '@/assets/chainlink-logo.png';

const HOW_IT_WORKS = [
  { icon: Clock, title: 'CronCapability', desc: 'Triggers the workflow every hour on a schedule' },
  { icon: Globe, title: 'HTTPClient + Consensus', desc: 'Fetches strategies from the database across multiple nodes' },
  { icon: BarChart3, title: 'Chainlink Price Feeds', desc: 'Retrieves on-chain prices from price_cache (e.g. base:cbBTC/USD)' },
  { icon: Zap, title: 'Execute Order', desc: 'Calls execute-dca-order to trade via the agent wallet' },
];

const SDK_FEATURES = [
  { name: 'cre.Handler()', desc: 'Workflow entry point' },
  { name: 'CronCapability', desc: 'Time-based trigger' },
  { name: 'HTTPClient', desc: 'Consensus HTTP requests' },
  { name: 'runInNodeMode()', desc: 'Multi-node execution' },
  { name: 'consensusMedianAggregation()', desc: 'Data integrity' },
];

const SYMBOL_MAP = [
  { token: 'cbBTC', feed: 'base:cbBTC/USD' },
  { token: 'ETH', feed: 'base:ETH/USD' },
  { token: 'WETH', feed: 'base:ETH/USD' },
];

export function CREArchitectureCard() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-blue-500/30 bg-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={chainlinkLogo} alt="Chainlink" className="h-6 w-6" />
                <CardTitle className="text-lg">Chainlink CRE Architecture</CardTitle>
                <Badge variant="outline" className="text-xs">How It Works</Badge>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* How It Works */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pipeline</h3>
              <div className="grid gap-3">
                {HOW_IT_WORKS.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{i + 1}. {item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SDK Features */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">CRE SDK Features Used</h3>
              <div className="flex flex-wrap gap-2">
                {SDK_FEATURES.map((f) => (
                  <Badge key={f.name} variant="secondary" className="text-xs font-mono">
                    {f.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Symbol Mapping */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Chainlink Symbol Mapping</h3>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Token</th>
                      <th className="px-3 py-2 text-left font-medium">Chainlink Feed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYMBOL_MAP.map((row) => (
                      <tr key={row.token} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono font-medium">{row.token}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{row.feed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
