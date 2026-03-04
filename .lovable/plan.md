

# Add Base Sepolia Network Indicator to Agentic Wallet Card

## Change

Add a "Base Sepolia" network badge next to the "Connected" badge in the Agentic Wallet card header (line 87 of `AgentSection.tsx`). Show it only when the wallet is connected.

## Implementation

In `src/components/settings/AgentSection.tsx`, after the existing `Connected` badge, add a second badge indicating the network:

```tsx
{status.connected && <Badge variant="secondary">Connected</Badge>}
{status.connected && <Badge variant="outline" className="text-xs">Base Sepolia</Badge>}
```

This is a single-line addition. No other files need changes.

