import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Clock, Link2, TrendingDown, Wallet, Cpu } from 'lucide-react';

const pipelineSteps = [
  { icon: Clock, label: 'Cron Trigger', desc: 'Every 5 min via CRE scheduler' },
  { icon: Cpu, label: 'Strategy Eval', desc: 'cre.Handler() evaluates active strategies' },
  { icon: Link2, label: 'Price Feed', desc: 'Chainlink on-chain oracle data' },
  { icon: TrendingDown, label: 'Dip Detection', desc: 'Compare vs last execution price' },
  { icon: Wallet, label: 'Execution', desc: 'CDP wallet swap on Base Sepolia' },
];

const architectureItems = [
  {
    id: 'cre-sdk',
    title: 'Chainlink CRE SDK',
    content:
      'Workflow orchestration using the cre.Handler() pattern. Each DCA strategy is evaluated as a workflow step with consensus aggregation — identical aggregation for string/JSON results, median aggregation for numeric price data.',
  },
  {
    id: 'price-feeds',
    title: 'Chainlink Price Feeds',
    content:
      'On-chain oracle data provides the baseline price for dip detection. The workflow reads the latest feed value and compares it against the token_price_usd recorded at the last successful execution.',
  },
  {
    id: 'cdp-wallet',
    title: 'Coinbase CDP Agent Wallet',
    content:
      'Non-custodial execution via Coinbase Developer Platform. The agent wallet holds USDC on Base Sepolia and executes swaps autonomously when the workflow triggers a buy signal.',
  },
  {
    id: 'dip-logic',
    title: 'Dip-Buying Logic',
    content:
      'Compares the current price against the last execution\'s token_price_usd. When the price drops below the user-defined dip_threshold_pct, the execution amount is multiplied by the dip_multiplier for opportunistic accumulation.',
  },
];

const techStack = [
  'Chainlink CRE',
  'Chainlink Data Feeds',
  'Base Sepolia',
  'USDC',
  'Coinbase CDP',
  'TypeScript',
];

export function CREArchitectureExplainer() {
  return (
    <Card className="glass-card mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          How <span className="gradient-text">Chainlink CRE</span> Powers DCA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pipeline visualization */}
        <div className="flex items-start gap-2 flex-wrap pb-2">
          {pipelineSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-primary/30 bg-primary/5 flex-1 min-w-[110px] text-center">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{step.desc}</span>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <span className="text-primary font-bold text-lg">→</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Architecture accordion */}
        <Accordion type="single" collapsible className="space-y-2">
          {architectureItems.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="rounded-lg border border-border/50 px-4"
            >
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-3">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Tech stack badges */}
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <Badge key={tech} variant="secondary" className="text-xs">
              {tech}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
