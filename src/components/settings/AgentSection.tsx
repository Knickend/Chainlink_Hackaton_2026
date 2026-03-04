import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Wallet, Send, ArrowLeftRight, Banknote, Shield, Loader2, LogOut, Copy, Check, Bell, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { Skeleton } from '@/components/ui/skeleton';
import { PrivacyVaultSection } from './PrivacyVaultSection';
import { AgentActivityLog } from './AgentActivityLog';

const SKILLS = [
  { id: 'send-usdc', label: 'Send USDC', description: 'Transfer USDC to any address or ENS name on Base', icon: Send },
  { id: 'trade', label: 'Trade Tokens', description: 'Swap between tokens on Base (e.g. USDC ↔ ETH)', icon: ArrowLeftRight },
  { id: 'fund', label: 'Fund Wallet', description: 'Add funds via Coinbase Onramp', icon: Banknote },
  { id: 'privacy-address', label: 'Shielded Address', description: 'Generate privacy-preserving addresses via Chainlink ACE', icon: Shield },
  { id: 'privacy-transfer', label: 'Private Transfer', description: 'Send tokens privately through the ACE Privacy Vault', icon: Shield },
];

export function AgentSection() {
  const {
    status,
    logs,
    isLoading,
    isActing,
    connectWallet,
    disconnect,
    updateSkills,
    updateLimits,
    updateNotifications,
    refetch,
  } = useAgentWallet();

  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [perTxLimit, setPerTxLimit] = useState(String(status.spending_limit_per_tx));
  const [dailyLimit, setDailyLimit] = useState(String(status.spending_limit_daily));

  // Sync limits when status loads
  useState(() => {
    setPerTxLimit(String(status.spending_limit_per_tx));
    setDailyLimit(String(status.spending_limit_daily));
  });

  const handleConnect = async () => {
    await connectWallet(email);
  };

  const toggleSkill = (skillId: string) => {
    const current = status.enabled_skills;
    const next = current.includes(skillId)
      ? current.filter(s => s !== skillId)
      : [...current, skillId];
    updateSkills(next);
  };

  const handleSaveLimits = () => {
    updateLimits(Number(perTxLimit), Number(dailyLimit));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const dailyUsagePercent = status.spending_limit_daily > 0
    ? Math.min(100, (status.daily_spent / status.spending_limit_daily) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Wallet Connection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Agentic Wallet
              {status.connected && <Badge variant="secondary">Connected</Badge>}
              {status.connected && <Badge variant="outline" className="text-xs">Base Sepolia</Badge>}
            </CardTitle>
            <div className="flex items-center justify-between">
              <CardDescription>
                Connect your Coinbase Agentic Wallet to enable DeFi skills
              </CardDescription>
              {status.connected && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {status.connected ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-card/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-mono">{status.wallet_email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Address</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono break-all">{status.wallet_address}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(status.wallet_address || '');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                  {status.token_balances.length > 0 ? (
                    <div className="space-y-1">
                      {status.token_balances.map((token) => {
                        const stablecoins = ['USDC', 'USDT', 'DAI'];
                        const ethLike = ['ETH', 'WETH'];
                        const decimals = stablecoins.includes(token.symbol) ? 2 : ethLike.includes(token.symbol) ? 6 : 4;
                        const formatted = token.amount.toFixed(decimals);
                        const prefix = stablecoins.includes(token.symbol) ? '$' : '';
                        const suffix = stablecoins.includes(token.symbol) ? '' : ` ${token.symbol}`;
                        return (
                          <div key={token.symbol + token.contractAddress} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{token.symbol}</span>
                            <span className="text-sm font-semibold">{prefix}{formatted}{suffix}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (status.balance !== null || status.eth_balance !== null) && (
                    <div className="space-y-1">
                      {status.balance !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">USDC</span>
                          <span className="text-sm font-semibold">${status.balance}</span>
                        </div>
                      )}
                      {status.eth_balance !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">ETH</span>
                          <span className="text-sm font-semibold">{status.eth_balance} ETH</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={disconnect} disabled={isActing}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect Wallet
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your email to create a CDP wallet. A server-managed EVM account will be provisioned on Base instantly.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="wallet-email">Email</Label>
                  <Input
                    id="wallet-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button onClick={handleConnect} disabled={!email || isActing}>
                  {isActing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
                  Connect Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Skills */}
      {status.connected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Agent Skills
              </CardTitle>
              <CardDescription>
                Enable or disable which actions the AI agent can execute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SKILLS.map((skill) => {
                const Icon = skill.icon;
                const enabled = status.enabled_skills.includes(skill.id);
                return (
                  <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${enabled ? 'bg-primary/10' : 'bg-muted/50'}`}>
                        <Icon className={`w-4 h-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{skill.label}</p>
                        <p className="text-xs text-muted-foreground">{skill.description}</p>
                      </div>
                    </div>
                    <Switch checked={enabled} onCheckedChange={() => toggleSkill(skill.id)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Spending Limits */}
      {status.connected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Spending Limits
              </CardTitle>
              <CardDescription>
                Set guardrails for agent transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="per-tx">Per Transaction (USDC)</Label>
                  <Input
                    id="per-tx"
                    type="number"
                    value={perTxLimit}
                    onChange={(e) => setPerTxLimit(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily">Daily Limit (USDC)</Label>
                  <Input
                    id="daily"
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Daily usage</span>
                  <span>${status.daily_spent} / ${status.spending_limit_daily}</span>
                </div>
                <Progress value={dailyUsagePercent} className="h-2" />
              </div>

              <Button size="sm" onClick={handleSaveLimits}>Save Limits</Button>
            </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Notifications */}
      {status.connected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Get notified when transactions are executed from your wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${status.notify_transactions ? 'bg-primary/10' : 'bg-muted/50'}`}>
                    <Bell className={`w-4 h-4 ${status.notify_transactions ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email notifications</p>
                    <p className="text-xs text-muted-foreground">Receive an email when sends, trades, or funding occur</p>
                  </div>
                </div>
                <Switch
                  checked={status.notify_transactions}
                  onCheckedChange={(checked) => updateNotifications(checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Activity Log */}
      {status.connected && logs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <AgentActivityLog logs={logs} />
        </motion.div>
      )}

      {/* Privacy Vault */}
      {status.connected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <PrivacyVaultSection />
        </motion.div>
      )}
    </div>
  );
}
