

# Replace "CL" Text with Chainlink Logo

## Changes

### 1. Add the Chainlink logo to the project
Copy the uploaded Chainlink hexagon logo to `src/assets/chainlink-logo.png`.

### 2. Update the Chainlink tab trigger
**`src/components/ExchangeRatesDialog.tsx`**

- Import the logo: `import chainlinkLogo from "@/assets/chainlink-logo.png"`
- Replace the `<span className="w-4 h-4 inline-block font-mono">CL</span>` with `<img src={chainlinkLogo} alt="Chainlink" className="w-4 h-4" />`

| File | Change |
|------|--------|
| `src/assets/chainlink-logo.png` | New file -- copied from uploaded image |
| `src/components/ExchangeRatesDialog.tsx` | Replace "CL" text span with Chainlink logo image |

