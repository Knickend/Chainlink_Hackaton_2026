import { ArrowLeft, Copy, Check, ExternalLink, Zap, DollarSign, Shield, Code } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const WALLET_ADDRESS = "0x72F91fb57820A2c5078bECE60C945Fc2981F785b";

const endpoints = [
  {
    name: "Portfolio Summary",
    path: "/api-portfolio-summary",
    price: "$0.01",
    priceUnits: "10000",
    description: "Aggregated market insights and portfolio trends",
    returns: ["Market data for top assets", "Category distribution", "Platform-wide insights"],
  },
  {
    name: "Yield Analysis",
    path: "/api-yield-analysis",
    price: "$0.02",
    priceUnits: "20000",
    description: "Yield optimization strategies and staking insights",
    returns: ["Yield by asset category", "Optimization strategies", "Market context"],
  },
  {
    name: "Debt Strategy",
    path: "/api-debt-strategy",
    price: "$0.02",
    priceUnits: "20000",
    description: "Debt payoff recommendations and optimization",
    returns: ["Debt analysis by type", "Payoff strategies (avalanche, snowball)", "Consolidation opportunities"],
  },
  {
    name: "Price Feed",
    path: "/api-price-feed",
    price: "$0.005",
    priceUnits: "5000",
    description: "Live crypto, forex, and commodity prices",
    returns: ["Real-time prices", "24h changes", "Filter by type or symbols"],
    params: ["?type=crypto", "?symbols=BTC,ETH,GOLD"],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6">
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">x402 API Documentation</h1>
              <p className="text-muted-foreground text-sm">Monetized APIs for AI Agents</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Zap className="h-3 w-3" />
            x402 Protocol
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Overview */}
        <section className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
                Micropayments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pay per request with USDC on Base blockchain. No subscriptions, no API keys.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-blue-500" />
                Trustless
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Payments verified on-chain via Coinbase facilitator. No accounts required.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code className="h-5 w-5 text-purple-500" />
                Agent-Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Designed for autonomous AI agents. Standard HTTP with x402 payment headers.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Wallet Info */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Destination</CardTitle>
            <CardDescription>All payments go directly to this Base wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 bg-muted p-3 rounded-lg font-mono text-sm">
              <span className="flex-1 break-all">{WALLET_ADDRESS}</span>
              <CopyButton text={WALLET_ADDRESS} />
              <a
                href={`https://basescan.org/address/${WALLET_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Available Endpoints</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {endpoints.map((endpoint) => (
              <Card key={endpoint.path}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                    <Badge variant="outline" className="font-mono">
                      {endpoint.price}
                    </Badge>
                  </div>
                  <CardDescription>{endpoint.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 bg-muted p-2 rounded text-sm font-mono">
                    <Badge variant="secondary" className="text-xs">GET</Badge>
                    <span className="text-xs break-all">{SUPABASE_URL}/functions/v1{endpoint.path}</span>
                  </div>
                  {endpoint.params && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Query params:</span> {endpoint.params.join(", ")}
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">Returns:</span>
                    <ul className="mt-1 space-y-1">
                      {endpoint.returns.map((item, i) => (
                        <li key={i} className="text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Integration Guide */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Integration Guide</h2>
          <Tabs defaultValue="flow" className="w-full">
            <TabsList>
              <TabsTrigger value="flow">How It Works</TabsTrigger>
              <TabsTrigger value="curl">cURL Example</TabsTrigger>
              <TabsTrigger value="typescript">TypeScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>

            <TabsContent value="flow" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">1</div>
                    <div>
                      <h4 className="font-medium">Request without payment</h4>
                      <p className="text-sm text-muted-foreground">Call any endpoint without the X-Payment header</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">2</div>
                    <div>
                      <h4 className="font-medium">Receive 402 Payment Required</h4>
                      <p className="text-sm text-muted-foreground">Response includes payment details: amount, asset (USDC), destination wallet</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">3</div>
                    <div>
                      <h4 className="font-medium">Make USDC payment on Base</h4>
                      <p className="text-sm text-muted-foreground">Send the exact amount to the specified wallet address</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">4</div>
                    <div>
                      <h4 className="font-medium">Retry with X-Payment header</h4>
                      <p className="text-sm text-muted-foreground">Include payment proof in the header, verified via Coinbase facilitator</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-semibold">✓</div>
                    <div>
                      <h4 className="font-medium">Receive data</h4>
                      <p className="text-sm text-muted-foreground">Full response with requested financial insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curl" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test the 402 Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    code={`# Get the 402 payment challenge
curl -X GET "${SUPABASE_URL}/functions/v1/api-portfolio-summary"

# Response (402):
# {
#   "x402Version": 1,
#   "accepts": [{
#     "scheme": "exact",
#     "network": "base",
#     "maxAmountRequired": "10000",
#     "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
#     "payTo": "${WALLET_ADDRESS}",
#     ...
#   }]
# }`}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="typescript" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">TypeScript / JavaScript</CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    language="typescript"
                    code={`import { createX402Client } from '@coinbase/x402-client';

const client = createX402Client({
  network: 'base',
  wallet: yourWallet, // ethers.js or viem wallet
});

// Client automatically handles 402 → payment → retry
const response = await client.fetch(
  '${SUPABASE_URL}/functions/v1/api-portfolio-summary'
);

const data = await response.json();
console.log(data.marketData);`}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="python" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Python</CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    language="python"
                    code={`from x402_client import X402Client

client = X402Client(
    network="base",
    private_key=your_private_key
)

# Automatic 402 handling with payment
response = client.get(
    "${SUPABASE_URL}/functions/v1/api-price-feed",
    params={"type": "crypto", "symbols": "BTC,ETH"}
)

print(response.json()["prices"])`}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Resources */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="https://www.x402.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    x402 Protocol
                    <ExternalLink className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Official x402 protocol specification and documentation
                  </p>
                </CardContent>
              </Card>
            </a>

            <a
              href="https://basescan.org"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Base Explorer
                    <ExternalLink className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track payments and transactions on Base blockchain
                  </p>
                </CardContent>
              </Card>
            </a>

            <a
              href="https://docs.base.org"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Base Docs
                    <ExternalLink className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Learn about Base L2 and USDC integration
                  </p>
                </CardContent>
              </Card>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Powered by x402 Protocol on Base • Payments in USDC</p>
        </div>
      </footer>
    </div>
  );
}
