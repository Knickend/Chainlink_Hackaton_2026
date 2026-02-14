

## Show Full Wallet Address with Copy Button

### Changes (src/components/settings/AgentSection.tsx)

1. Remove the `truncate max-w-[200px]` classes from the wallet address span so the full address is visible
2. Add a copy-to-clipboard button next to the address using the `Copy` icon from lucide-react
3. Use `navigator.clipboard.writeText()` with a toast confirmation on click

The address row will change from a simple text display to a row with the full address and a small copy icon button beside it.

### Technical Details

- Import `Copy` and `Check` from lucide-react
- Add a small state `copied` to show a brief checkmark after copying
- Remove `truncate max-w-[200px]` from the address span
- Add `break-all` class so the long address wraps naturally
- Place a ghost icon button inline after the address text

