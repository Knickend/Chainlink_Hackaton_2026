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
    methods: ["GET", "POST", "PUT"],
    returns: ["Market data for top assets", "Category distribution", "Platform-wide insights"],
    queryParams: ["?limit=20", "?includeCategories=true"],
    bodyParams: { limit: 20, includeCategories: true },
  },
  {
    name: "Yield Analysis",
    path: "/api-yield-analysis",
    price: "$0.02",
    priceUnits: "20000",
    description: "Yield optimization strategies and staking insights",
    methods: ["GET", "POST", "PUT"],
    returns: ["Yield by asset category", "Optimization strategies", "Market context"],
    queryParams: ["?category=crypto", "?minYield=3"],
    bodyParams: { category: "crypto", minYield: 3, limit: 100 },
  },
  {
    name: "Debt Strategy",
    path: "/api-debt-strategy",
    price: "$0.02",
    priceUnits: "20000",
    description: "Debt payoff recommendations and optimization",
    methods: ["GET", "POST", "PUT"],
    returns: ["Debt analysis by type", "Payoff strategies (avalanche, snowball)", "Consolidation opportunities"],
    queryParams: ["?debtType=credit_card", "?minInterestRate=15"],
    bodyParams: { debtType: "credit_card", minInterestRate: 15 },
  },
  {
    name: "Price Feed",
    path: "/api-price-feed",
    price: "$0.005",
    priceUnits: "5000",
    description: "Live crypto, forex, and commodity prices",
    methods: ["GET", "POST", "PUT"],
    returns: ["Real-time prices", "24h changes", "Filter by type or symbols"],
    queryParams: ["?type=crypto", "?symbols=BTC,ETH,GOLD"],
    bodyParams: { type: "crypto", symbols: ["BTC", "ETH"], limit: 50 },
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
                GET, POST, or PUT with query params or JSON body. Standard HTTP + x402 headers.
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
                    <div className="flex gap-1">
                      {endpoint.methods.map((method) => (
                        <Badge 
                          key={method} 
                          variant="secondary" 
                          className={`text-xs ${
                            method === "GET" 
                              ? "bg-green-500/10 text-green-600" 
                              : method === "POST" 
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-orange-500/10 text-orange-600"
                          }`}
                        >
                          {method}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs break-all flex-1">{SUPABASE_URL}/functions/v1{endpoint.path}</span>
                  </div>
                  {endpoint.queryParams && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Query params:</span> {endpoint.queryParams.join(", ")}
                    </div>
                  )}
                  {endpoint.bodyParams && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Body (POST/PUT):</span>{" "}
                      <code className="bg-muted-foreground/10 px-1 rounded">
                        {JSON.stringify(endpoint.bodyParams)}
                      </code>
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
            <TabsList className="flex-wrap">
              <TabsTrigger value="flow">How It Works</TabsTrigger>
              <TabsTrigger value="get">GET Example</TabsTrigger>
              <TabsTrigger value="post">POST Example</TabsTrigger>
              <TabsTrigger value="typescript">TypeScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="dca">DCA Strategy</TabsTrigger>
              <TabsTrigger value="mcp">MCP (AI Agents)</TabsTrigger>
              <TabsTrigger value="cre">CRE Verified</TabsTrigger>
            </TabsList>

            <TabsContent value="flow" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">1</div>
                    <div>
                      <h4 className="font-medium">Request without payment</h4>
                      <p className="text-sm text-muted-foreground">Call any endpoint (GET, POST, or PUT) without the X-Payment header</p>
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

            <TabsContent value="get" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">GET with Query Parameters</CardTitle>
                  <CardDescription>Traditional REST-style requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    code={`# Get the 402 payment challenge
curl -X GET "${SUPABASE_URL}/functions/v1/api-price-feed?type=crypto&symbols=BTC,ETH"

# After payment, include X-Payment header
curl -X GET "${SUPABASE_URL}/functions/v1/api-price-feed?type=crypto&symbols=BTC,ETH" \\
  -H "X-Payment: <payment_proof>"

# Response (200):
# {
#   "timestamp": "2026-02-04T...",
#   "request": { "method": "GET", "filters": {...} },
#   "prices": [{ "symbol": "BTC", "price": 98000, ... }],
#   "paymentDetails": { "amountPaid": "$0.005", ... }
# }`}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="post" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">POST/PUT with JSON Body</CardTitle>
                  <CardDescription>Ideal for AI agents with complex filters</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    code={`# POST with JSON body
curl -X POST "${SUPABASE_URL}/functions/v1/api-price-feed" \\
  -H "Content-Type: application/json" \\
  -H "X-Payment: <payment_proof>" \\
  -d '{"type": "crypto", "symbols": ["BTC", "ETH", "SOL"], "limit": 10}'

# PUT also works the same way
curl -X PUT "${SUPABASE_URL}/functions/v1/api-debt-strategy" \\
  -H "Content-Type: application/json" \\
  -H "X-Payment: <payment_proof>" \\
  -d '{"debtType": "credit_card", "minInterestRate": 20}'

# Response includes method used:
# {
#   "request": { "method": "POST", "filters": {...} },
#   ...
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

// GET with query params
const getResponse = await client.fetch(
  '${SUPABASE_URL}/functions/v1/api-price-feed?type=crypto'
);

// POST with JSON body (same endpoint, more flexibility)
const postResponse = await client.fetch(
  '${SUPABASE_URL}/functions/v1/api-price-feed',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'crypto',
      symbols: ['BTC', 'ETH', 'SOL'],
      limit: 20
    })
  }
);

const data = await postResponse.json();
console.log(data.prices);`}
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

# GET with query params
response = client.get(
    "${SUPABASE_URL}/functions/v1/api-price-feed",
    params={"type": "crypto", "symbols": "BTC,ETH"}
)

# POST with JSON body
response = client.post(
    "${SUPABASE_URL}/functions/v1/api-yield-analysis",
    json={"category": "crypto", "minYield": 5, "limit": 100}
)

# PUT also supported
response = client.put(
    "${SUPABASE_URL}/functions/v1/api-debt-strategy",
    json={"debtType": "mortgage"}
)

print(response.json())`}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dca" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">DCA Strategy API</CardTitle>
                  <CardDescription>$0.01 per call — Dollar-cost averaging strategies, execution history, and performance stats</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Endpoint</h4>
                    <div className="flex items-center gap-2 bg-muted p-2 rounded text-sm font-mono">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">GET</Badge>
                      <span className="text-xs break-all">{SUPABASE_URL}/functions/v1/api-dca-strategy</span>
                    </div>
                  </div>
                  <CodeBlock
                    code={`# List active strategies with recent executions
curl -X GET "${SUPABASE_URL}/functions/v1/api-dca-strategy?active=true" \\
  -H "X-Payment: <payment_proof>"

# Get a specific strategy with full execution history
curl -X GET "${SUPABASE_URL}/functions/v1/api-dca-strategy?strategyId=<uuid>" \\
  -H "X-Payment: <payment_proof>"

# Get aggregated DCA performance summary
curl -X POST "${SUPABASE_URL}/functions/v1/api-dca-strategy" \\
  -H "Content-Type: application/json" \\
  -H "X-Payment: <payment_proof>" \\
  -d '{"action": "summary"}'

# Response shape:
# {
#   "strategies": [{
#     "from_token": "USDC", "to_token": "cbBTC",
#     "frequency": "daily", "amount_per_execution": 50,
#     "total_spent_usd": 1500, "tokens_accumulated": 0.015,
#     "dip_threshold_pct": 5, "dip_multiplier": 2,
#     "recent_executions": [...]
#   }],
#   "summary": { "total_invested": 1500, "dip_buys_triggered": 3 }
# }`}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mcp" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">MCP Server (AI Agents)</CardTitle>
                  <CardDescription>Auto-discover InControl tools from Claude, Cursor, or any MCP-compatible agent</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Connect with Claude Desktop</h4>
                    <CodeBlock
                      code={`claude mcp add incontrol -t http ${SUPABASE_URL}/functions/v1/mcp-server/mcp`}
                    />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Available Tools (5)</h4>
                    <div className="space-y-2">
                      {[
                        { name: "get_price_feed", desc: "Live crypto, forex, commodity prices", price: "$0.005" },
                        { name: "get_portfolio_summary", desc: "Aggregated market insights", price: "$0.01" },
                        { name: "get_yield_analysis", desc: "Yield optimization strategies", price: "$0.02" },
                        { name: "get_debt_strategy", desc: "Debt payoff recommendations", price: "$0.02" },
                        { name: "get_dca_strategies", desc: "DCA configs, execution history, dip-buy stats", price: "$0.01" },
                      ].map((tool) => (
                        <div key={tool.name} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                          <div>
                            <code className="font-mono text-xs">{tool.name}</code>
                            <span className="text-muted-foreground ml-2 text-xs">{tool.desc}</span>
                          </div>
                          <Badge variant="outline" className="font-mono text-xs">{tool.price}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">How It Works</h4>
                    <p className="text-sm text-muted-foreground">
                      Agents discover tools via MCP protocol. Each tool call hits the corresponding x402 endpoint. 
                      The agent pays USDC on Base per call — no API keys, no subscriptions. Include the <code className="bg-muted-foreground/10 px-1 rounded">X-Payment</code> header 
                      for paid access, or call without payment to discover pricing.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cre" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CRE Verified Data</CardTitle>
                  <CardDescription>$0.05 per call — Consensus-verified prices with Chainlink attestation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Endpoint</h4>
                    <div className="flex items-center gap-2 bg-muted p-2 rounded text-sm font-mono">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">GET</Badge>
                      <span className="text-xs break-all">{SUPABASE_URL}/functions/v1/cre-verified-data</span>
                    </div>
                  </div>
                  <CodeBlock
                    code={`# Get consensus-verified crypto prices
curl -X GET "${SUPABASE_URL}/functions/v1/cre-verified-data?type=crypto&symbols=BTC,ETH" \\
  -H "X-Payment: <payment_proof>"

# Response includes attestation proof:
# {
#   "attestation": {
#     "method": "consensusMedianAggregation",
#     "nodeCount": 3,
#     "source": "chainlink-cre"
#   },
#   "prices": [{
#     "symbol": "base:cbBTC/USD",
#     "price": 98000,
#     "attestation": {
#       "method": "consensusMedianAggregation",
#       "nodeCount": 3,
#       "source": "chainlink-cre",
#       "feedOrigin": "base:cbBTC/USD",
#       "verified": true
#     }
#   }]
# }`}
                  />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Why CRE Verified?</h4>
                    <p className="text-sm text-muted-foreground">
                      Standard price APIs return data from a single source. CRE-verified data is fetched across multiple 
                      independent Chainlink oracle nodes using <code className="bg-muted-foreground/10 px-1 rounded">consensusMedianAggregation</code>. 
                      The attestation object proves the data came from on-chain feeds with multi-node agreement — 
                      critical for AI agents making financial decisions that require trust and auditability.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Architecture Note</h4>
                    <p className="text-sm text-muted-foreground">
                      This edge function is an <strong>x402-gated HTTP proxy</strong> to the CRE-verified data pipeline — it does not perform 
                      consensus itself. Actual multi-node consensus verification runs in the CRE workflow (<code className="bg-muted-foreground/10 px-1 rounded">x402-cre-verified-ts/main.ts</code>), 
                      which uses Chainlink's <code className="bg-muted-foreground/10 px-1 rounded">HTTPClient</code> with <code className="bg-muted-foreground/10 px-1 rounded">consensusMedianAggregation</code> across 
                      independent oracle nodes. In the response:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1 space-y-1">
                      <li><code className="bg-muted-foreground/10 px-1 rounded">verified: true</code> — data sourced from Chainlink on-chain feeds via CRE consensus</li>
                      <li><code className="bg-muted-foreground/10 px-1 rounded">verified: false</code> — cached data not yet verified by CRE consensus</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Request Body Schema */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Request Body Schema</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">JSON Body Format (POST/PUT/PATCH)</CardTitle>
              <CardDescription>All fields are optional - omit to use defaults</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                language="json"
                code={`{
  "type": "crypto | forex | commodities",  // Filter by asset type (price-feed)
  "symbols": ["BTC", "ETH", "GOLD"],        // Filter by symbols (price-feed)
  "category": "crypto | banking | real_estate",  // Filter by category (yield)
  "debtType": "credit_card | mortgage | student_loan",  // Debt type filter
  "minYield": 3.5,                          // Minimum yield % (yield)
  "minInterestRate": 15,                    // Minimum rate % (debt)
  "limit": 50,                              // Max results (1-100 or 1-1000)
  "includeCategories": true                 // Include breakdown (portfolio)
}`}
              />
            </CardContent>
          </Card>
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
          <p>Powered by x402 Protocol on Base • Payments in USDC • GET | POST | PUT</p>
        </div>
      </footer>
    </div>
  );
}
