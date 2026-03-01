import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Copy, Check, Loader2, Eye, Send, RefreshCw, ExternalLink, ArrowDownToLine, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const [showDeposit, setShowDeposit] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositToken, setDepositToken] = useState('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
  const [depositResult, setDepositResult] = useState<{ wrap_tx?: string; approve_tx?: string; deposit_tx: string } | null>(null);

  // Onboarding status
  const [onboardStatus, setOnboardStatus] = useState<'loading' | 'onboarded' | 'not-onboarded' | 'error'>('loading');

  // Transfer form
  const [fromAddress, setFromAddress] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferToken, setTransferToken] = useState('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');

  // Compute max available balance for selected token + from address
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
    await Promise.all([fetchBalances(), fetchAddresses(), checkOnboardStatus()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchAddresses(), fetchBalances(), checkOnboardStatus()]).finally(() => setIsLoading(false));
  }, [fetchAddresses, fetchBalances, checkOnboardStatus]);

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

  const handleDeposit = async () => {
    if (!depositAmount) return;
    setIsDepositing(true);
    setDepositResult(null);
    try {
      const result = await invokePrivacy('deposit', {
        amount: Number(depositAmount),
        token: depositToken,
      });
      if (result.deposit_tx) {
        setDepositResult({ wrap_tx: result.wrap_tx, approve_tx: result.approve_tx, deposit_tx: result.deposit_tx });
      }
      toast({ title: 'Deposit Completed', description: 'On-chain deposit executed. Indexer may take ~30s to credit your balance.' });
      setDepositAmount('');
      // Re-check onboard status after deposit
      await Promise.all([fetchBalances(), checkOnboardStatus()]);
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
              Privacy-preserving token operations via Chainlink ACE — shielded addresses &amp; private transfers on Ethereum Sepolia
            </CardDescription>
            {onboardStatus === 'not-onboarded' && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ Your account is not yet registered with the Convergence protocol. Deposit ERC-20 tokens below to onboard and enable private transfers.
              </p>
            )}
          </CardHeader>
        </Card>
      </motion.div>

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
                      <p className="text-xs text-primary mt-1">
                        On-chain: {onchainBalances[addr.shielded_address].toFixed(6)} SepoliaETH
                      </p>
                    )}
                    {onchainTokenBalances[addr.shielded_address]?.map((tok, i) => (
                      <p key={i} className="text-xs text-primary">
                        On-chain: {tok.amount.toFixed(6)} {tok.symbol}
                      </p>
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
                {balances.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="text-sm text-muted-foreground">{b.token}</span>
                    <span className="text-sm font-semibold">{b.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No balances found. Deposit tokens to the Privacy Vault to get started.</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              ℹ️ <strong>Vault balances</strong> reflect the Privacy Vault's internal ledger (ERC-20 deposits via the protocol). <strong>On-chain balances</strong> (shown per shielded address above) include native ETH sent directly on-chain.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Deposit Tokens */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4" />
              Deposit to Privacy Vault
            </CardTitle>
            <CardDescription>Deposit ERC-20 tokens into the Convergence protocol to onboard your account and enable private transfers</CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeposit ? (
              <Button variant="outline" size="sm" onClick={() => setShowDeposit(true)}>
                <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit Tokens
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="deposit-token">Token</Label>
                  <Select value={depositToken} onValueChange={setDepositToken}>
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
                  <Label htmlFor="deposit-amount">Amount</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ℹ️ This will execute an on-chain deposit on Sepolia. For ERC-20 tokens, an <strong>approve</strong> step runs first. For SepoliaETH, the deposit sends native ETH directly. Ensure the vault account holds enough balance and ETH for gas.
                </p>
                {isDepositing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg border border-border bg-muted/30">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Signing &amp; broadcasting on-chain transactions… This may take up to 60 seconds.
                  </div>
                )}
                {depositResult && (
                  <div className="space-y-2 p-3 rounded-lg border border-emerald-600/30 bg-emerald-600/10">
                    <p className="text-xs font-semibold text-emerald-400">✅ Deposit completed on-chain</p>
                    <div className="space-y-1">
                      {depositResult.wrap_tx && (
                        <p className="text-xs text-muted-foreground">
                          Wrap TX:{' '}
                          <a href={`https://sepolia.etherscan.io/tx/${depositResult.wrap_tx}`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono">
                            {depositResult.wrap_tx.slice(0, 10)}…{depositResult.wrap_tx.slice(-8)}
                          </a>
                        </p>
                      )}
                      {depositResult.approve_tx && (
                        <p className="text-xs text-muted-foreground">
                          Approve TX:{' '}
                          <a href={`https://sepolia.etherscan.io/tx/${depositResult.approve_tx}`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono">
                            {depositResult.approve_tx.slice(0, 10)}…{depositResult.approve_tx.slice(-8)}
                          </a>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Deposit TX:{' '}
                        <a href={`https://sepolia.etherscan.io/tx/${depositResult.deposit_tx}`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-mono">
                          {depositResult.deposit_tx.slice(0, 10)}…{depositResult.deposit_tx.slice(-8)}
                        </a>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ℹ️ The Convergence indexer may take ~30 seconds to detect the deposit and credit your privacy vault balance.
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount} size="sm">
                    {isDepositing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
                    Deposit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowDeposit(false); setDepositResult(null); }}>
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
    </div>
  );
}
