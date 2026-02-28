import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Copy, Check, Loader2, Eye, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COMMON_TOKENS = [
  { label: 'USDC', address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' },
  { label: 'WETH', address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' },
  { label: 'ETH (native)', address: '0x0000000000000000000000000000000000000000' },
  { label: 'wBTC', address: '0x29f2D40B0605204364af54EC677bD022dA425d03' },
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
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);

  // Transfer form
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferToken, setTransferToken] = useState('0x036CbD53842c5426634e7929541eC2318f3dCF7e'); // USDC on Sepolia

  const invokePrivacy = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('privacy-vault', {
      body: { action, ...params },
    });
    if (error) throw new Error(error.message || 'Privacy vault error');
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    try {
      const data = await invokePrivacy('list-addresses');
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error('Failed to fetch shielded addresses:', err);
    }
  }, [user, invokePrivacy]);

  const fetchBalances = useCallback(async () => {
    if (!user) return;
    try {
      const data = await invokePrivacy('balances');
      setBalances(data.balances || []);
    } catch (err) {
      console.error('Failed to fetch privacy balances:', err);
    }
  }, [user, invokePrivacy]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchAddresses(), fetchBalances()]).finally(() => setIsLoading(false));
  }, [fetchAddresses, fetchBalances]);

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
              <Badge variant="outline" className="text-xs">
                Ethereum Sepolia
              </Badge>
            </div>
            <CardDescription>
              Privacy-preserving token operations via Chainlink ACE — shielded addresses &amp; private transfers on Ethereum Sepolia
            </CardDescription>
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
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 ml-2"
                    onClick={() => copyAddress(addr.shielded_address, addr.id)}
                  >
                    {copiedId === addr.id ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
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
            <CardTitle className="text-base">Privacy Vault Balances</CardTitle>
            <CardDescription>Balances inside your privacy vault on Ethereum Sepolia</CardDescription>
          </CardHeader>
          <CardContent>
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
                  <Input
                    id="transfer-amount"
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
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
