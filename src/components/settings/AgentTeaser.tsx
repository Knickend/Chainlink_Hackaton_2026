import { Bot, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AgentTeaserProps {
  onUpgrade: () => void;
}

export function AgentTeaser({ onUpgrade }: AgentTeaserProps) {
  return (
    <Card className="glass-card relative overflow-hidden">
      {/* Blurred preview */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10 flex flex-col items-center justify-center gap-4 p-8">
        <div className="p-3 rounded-full bg-primary/10">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold">Agent Skills — Pro Feature</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Authorize an AI agent to execute DeFi actions on your behalf — send USDC, trade tokens, and fund your wallet on the Base network.
          </p>
        </div>
        <Button onClick={onUpgrade} className="mt-2">
          Upgrade to Pro
        </Button>
      </div>

      {/* Background preview content (blurred) */}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Agentic Wallet
          <Badge variant="secondary">Pro</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-12 bg-muted/30 rounded-lg" />
        <div className="h-24 bg-muted/30 rounded-lg" />
        <div className="h-16 bg-muted/30 rounded-lg" />
      </CardContent>
    </Card>
  );
}
