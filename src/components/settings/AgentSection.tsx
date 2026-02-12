import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Wallet, Send, ArrowLeftRight, Banknote, Shield, Activity, Loader2, CheckCircle2, XCircle, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAgentWallet } from '@/hooks/useAgentWallet';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const SKILLS = [
  { id: 'send-usdc', label: 'Send USDC', description: 'Transfer USDC to any address or ENS name on Base', icon: Send },
  { id: 'trade', label: 'Trade Tokens', description: 'Swap between tokens on Base (e.g. USDC ↔ ETH)', icon: ArrowLeftRight },
  { id: 'fund', label: 'Fund Wallet', description: 'Add funds via Coinbase Onramp', icon: Banknote },
];

export function AgentSection() {
  const {
    status,
    logs,
    isLoading,
    isActing,
    startAuth,
    verifyAuth,
    disconnect,
    updateSkills,
    updateLimits,
  } = useAgentWallet();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [perTxLimit, setPerTxLimit] = useState(String(status.spending_limit_per_tx));
  const [dailyLimit, setDailyLimit] = useState(String(status.spending_limit_daily));

  // Sync limits when status loads
  useState(() => {
    setPerTxLimit(String(status.spending_limit_per_tx));
    setDailyLimit(String(status.spending_limit_daily));
  });

  const handleStartAuth = async () => {
    await startAuth(email);
    setOtpSent(true);
  };

  const handleVerify = async () => {
    await verifyAuth(email, otp);
    setOtpSent(false);
    setOtp('');
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
            </CardTitle>
            <CardDescription>
              Connect your Coinbase Agentic Wallet to enable DeFi skills
            </CardDescription>
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
                    <span className="text-sm font-mono truncate max-w-[200px]">{status.wallet_address}</span>
                  </div>
                  {status.balance !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className="text-sm font-semibold">${status.balance} USDC</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={disconnect} disabled={isActing}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect Wallet
                </Button>
              </div>
            ) : otpSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <div className="flex gap-2">
                  <Button onClick={handleVerify} disabled={otp.length !== 6 || isActing}>
                    {isActing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify
                  </Button>
                  <Button variant="ghost" onClick={() => setOtpSent(false)}>Back</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wallet-email">Coinbase Email</Label>
                  <Input
                    id="wallet-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button onClick={handleStartAuth} disabled={!email || isActing}>
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

      {/* Activity Log */}
      {status.connected && logs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Log
              </CardTitle>
              <CardDescription>Recent agent actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm">
                    <div className="flex items-center gap-3">
                      {log.status === 'executed' ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : log.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium capitalize">{log.action_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.params?.amount && `$${log.params.amount}`}
                          {log.params?.recipient && ` → ${log.params.recipient}`}
                          {log.params?.from_token && log.params?.to_token && ` ${log.params.from_token} → ${log.params.to_token}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
