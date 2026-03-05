

# Add Recipient Withdrawal Note to Private Transfer UI

## Change

In `src/components/settings/PrivacyVaultSection.tsx`, add an info note after the "Send Privately" button (after line 804, before the closing `</div>`) explaining that recipients must withdraw from the vault to see tokens on-chain.

### Implementation

Insert a small muted info paragraph:

```tsx
<p className="text-xs text-muted-foreground mt-2">
  ℹ️ Private transfers update the vault's internal ledger only. Recipients must withdraw from the vault to move tokens to their on-chain wallet.
</p>
```

This goes inside the `showTransfer` branch, after the button row (line 804), so it's visible whenever the transfer form is open.

Single file change, no backend modifications.

