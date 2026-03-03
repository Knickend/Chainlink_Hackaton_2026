

## Fix: Allow Changing PE Address When One Is Already Set

### Problem

The manual PE address input only appears when `deployedPE` is null. Since you already have a PE deployed, you see the "Policy Engine Deployed" box with no option to change the address.

### Changes

**`src/components/settings/PrivacyVaultSection.tsx` (lines 686-706):**

Add a small "Change" button next to the deployed PE display that reveals the same paste-and-set input field. This lets you update the PE address at any time.

Specifically, inside the `deployedPE` truthy branch (the green "Policy Engine Deployed" box):

- Add a "Change" link/button below the existing text
- Clicking it shows an inline input + "Set" button (same as the manual recovery input)
- Use a `showChangePE` boolean state to toggle visibility

```text
// After line 704 ("Use the Register with My PE buttons...")
<Button
  variant="link"
  size="sm"
  className="h-5 text-xs px-0"
  onClick={() => setShowChangePE(!showChangePE)}
>
  Change PE Address
</Button>
{showChangePE && (
  <div className="flex gap-2 mt-2">
    <Input
      placeholder="0x..."
      value={manualPE}
      onChange={(e) => setManualPE(e.target.value)}
      className="h-7 text-xs font-mono"
    />
    <Button
      size="sm" className="h-7"
      disabled={!manualPE?.match(/^0x[a-fA-F0-9]{40}$/)}
      onClick={() => {
        setDeployedPE(manualPE);
        localStorage.setItem('privacy-vault-deployed-pe', manualPE);
        setShowChangePE(false);
        toast({ title: 'PE Address Updated' });
      }}
    >
      Set
    </Button>
  </div>
)}
```

Also add `const [showChangePE, setShowChangePE] = useState(false);` alongside the other state variables.

### Expected Outcome

- When you have a PE deployed, you see a "Change PE Address" link below the deployed address
- Clicking it reveals the paste input to update to a different PE address
- After setting it, the "Re-register with My PE" button appears for tokens registered with a different PE

