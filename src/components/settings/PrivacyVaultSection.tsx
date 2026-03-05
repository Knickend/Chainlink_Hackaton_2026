import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Copy, Check, Loader2, Eye, Send, RefreshCw, ExternalLink, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertTriangle, Clock, ChevronDown, ArrowRight, Info, Wallet, BookOpen, SendHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COMMON_TOKENS = [
  { label: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
  { label: 'LINK', address: '0x779877A7B0D9E8603169DdbD7836e478b4624789' },
  { label: 'WETH', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' },
  { label: 'SepoliaETH', address: '0x0000000000000000000000000000000000000000' },
] as const;

const ERC20_TOKENS_TO_CHECK = [
  { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 },
  { symbol: 'LINK', address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', decimals: 18 },
  { symbol: 'WETH', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', decimals: 18 },
] as const;

const TOKEN_DECIMALS: Record<string, { symbol: string; decimals: number }> = {
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': { symbol: 'USDC', decimals: 6 },
  '0x779877A7B0D9E8603169DdbD7836e478b4624789': { symbol: 'LINK', decimals: 18 },
  '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9': { symbol: 'WETH', decimals: 18 },
  '0x0000000000000000000000000000000000000000': { symbol: 'SepoliaETH', decimals: 18 },
};

interface ActivityLogEntry {
  id: string;
  action_type: string;
  status: string;
  created_at: string;
  result: Record<string, any> | null;
  params: Record<string, any>;
}
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ShieldedAddress {
  id: string;
  shielded_address: string;
  label: string | null;
  created_at: string;
}

interface PrivacyBalance {
  token: string;
  amount: number;
}

export function PrivacyVaultSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<ShieldedAddress[]>([]);
  const [balances, setBalances] = useState<PrivacyBalance[]>([]);
  const [onchainBalances, setOnchainBalances] = useState<Record<string, number>>({});
  const [onchainTokenBalances, setOnchainTokenBalances] = useState<Record<string, { symbol: string; amount: number }[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositToken, setDepositToken] = useState('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
  const [depositResult, setDepositResult] = useState<Record<string, any> | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [howOpen, setHowOpen] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawToken, setWithdrawToken] = useState('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
  const [withdrawRecipient, setWithdrawRecipient] = useState('');
  const [withdrawResult, setWithdrawResult] = useState<Record<string, any> | null>(null);
  const [onboardStatus, setOnboardStatus] = useState<'loading' | 'onboarded' | 'not-onboarded' | 'error'>('loading');

  // Transfer form
  const [fromAddress, setFromAddress] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferToken, setTransferToken] = useState('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');

  const maxAmount = (() => {
    if (!fromAddress) return 0;
    if (transferToken === '0x0000000000000000000000000000000000000000') {
      return onchainBalances[fromAddress] ?? 0;
    }
    const tok = ERC20_TOKENS_TO_CHECK.find(t => t.address === transferToken);
    if (!tok) return 0;
    const entry = onchainTokenBalances[fromAddress]?.find(b => b.symbol === tok.symbol);
    return entry?.amount ?? 0;
  })();

  const invokePrivacy = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('privacy-vault', {
      body: { action, ...params },
    });
    if (error) throw new Error(error.message || 'Privacy vault error');
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const checkOnboardStatus = useCallback(async () => {
    if (!user) return;
    try {
      const data = await invokePrivacy('onboard-status');
      setOnboardStatus(data.onboarded ? 'onboarded' : 'not-onboarded');
    } catch {
      setOnboardStatus('error');
    }
  }, [user, invokePrivacy]);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    try {
      const data = await invokePrivacy('list-addresses');
      const addrs = data.addresses || [];
      setAddresses(addrs);
      const ethMap: Record<string, number> = {};
      const tokenMap: Record<string, { symbol: string; amount: number }[]> = {};
      await Promise.all(
        addrs.map(async (a: ShieldedAddress) => {
          const addr = a.shielded_address;
          try {
            const res = await invokePrivacy('onchain-balance', { address: addr });
            ethMap[addr] = res.balance_eth ?? 0;
          } catch { /* ignore */ }
          const tokens: { symbol: string; amount: number }[] = [];
          await Promise.all(
            ERC20_TOKENS_TO_CHECK.map(async (tok) => {
              try {
                const res = await invokePrivacy('onchain-erc20-balance', { address: addr, token: tok.address, decimals: tok.decimals });
                if (res.balance > 0) {
                  tokens.push({ symbol: tok.symbol, amount: res.balance });
                }
              } catch { /* ignore */ }
            })
          );
          tokenMap[addr] = tokens;
        })
      );
      setOnchainBalances(ethMap);
      setOnchainTokenBalances(tokenMap);
    } catch (err) {
      console.error('Failed to fetch shielded addresses:', err);
    }
  }, [user, invokePrivacy]);

  const fetchActivityLog = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('agent_actions_log')
        .select('id, action_type, status, created_at, result, params')
        .eq('user_id', user.id)
        .in('action_type', ['privacy-vault-deposit', 'privacy-vault-transfer', 'privacy-withdraw', 'deposit', 'private-transfer', 'withdraw', 'privacy-deposit', 'privacy-deposit-info', 'auto-deploy-policy-engine', 'auto-register-token'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) {
        setActivityLog(data as unknown as ActivityLogEntry[]);
      }
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
    }
  }, [user]);

  const fetchBalances = useCallback(async () => {
    if (!user) return;
    try {
      const data = await invokePrivacy('balances');
      const raw = data.balances;
      const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.balances) ? raw.balances : [];
      setBalances(arr);
    } catch (err) {
      console.error('Failed to fetch privacy balances:', err);
    }
  }, [user, invokePrivacy]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshBalances = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchBalances(), fetchAddresses(), checkOnboardStatus(), fetchActivityLog()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchAddresses(), fetchBalances(), checkOnboardStatus(), fetchActivityLog()]).finally(() => setIsLoading(false));
  }, [fetchAddresses, fetchBalances, checkOnboardStatus, fetchActivityLog]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await invokePrivacy('generate-shielded-address', { label: newLabel || undefined });
      toast({ title: 'Shielded Address Generated', description: `Address: ${result.shielded_address?.slice(0, 16)}…` });
      setNewLabel('');
      await fetchAddresses();
    } catch (err) {
      toast({ title: 'Generation Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) return;
    setIsSending(true);
    try {
      await invokePrivacy('private-transfer', {
        recipient: transferTo,
        amount: Number(transferAmount),
        token: transferToken,
      });
      toast({ title: 'Private Transfer Sent', description: `Sent ${transferAmount} tokens privately` });
      setTransferTo('');
      setTransferAmount('');
      setShowTransfer(false);
      await fetchBalances();
    } catch (err) {
      toast({ title: 'Transfer Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    setIsWithdrawing(true);
    setWithdrawResult(null);
    try {
      const result = await invokePrivacy('withdraw', {
        amount: Number(withdrawAmount),
        token: withdrawToken,
        recipient: withdrawRecipient || undefined,
      });
      setWithdrawResult(result);
      toast({ title: 'Withdrawal Initiated', description: withdrawRecipient ? 'Tokens sent to your specified address.' : 'Tokens are being moved back on-chain.' });
      setWithdrawAmount('');
      await Promise.all([fetchBalances(), checkOnboardStatus()]);
    } catch (err) {
      toast({ title: 'Withdrawal Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid deposit amount.', variant: 'destructive' });
      return;
    }
    setIsDepositing(true);
    setDepositResult(null);
    try {
      const result = await invokePrivacy('deposit', {
        token: depositToken,
        amount: Number(depositAmount),
      });
      setDepositResult(result);
      const tokenLabel = COMMON_TOKENS.find(t => t.address === depositToken)?.label ?? 'tokens';
      toast({ title: 'Deposit Successful', description: `Deposited ${depositAmount} ${tokenLabel} into the Privacy Vault.` });
      setDepositAmount('');
      await Promise.all([fetchBalances(), fetchAddresses(), checkOnboardStatus(), fetchActivityLog()]);
    } catch (err) {
      toast({ title: 'Deposit Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsDepositing(false);
    }
  };


  const copyAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Privacy Vault Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                ACE Privacy Vault
              </CardTitle>
              <div className="flex items-center gap-2">
                {onboardStatus === 'loading' ? (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking…
                  </Badge>
                ) : onboardStatus === 'onboarded' ? (
                  <Badge className="text-xs gap-1 bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/30">
                    <CheckCircle2 className="w-3 h-3" /> Account Registered
                  </Badge>
                ) : onboardStatus === 'not-onboarded' ? (
                  <Badge className="text-xs gap-1 bg-amber-600/20 text-amber-400 border-amber-600/30 hover:bg-amber-600/30">
                    <AlertTriangle className="w-3 h-3" /> Not Onboarded
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-xs">
                  Ethereum Sepolia
                </Badge>
              </div>
            </div>
            <CardDescription>
              Privacy-preserving token operations via Chainlink ACE. Protocol liquidity is pooled in the vault — the executor wallet signs transactions on behalf of users, not as a custodian.
            </CardDescription>
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 leading-relaxed">
              The executor wallet (0x8E6B…) holds protocol liquidity and signs transactions. Your balance is tracked in the vault's private ledger, not as a direct on-chain balance in the executor wallet.
            </p>
            {onboardStatus === 'not-onboarded' && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ Your account is not yet registered with the Convergence protocol. Deposit ERC-20 tokens below to onboard and enable private transfers.
              </p>
            )}
          </CardHeader>
        </Card>
      </motion.div>

      {/* How It Works */}
      <Collapsible open={howOpen} onOpenChange={setHowOpen}>
        <Card className="glass-card border-primary/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">How It Works</CardTitle>
                  <Badge variant="outline" className="text-xs">3 steps</Badge>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${howOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
                {[
                  { step: 1, icon: Shield, title: 'Generate Address', desc: 'Create a shielded address for receiving tokens privately' },
                  { step: 2, icon: ArrowDownToLine, title: 'Send & Deposit', desc: 'Protocol executor deposits from pooled liquidity into the vault on your behalf via approve + deposit' },
                  { step: 3, icon: SendHorizontal, title: 'Transfer or Withdraw', desc: 'Send privately or withdraw to any address' },
                ].map((item, i) => (
                  <div key={item.step} className="flex flex-col sm:flex-row items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5 text-center w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Step {item.step}</Badge>
                      <span className="text-sm font-semibold">{item.title}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight">{item.desc}</span>
                    </div>
                    {i < 2 && (
                      <ArrowRight className="w-4 h-4 text-primary shrink-0 rotate-90 sm:rotate-0 my-1 sm:my-0 sm:mx-2" />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Shielded addresses are <strong className="text-foreground">receive-only</strong> — you cannot send from them</span>
                </p>
                <p className="flex items-start gap-2">
                  <Wallet className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>All signing happens <strong className="text-foreground">server-side</strong> — no MetaMask or external wallet needed</span>
                </p>
                <p className="flex items-start gap-2">
                  <SendHorizontal className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Private transfers happen off-chain via <strong className="text-foreground">EIP-712 signatures</strong> — no visible on-chain transaction</span>
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Generate Shielded Address */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Generate Shielded Address
            </CardTitle>
            <CardDescription>
              Create a new privacy-preserving receiving address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="address-label">Label (optional)</Label>
              <Input
                id="address-label"
                placeholder="e.g. DCA Vault, Savings"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
              Generate Address
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Shielded Addresses */}
      {addresses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Your Shielded Addresses
              </CardTitle>
              <CardDescription>{addresses.length} address{addresses.length !== 1 ? 'es' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="min-w-0 flex-1">
                    {addr.label && (
                      <p className="text-sm font-medium">{addr.label}</p>
                    )}
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {addr.shielded_address}
                    </p>
                    {onchainBalances[addr.shielded_address] !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pending inbound: {onchainBalances[addr.shielded_address].toFixed(6)} SepoliaETH
                      </p>
                    )}
                     {onchainTokenBalances[addr.shielded_address]?.map((tok, i) => (
                       <div key={i} className="flex items-center gap-2 mt-1">
                         <p className="text-xs text-muted-foreground">
                            Pending inbound: {tok.amount.toFixed(6)} {tok.symbol}
                          </p>
                        </div>
                      ))}
                   </div>
                   <div className="flex items-center gap-1 shrink-0 ml-2">
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-8 w-8"
                       onClick={() => copyAddress(addr.shielded_address, addr.id)}
                     >
                       {copiedId === addr.id ? (
                         <Check className="w-3.5 h-3.5 text-primary" />
                       ) : (
                         <Copy className="w-3.5 h-3.5" />
                       )}
                     </Button>
                     <a
                       href={`https://sepolia.etherscan.io/address/${addr.shielded_address}`}
                       target="_blank"
                       rel="noopener noreferrer"
                     >
                       <Button variant="ghost" size="icon" className="h-8 w-8">
                         <ExternalLink className="w-3.5 h-3.5" />
                       </Button>
                     </a>
                   </div>
                 </div>
               ))}
             </CardContent>
           </Card>
         </motion.div>
       )}

      {/* Privacy Balances */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Privacy Vault Balances</CardTitle>
                <CardDescription>Balances inside your privacy vault on Ethereum Sepolia</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefreshBalances} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : balances.length > 0 ? (
              <div className="space-y-2">
                {balances.map((b, i) => {
                  const tokenKey = Object.keys(TOKEN_DECIMALS).find(k => k.toLowerCase() === b.token.toLowerCase());
                  const tokenInfo = tokenKey ? TOKEN_DECIMALS[tokenKey] : null;
                  const symbol = tokenInfo?.symbol ?? `${b.token.slice(0, 6)}…${b.token.slice(-4)}`;
                  const decimals = tokenInfo?.decimals ?? 18;
                  const formatted = (Number(b.amount) / Math.pow(10, decimals)).toFixed(6);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm text-muted-foreground">{symbol}</span>
                      <span className="text-sm font-semibold">{formatted} {symbol}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No balances found. Deposit tokens to the Privacy Vault to get started.</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              ℹ️ <strong>Vault balances</strong> reflect the Privacy Vault's internal ledger. Protocol liquidity in the executor wallet is pooled across all users — individual user balances are tracked off-chain in the database. <strong>On-chain balances</strong> (shown per shielded address above) include native ETH sent directly on-chain.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Deposit — Direct Deposit to Vault */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4" />
              Deposit to Privacy Vault
            </CardTitle>
            <CardDescription>Protocol liquidity backs all deposits. The executor wallet signs approve + deposit transactions on your behalf.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="deposit-token">Token</Label>
                <Select value={depositToken} onValueChange={setDepositToken}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TOKENS.filter(t => t.address !== '0x0000000000000000000000000000000000000000').map((t) => (
                      <SelectItem key={t.address} value={t.address}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Amount</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              {isDepositing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg border border-border bg-muted/30">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing deposit… This may take up to 90 seconds (approve + deposit).
                </div>
              )}
              {depositResult && (
                <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Deposit Complete
                  </p>
                  {depositResult.approveTxHash && (
                    <p className="text-xs text-muted-foreground">
                      Approve tx:{' '}
                      <a href={`https://sepolia.etherscan.io/tx/${depositResult.approveTxHash}`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono">
                        {depositResult.approveTxHash.slice(0, 10)}…
                      </a>
                    </p>
                  )}
                  {depositResult.depositTxHash && (
                    <p className="text-xs text-muted-foreground">
                      Deposit tx:{' '}
                      <a href={`https://sepolia.etherscan.io/tx/${depositResult.depositTxHash}`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono">
                        {depositResult.depositTxHash.slice(0, 10)}…
                      </a>
                    </p>
                  )}
                </div>
              )}
              <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount} size="sm">
                {isDepositing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
                Deposit to Vault
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Withdraw from Privacy Vault */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4" />
              Withdraw from Privacy Vault
            </CardTitle>
            <CardDescription>Move tokens from your vault balance to any wallet address</CardDescription>
          </CardHeader>
          <CardContent>
            {!showWithdraw ? (
              <Button variant="outline" size="sm" onClick={() => setShowWithdraw(true)}>
                <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw Tokens
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-token">Token</Label>
                  <Select value={withdrawToken} onValueChange={setWithdrawToken}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TOKENS.map((t) => (
                        <SelectItem key={t.address} value={t.address}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={balances.length === 0}
                      onClick={() => {
                        const match = balances.find(b => b.token.toLowerCase() === withdrawToken.toLowerCase());
                        if (match) {
                          const tokenKey = Object.keys(TOKEN_DECIMALS).find(k => k.toLowerCase() === match.token.toLowerCase());
                          const decimals = tokenKey ? TOKEN_DECIMALS[tokenKey].decimals : 18;
                          const formatted = Number(match.amount) / Math.pow(10, decimals);
                          setWithdrawAmount(String(formatted));
                        }
                      }}
                    >
                      Max
                    </Button>
                  </div>
                  {(() => {
                    const match = balances.find(b => b.token.toLowerCase() === withdrawToken.toLowerCase());
                    if (match) {
                      const tokenKey = Object.keys(TOKEN_DECIMALS).find(k => k.toLowerCase() === match.token.toLowerCase());
                      const decimals = tokenKey ? TOKEN_DECIMALS[tokenKey].decimals : 18;
                      const symbol = tokenKey ? TOKEN_DECIMALS[tokenKey].symbol : 'tokens';
                      const formatted = (Number(match.amount) / Math.pow(10, decimals)).toFixed(6);
                      return <p className="text-xs text-muted-foreground">Available: {formatted} {symbol}</p>;
                    }
                    return <p className="text-xs text-muted-foreground">No vault balance for this token</p>;
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-recipient">Recipient Address</Label>
                  <Input
                    id="withdraw-recipient"
                    placeholder="0x... (address to receive withdrawn tokens)"
                    value={withdrawRecipient}
                    onChange={(e) => setWithdrawRecipient(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the wallet address where you want to receive the withdrawn tokens.
                  </p>
                </div>
                {isWithdrawing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg border border-border bg-muted/30">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing withdrawal… This may take a moment.
                  </div>
                )}
                {withdrawResult && (
                  <div className="space-y-2 p-3 rounded-lg border border-emerald-600/30 bg-emerald-600/10">
                    <p className="text-xs font-semibold text-emerald-400">✅ Withdrawal submitted</p>
                    {withdrawResult.transaction_id && (
                      <p className="text-xs text-muted-foreground">
                        Transaction ID: <span className="font-mono text-foreground">{withdrawResult.transaction_id}</span>
                      </p>
                    )}
                    {withdrawResult.withdraw_tx && (
                      <p className="text-xs text-muted-foreground">
                        TX:{' '}
                        <a href={`https://sepolia.etherscan.io/tx/${withdrawResult.withdraw_tx}`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono">
                          {withdrawResult.withdraw_tx.slice(0, 10)}…{withdrawResult.withdraw_tx.slice(-8)}
                        </a>
                      </p>
                     )}
                    {withdrawResult.forward_tx && (
                      <p className="text-xs text-muted-foreground">
                        Forward TX:{' '}
                        <a href={`https://sepolia.etherscan.io/tx/${withdrawResult.forward_tx}`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono">
                          {withdrawResult.forward_tx.slice(0, 10)}…{withdrawResult.forward_tx.slice(-8)}
                        </a>
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleWithdraw} disabled={isWithdrawing || !withdrawAmount || !withdrawRecipient} size="sm">
                    {isWithdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
                    Withdraw
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowWithdraw(false); setWithdrawResult(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Private Transfer */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" />
              Private Transfer
            </CardTitle>
            <CardDescription>Send tokens privately through the ACE Privacy Vault</CardDescription>
          </CardHeader>
          <CardContent>
            {!showTransfer ? (
              <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)}>
                <Send className="w-4 h-4 mr-2" /> New Private Transfer
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>From Address</Label>
                  <Select value={fromAddress} onValueChange={setFromAddress}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sending address" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((a) => (
                        <SelectItem key={a.id} value={a.shielded_address}>
                          {a.label || a.shielded_address.slice(0, 10) + '…' + a.shielded_address.slice(-6)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-to">Recipient Shielded Address</Label>
                  <Input
                    id="transfer-to"
                    placeholder="0x..."
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-amount">Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="transfer-amount"
                      type="number"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={!fromAddress || maxAmount <= 0}
                      onClick={() => setTransferAmount(String(maxAmount))}
                    >
                      Max
                    </Button>
                  </div>
                  {fromAddress && (
                    <p className="text-xs text-muted-foreground">
                      Available: {maxAmount.toFixed(6)} {COMMON_TOKENS.find(t => t.address === transferToken)?.label ?? 'tokens'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-token">Token</Label>
                  <Select value={transferToken} onValueChange={setTransferToken}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TOKENS.map((t) => (
                        <SelectItem key={t.address} value={t.address}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleTransfer} disabled={isSending || !transferTo || !transferAmount} size="sm">
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Privately
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowTransfer(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Log */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Activity Log
            </CardTitle>
            <CardDescription>Recent privacy vault transactions with on-chain links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityLog.length > 0 ? (
              <div className="space-y-2">
                {activityLog.map((entry) => {
                  const result = entry.result as Record<string, any> | null;
                  const txHashes: { label: string; hash: string }[] = [];
                  if (result?.wrap_tx) txHashes.push({ label: 'Wrap', hash: result.wrap_tx });
                  if (result?.approve_tx) txHashes.push({ label: 'Approve', hash: result.approve_tx });
                  if (result?.deposit_tx) txHashes.push({ label: 'Deposit', hash: result.deposit_tx });
                  if (result?.transfer_tx) txHashes.push({ label: 'Transfer', hash: result.transfer_tx });
                  if (result?.tx_hash) txHashes.push({ label: 'TX', hash: result.tx_hash });
                  if (result?.policy_engine) txHashes.push({ label: 'PE', hash: result.policy_engine });
                  return (
                    <div key={entry.id} className="p-3 rounded-lg border border-border space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {entry.action_type.replace('privacy-vault-', '').replace('privacy-', '').replace('auto-', '⚡ ').replace(/-/g, ' ')}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${entry.status === 'success' || entry.status === 'executed' ? 'text-emerald-400 border-emerald-600/30' : entry.status === 'error' ? 'text-destructive border-destructive/30' : 'text-muted-foreground'}`}
                          >
                            {entry.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {txHashes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {txHashes.map((tx) => (
                            <a
                              key={tx.hash}
                              href={`https://sepolia.etherscan.io/${tx.label === 'PE' ? 'address' : 'tx'}/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {tx.label}: {tx.hash.slice(0, 8)}…{tx.hash.slice(-6)}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No privacy vault activity yet.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
