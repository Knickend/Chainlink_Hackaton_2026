

## Automated On-Chain Deposit for Privacy Vault Onboarding

### Problem
The Privacy Vault's `deposit` action currently just returns instructions. The Convergence protocol requires an actual on-chain deposit transaction (approve + deposit) to onboard the account before private transfers work.

### What Will Change

**1. Edge Function (`supabase/functions/privacy-vault/index.ts`)**

Add raw Ethereum transaction utilities:
- `rlpEncode()` -- RLP-encode transaction fields for signing/broadcasting
- `signRawTransaction()` -- sign a legacy (Type 0) Ethereum transaction using EIP-155 replay protection (chainId 11155111)
- `sendRawTransaction()` -- broadcast via `eth_sendRawTransaction` to Sepolia public RPC
- `getNonce()` -- fetch account nonce via `eth_getTransactionCount`
- `getGasPrice()` -- fetch gas price via `eth_gasPrice`

Replace the `deposit` case with a two-step on-chain flow:
- Step 1: Send `approve(vault_address, amount)` tx to the ERC-20 token contract (selector `0x095ea7b3`)
- Wait for approval tx to be mined (poll `eth_getTransactionReceipt`)
- Step 2: Send `deposit(token, amount)` tx to the Vault contract at `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13` (selector `0x47e7ef24`)
- Return both transaction hashes
- Log the action to `agent_actions_log`

Add an `onboard-status` case:
- Call the `/balances` API endpoint and check success vs error
- Return `{ onboarded: true/false }` for the UI

**2. UI (`src/components/settings/PrivacyVaultSection.tsx`)**

Update the deposit card:
- On submit, call the edge function's new `deposit` action (which now executes on-chain)
- Display returned tx hashes with Etherscan links after success
- Show a note that indexer detection may take ~30 seconds

Add onboarding status indicator:
- On mount, call `onboard-status` action
- Show a green badge "Account Registered" or amber warning "Not Onboarded" in the Privacy Vault header card
- When not onboarded, show a brief explanation directing users to deposit first

### Technical Details

RLP encoding handles legacy Ethereum transactions with EIP-155 signing:
- Sign over `[nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0]`
- Recovery: `v = chainId * 2 + 35 + recovery`

Gas limits: 100,000 for approve, 200,000 for deposit (conservative; Sepolia gas is free).

Token decimals mapping reused from existing code (USDC=6, others=18).

### Prerequisites
The account derived from `PRIVACY_VAULT_PRIVATE_KEY` must hold:
- Sepolia ETH for gas
- The ERC-20 tokens being deposited

The UI will show on-chain balances so users can verify availability before depositing.

