

## Fix: "Re-register with My PE" Button Not Visible

### Root Cause

The button has two conditions that must both be true:
1. `deployedPE` must be set (non-null)
2. `status?.policyEngine` must exist and differ from `deployedPE`

The most likely issue is that `deployedPE` is `null`. The localStorage persistence was only added in the last edit, so if you deployed your Policy Engine before that change, the address was never saved to localStorage. After a page refresh, `deployedPE` resets to `null` and the button disappears.

### Fix

**In `src/components/settings/PrivacyVaultSection.tsx`:**

1. **Auto-detect deployed PE from the database**: Instead of relying solely on localStorage, also check the `agent_wallets` table (or a dedicated query) on mount to see if a PE was previously deployed. Alternatively, add a simple text input where you can paste your PE address manually.

2. **Simpler immediate fix**: Add a small "Set PE Address" input field in the Deploy PE section so you can manually enter your previously deployed PE address (`0x8813...`). This stores it in localStorage and immediately enables the "Re-register" button.

### Changes

**`src/components/settings/PrivacyVaultSection.tsx`:**

- In the "Deploy My Policy Engine" collapsible section, when `deployedPE` is null, add a secondary option below the deploy button:
  - A small input field with placeholder "Paste existing PE address"
  - A "Set" button that validates the address (starts with 0x, 42 chars) and saves it to both state and localStorage
  - Label: "Already deployed? Enter your PE address:"

- This way, even if the PE was deployed before localStorage persistence was added, the user can recover it without redeploying

### Code Sketch

```text
{!deployedPE && (
  <div className="mt-3 space-y-2">
    <p className="text-xs text-muted-foreground">
      Already deployed a PE? Paste its address:
    </p>
    <div className="flex gap-2">
      <Input
        placeholder="0x..."
        value={manualPE}
        onChange={(e) => setManualPE(e.target.value)}
        className="h-7 text-xs font-mono"
      />
      <Button size="sm" className="h-7"
        disabled={!manualPE?.match(/^0x[a-fA-F0-9]{40}$/)}
        onClick={() => {
          setDeployedPE(manualPE);
          localStorage.setItem('privacy-vault-deployed-pe', manualPE);
        }}>
        Set
      </Button>
    </div>
  </div>
)}
```

### Expected Outcome
- You can paste `0x8813...` (your deployed PE) into the input field
- It gets saved to localStorage and state
- The "Re-register with My PE" button immediately appears next to USDC
- Clicking it calls `re-register-token` with your PE address

