import * as cre from "@chainlink/cre-sdk";

// Asset type definitions
type AssetType = "crypto" | "stock" | "commodity" | "etf" | "bond" | "forex";
type Priority = "high" | "medium" | "low";

// Configuration interfaces
interface WorkflowConfig {
  name: string;
  type: AssetType;
  symbols: string[];
  schedule: string;
  enabled: boolean;
  priority: Priority;
  marketHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

interface Config {
  supabaseApiUrl: string;
  supabaseApiKey: string;
  workflows: WorkflowConfig[];
  general: {
    maxRetries: number;
    timeout: number;
    consensusNodes: number;
  };
}

// Price data response types
interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  timestamp: number;
  type: AssetType;
}

interface ApiResponse {
  success: boolean;
  data: PriceData[];
  timestamp: number;
  source: string;
  type: AssetType;
}

interface WorkflowResult {
  success: boolean;
  timestamp: number;
  assetType: AssetType;
  workflowName: string;
  prices: PriceData[];
  stats: {
    totalAssets: number;
    successfulFetches: number;
    failedFetches: number;
    averagePrice: number;
  };
  errors?: string[];
}

// Helper function to check market hours
function isWithinMarketHours(
  marketHours?: WorkflowConfig["marketHours"]
): boolean {
  if (!marketHours) return true; // 24/7 markets (crypto, forex)

  const now = new Date();
  const timezone = marketHours.timezone;
  
  // In production, use proper timezone library
  // For now, simplified check
  const currentHour = now.getHours();
  const [startHour] = marketHours.start.split(':').map(Number);
  const [endHour] = marketHours.end.split(':').map(Number);
  
  return currentHour >= startHour && currentHour < endHour;
}

// Helper function to chunk arrays for batch processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Main workflow handler with multi-asset support
export default cre.Handler(
  // Cron trigger - runs on the schedule defined in config
  new cre.capabilities.CronCapability().trigger({
    schedule: "0 */5 * * * *" // Base schedule, overridden by config
  }),
  
  // Main callback function
  async (config: Config, runtime: cre.Runtime): Promise<WorkflowResult[]> => {
    runtime.log(`🚀 Starting Multi-Asset Price Feed Workflow`);
    runtime.log(`📊 Total workflows configured: ${config.workflows.length}`);
    
    const allResults: WorkflowResult[] = [];
    
    // Process each asset type workflow
    for (const workflow of config.workflows) {
      if (!workflow.enabled) {
        runtime.log(`⏭️  Skipping disabled workflow: ${workflow.name}`);
        continue;
      }
      
      // Check market hours for stocks/ETFs
      if (!isWithinMarketHours(workflow.marketHours)) {
        runtime.log(`🕐 ${workflow.name}: Outside market hours, skipping`);
        continue;
      }
      
      runtime.log(`\n${'='.repeat(60)}`);
      runtime.log(`📈 Processing: ${workflow.name.toUpperCase()}`);
      runtime.log(`   Type: ${workflow.type}`);
      runtime.log(`   Symbols: ${workflow.symbols.length} assets`);
      runtime.log(`   Priority: ${workflow.priority}`);
      runtime.log(`${'='.repeat(60)}\n`);
      
      try {
        // Process symbols in chunks to avoid API limits
        const symbolChunks = chunkArray(workflow.symbols, 10);
        const allPrices: PriceData[] = [];
        const errors: string[] = [];
        
        for (let i = 0; i < symbolChunks.length; i++) {
          const chunk = symbolChunks[i];
          runtime.log(`  📦 Processing chunk ${i + 1}/${symbolChunks.length}: ${chunk.join(', ')}`);
          
          try {
            // Fetch with consensus across oracle nodes
            const chunkResult = await runtime.runInNodeMode(
              (nodeRuntime: cre.NodeRuntime) => {
                const httpClient = new cre.capabilities.HTTPClient();
                
                // Build query parameters
                const queryParams = new URLSearchParams({
                  type: workflow.type,
                  symbols: chunk.join(',')
                });
                
                const fullUrl = `${config.supabaseApiUrl}?${queryParams}`;
                
                // Make authenticated request
                const response = httpClient.sendRequest(nodeRuntime, {
                  url: fullUrl,
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.supabaseApiKey,
                    'Authorization': `Bearer ${config.supabaseApiKey}`
                  },
                  timeout: config.general.timeout
                }).result();
                
                // Validate response
                if (response.statusCode !== 200) {
                  throw new Error(
                    `API returned status ${response.statusCode} for ${workflow.type}`
                  );
                }
                
                // Parse response
                const responseText = new TextDecoder().decode(response.body);
                const apiResponse: ApiResponse = JSON.parse(responseText);
                
                if (!apiResponse.success) {
                  throw new Error(`API returned success=false for ${workflow.type}`);
                }
                
                return apiResponse;
              },
              // Consensus aggregation
              cre.consensusMedianAggregation()
            )(config);
            
            // Add prices to collection
            allPrices.push(...chunkResult.data);
            
            runtime.log(`  ✅ Chunk ${i + 1} successful: ${chunkResult.data.length} prices fetched`);
            
          } catch (error) {
            const errorMsg = `Chunk ${i + 1} failed: ${error}`;
            runtime.log(`  ❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
        
        // Calculate statistics
        const successfulFetches = allPrices.length;
        const failedFetches = workflow.symbols.length - successfulFetches;
        const averagePrice = allPrices.length > 0
          ? allPrices.reduce((sum, p) => sum + p.price, 0) / allPrices.length
          : 0;
        
        // Log detailed results
        runtime.log(`\n📊 ${workflow.name} Summary:`);
        runtime.log(`   ✅ Successful: ${successfulFetches}/${workflow.symbols.length}`);
        runtime.log(`   ❌ Failed: ${failedFetches}`);
        runtime.log(`   💰 Average price: $${averagePrice.toFixed(2)}`);
        
        // Log top 5 prices
        if (allPrices.length > 0) {
          runtime.log(`\n   Top prices:`);
          allPrices.slice(0, 5).forEach(price => {
            const change = price.changePercent 
              ? `(${price.changePercent > 0 ? '+' : ''}${price.changePercent.toFixed(2)}%)`
              : '';
            runtime.log(`     • ${price.symbol}: $${price.price.toFixed(2)} ${change}`);
          });
        }
        
        // Create result object
        const result: WorkflowResult = {
          success: successfulFetches > 0,
          timestamp: Date.now(),
          assetType: workflow.type,
          workflowName: workflow.name,
          prices: allPrices,
          stats: {
            totalAssets: workflow.symbols.length,
            successfulFetches,
            failedFetches,
            averagePrice
          },
          errors: errors.length > 0 ? errors : undefined
        };
        
        allResults.push(result);
        
      } catch (error) {
        runtime.log(`❌ Workflow ${workflow.name} failed: ${error}`);
        
        // Add failed result
        allResults.push({
          success: false,
          timestamp: Date.now(),
          assetType: workflow.type,
          workflowName: workflow.name,
          prices: [],
          stats: {
            totalAssets: workflow.symbols.length,
            successfulFetches: 0,
            failedFetches: workflow.symbols.length,
            averagePrice: 0
          },
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }
    
    // Final summary
    runtime.log(`\n${'='.repeat(60)}`);
    runtime.log(`🎯 WORKFLOW EXECUTION COMPLETE`);
