// MCP Server for InControl AI Agent Data Provider
// Exposes 5 x402 API tools for Claude, Cursor, and MCP-compatible agents

import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

const mcpServer = new McpServer({
  name: "incontrol-mcp",
  version: "1.0.0",
});

// Helper: call an internal x402 endpoint, passing through agent's X-Payment header
async function callX402Endpoint(
  path: string,
  params: Record<string, string> = {},
  paymentHeader?: string
): Promise<{ status: number; data: unknown }> {
  const queryString = new URLSearchParams(params).toString();
  const url = `${SUPABASE_URL}/functions/v1/${path}${queryString ? `?${queryString}` : ""}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (paymentHeader) {
    headers["X-Payment"] = paymentHeader;
  }

  const response = await fetch(url, { method: "GET", headers });
  const data = await response.json();
  return { status: response.status, data };
}

// Tool 1: Price Feed
mcpServer.tool({
  name: "get_price_feed",
  description:
    "Live crypto, forex, and commodity prices from Chainlink feeds. Returns real-time prices, 24h changes, and market data. Costs $0.005 per call via x402.",
  inputSchema: {
    type: "object" as const,
    properties: {
      type: {
        type: "string",
        description: "Asset type filter: crypto, forex, or commodities",
      },
      symbols: {
        type: "string",
        description: "Comma-separated symbols, e.g. BTC,ETH,GOLD",
      },
      limit: {
        type: "number",
        description: "Max results to return (1-100)",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    const params: Record<string, string> = {};
    if (args.type) params.type = String(args.type);
    if (args.symbols) params.symbols = String(args.symbols);
    if (args.limit) params.limit = String(args.limit);

    const result = await callX402Endpoint("api-price-feed", params);

    if (result.status === 402) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Payment required. Include X-Payment header with USDC payment on Base.\n\n${JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
      ],
    };
  },
});

// Tool 2: Portfolio Summary
mcpServer.tool({
  name: "get_portfolio_summary",
  description:
    "Aggregated market insights and portfolio category distribution. Returns top assets, category breakdown, and platform-wide trends. Costs $0.01 per call via x402.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: {
        type: "number",
        description: "Max market data entries (1-100)",
      },
      includeCategories: {
        type: "boolean",
        description: "Include category distribution breakdown",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.includeCategories !== undefined)
      params.includeCategories = String(args.includeCategories);

    const result = await callX402Endpoint("api-portfolio-summary", params);

    if (result.status === 402) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Payment required.\n\n${JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
      ],
    };
  },
});

// Tool 3: Yield Analysis
mcpServer.tool({
  name: "get_yield_analysis",
  description:
    "Yield optimization strategies and staking insights by asset category. Returns yield data, optimization recommendations, and market context. Costs $0.02 per call via x402.",
  inputSchema: {
    type: "object" as const,
    properties: {
      category: {
        type: "string",
        description: "Asset category: crypto, banking, real_estate",
      },
      minYield: {
        type: "number",
        description: "Minimum yield percentage filter",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    const params: Record<string, string> = {};
    if (args.category) params.category = String(args.category);
    if (args.minYield) params.minYield = String(args.minYield);

    const result = await callX402Endpoint("api-yield-analysis", params);

    if (result.status === 402) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Payment required.\n\n${JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
      ],
    };
  },
});

// Tool 4: Debt Strategy
mcpServer.tool({
  name: "get_debt_strategy",
  description:
    "Debt payoff recommendations and optimization strategies. Returns debt analysis, payoff strategies (avalanche, snowball), and consolidation opportunities. Costs $0.02 per call via x402.",
  inputSchema: {
    type: "object" as const,
    properties: {
      debtType: {
        type: "string",
        description: "Debt type: credit_card, mortgage, student_loan, auto_loan",
      },
      minInterestRate: {
        type: "number",
        description: "Minimum interest rate filter",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    const params: Record<string, string> = {};
    if (args.debtType) params.debtType = String(args.debtType);
    if (args.minInterestRate)
      params.minInterestRate = String(args.minInterestRate);

    const result = await callX402Endpoint("api-debt-strategy", params);

    if (result.status === 402) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Payment required.\n\n${JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
      ],
    };
  },
});

// Tool 5: DCA Strategies
mcpServer.tool({
  name: "get_dca_strategies",
  description:
    "Dollar-cost averaging strategies: active configs, execution history, dip-buy stats, and performance metrics. Returns strategy details, recent executions, and aggregated performance. Costs $0.01 per call via x402.",
  inputSchema: {
    type: "object" as const,
    properties: {
      active_only: {
        type: "boolean",
        description: "Only return active strategies",
      },
      include_executions: {
        type: "boolean",
        description: "Include recent execution history (default: true)",
      },
      limit: {
        type: "number",
        description: "Max strategies to return",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    const params: Record<string, string> = {};
    if (args.active_only) params.active = "true";

    const result = await callX402Endpoint("api-dca-strategy", params);

    if (result.status === 402) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Payment required.\n\n${JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    }

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
      ],
    };
  },
});

// Set up Hono app with StreamableHttpTransport
const app = new Hono();
const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
