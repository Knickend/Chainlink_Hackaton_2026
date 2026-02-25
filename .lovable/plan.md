
# Switch All Hardcoded Base Mainnet References to Base Sepolia Testnet

## Overview
Simple find-and-replace across 4 files to switch from Base mainnet to Base Sepolia testnet for the hackathon.

## Constants Change Summary

| Value | Mainnet | Sepolia |
|-------|---------|---------|
| Chain ID | `8453` | `84532` |
| Network name | `'base'` | `'base-sepolia'` |
| Block explorer | `basescan.org` | `sepolia.basescan.org` |
| USDC address | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| WETH address | `0x4200000000000000000000000000000000000006` | unchanged |

## Files to Update

### 1. `supabase/functions/agent-wallet/index.ts`
- Update `USDC_BASE` constant to Sepolia USDC address
- Change all `chainId: 8453` to `84532` (~4 occurrences)
- Change all `network: 'base'` to `'base-sepolia'` in CDP API calls (~8 occurrences)
- Change `/token-balances/base/` to `/token-balances/base-sepolia/` (2 occurrences)
- Change `basescan.org` to `sepolia.basescan.org` in email link
- Update onramp `destinationNetwork` from `'base'` to `'base-sepolia'`

### 2. `supabase/functions/check-wallet-balance/index.ts`
- Update `USDC_BASE` constant to Sepolia address
- Change `/token-balances/base/` to `/token-balances/base-sepolia/`
- Change `basescan.org` to `sepolia.basescan.org`

### 3. `supabase/functions/_shared/x402.ts`
- Update `USDC_BASE_ADDRESS` to Sepolia USDC
- Change `network: "base"` to `"base-sepolia"`

### 4. `src/pages/ApiDocs.tsx`
- Change `basescan.org` to `sepolia.basescan.org` in explorer links

## Notes
- WETH address (`0x4200...0006`) is the same on both networks -- no change needed
- Existing wallets in the database will continue to work since CDP accounts are network-agnostic
- All changes are easily reversible after the hackathon by swapping the values back
