

## Agentic Wallet Transaction Execution + Dashboard Quick Action Button

### Overview
This plan combines two things:
1. Wire up the DeFi confirmation flow so "Approve" in the chat actually executes transactions (Send USDC, Trade tokens, Fund wallet)
2. Add a quick-action button on the dashboard to instruct the agent directly (e.g., "Send 50 USDC to Alice") without opening the full advisor chat first

---

### 1. Dashboard Quick Action Button

Add a small "Agent" floating button near the existing chat FAB (bottom-right area) that opens a lightweight command input. When the user types a DeFi instruction, it opens the Financial Advisor chat pre-filled with that command.

**Implementation in `src/pages/Index.tsx`:**
- Add a new floating action button (Bot icon) positioned above the chat FAB, visible only for Pro users with a connected agent wallet
- Clicking it opens a small popover/input where the user can type a quick command like "Send 20 USDC to Alice"
- On submit, it opens the Financial Advisor chat and sends the command automatically

**Alternative (simpler) approach -- chosen:**
- Add a prop to `FinancialAdvisorChat` like `initialMessage` that auto-sends a message when set
- Add a second small FAB button with a Bot/Zap icon above the chat button
- Clicking it opens the chat with a set of quick DeFi action chips (Send USDC, Trade, Fund) that pre-fill commands
- This avoids a separate popover and keeps everything within the existing chat panel

**Changes to `src/components/FinancialAdvisorChat.tsx`:**
- Add DeFi quick-action chips at the top of the chat (alongside existing suggested questions) when the agent wallet is connected
- Chips: "Send USDC", "Trade tokens", "Fund wallet"
- Clicking a chip pre-fills the input with a template like "Send [amount] USDC to [recipient]" and focuses the input
- Import and use `useAgentWallet` to check connection status
- Import and use `useAddressBook` to pass contacts for recipient resolution

### 2. Wire Up DeFi Confirmations

**Changes to `src/hooks/useVoiceActions.ts`:**
- Expand `ActionHandlers` interface to include optional `sendUsdc`, `tradeTokens`, `fundWallet` functions
- Add a new `confirmAction` method (alongside `confirmDelete`) that handles SEND_USDC, TRADE_TOKENS, and FUND_WALLET by calling the wallet functions
- Return `{ executeAction, confirmDelete, confirmAction }` instead of just `{ executeAction, confirmDelete }`

**Changes to `src/components/FinancialAdvisorChat.tsx`:**
- Import `useAgentWallet` and `useAddressBook`
- Pass wallet functions (`sendUsdc`, `tradeTokens`, `fundWallet`) into `useVoiceActions`
- Update `handleConfirmAction` to detect DeFi actions and call `confirmAction` instead of `confirmDelete`
- Enhance the pending action confirmation card for DeFi actions to show structured details (amount, recipient/token pair, network badge) instead of the generic "Yes, delete" button
- Show a success card with transaction result after execution

**Changes to `supabase/functions/parse-voice-command/index.ts`:**
- Accept optional `addressBook` array in the request body
- Inject address book entries into the system prompt so the AI can resolve contact names to wallet addresses
- Add a `recipient_name` field to SEND_USDC output when resolved from contacts

**Changes to `supabase/functions/financial-advisor/index.ts`:**
- Accept optional `walletContext` in the request body
- Inject agent wallet status (connected, balance, enabled skills) into the system prompt so the advisor can suggest DeFi actions contextually

### Technical Details

**DeFi confirmation card structure:**
```text
+----------------------------------+
| [Send icon]  Send USDC           |
|  Amount: 50 USDC                 |
|  To: Alice (0x1234...abcd)       |
|  Network: Base                   |
|                                  |
|  [Approve]  [Reject]             |
+----------------------------------+
```

**Quick action chips in chat (when wallet connected):**
- "Send USDC" -> pre-fills: "Send USDC to "
- "Swap tokens" -> pre-fills: "Swap to "
- "Fund wallet" -> pre-fills: "Fund my wallet with $"

**Address book resolution in parser:**
- The user's contacts are serialized as `Name: wallet_address` pairs and added to the system prompt
- When the parser sees "Send 50 USDC to Alice", it looks up Alice in the contact list and returns the resolved address plus `recipient_name: "Alice"` for display

**Execution flow:**
1. User clicks "Send USDC" chip or types "Send 50 USDC to Alice"
2. Command is parsed via `parse-voice-command` with address book context
3. `executeAction` returns `needsConfirmation: true` with structured DeFi data
4. Confirmation card renders with amount, recipient, and network
5. User clicks "Approve"
6. `confirmAction` calls `wallet.sendUsdc(amount, recipient)`
7. Success: show green result card with tx hash
8. Failure: show error message in chat

**Files modified:**
- `src/components/FinancialAdvisorChat.tsx` -- add wallet hook, address book, DeFi chips, enhanced confirmation cards
- `src/hooks/useVoiceActions.ts` -- add `confirmAction` for DeFi, expand handler interface
- `supabase/functions/parse-voice-command/index.ts` -- accept and use address book context
- `supabase/functions/financial-advisor/index.ts` -- accept and use wallet context in system prompt

