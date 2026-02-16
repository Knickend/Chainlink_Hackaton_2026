

## Replace Ankr RPC with Moralis Nodes

### What Changes

Update `supabase/functions/fetch-chainlink-feeds/index.ts` to use the two Moralis Sepolia RPC endpoints instead of the single Ankr fallback. This gives the function three layers of resilience: primary RPC (from feed config) -> Moralis site1 -> Moralis site2.

### Technical Details

**File:** `supabase/functions/fetch-chainlink-feeds/index.ts`

1. Replace the single `FALLBACK_RPC` constant (line 17) with an array of two Moralis endpoints:
   ```
   const FALLBACK_RPCS = [
     'https://site1.moralis-nodes.com/sepolia/0719ea3244184b24b638e0f5686b7534',
     'https://site2.moralis-nodes.com/sepolia/0719ea3244184b24b638e0f5686b7534',
   ];
   ```

2. Update the fallback logic in `fetchFeed` (lines 68-75) to loop through both Moralis RPCs sequentially, trying each before giving up:
   ```
   for (const rpc of FALLBACK_RPCS) {
     try {
       return await queryProvider(getProvider(rpc));
     } catch (err) {
       console.warn(`Fallback ${rpc} failed for ${f.pair}:`, String(err));
     }
   }
   // All RPCs failed
   return { pair, network, address, error: 'All RPCs failed' };
   ```

No other files are affected. The function will be redeployed automatically.

