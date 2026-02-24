

## Fix Build Errors

### 1. `supabase/functions/agent-wallet/index.ts` (line 1068)

**Error:** `txHash` is `string | null` but the type expects `string | undefined`.

**Fix:** Change `txHash` to `txHash: txHash ?? undefined` in the `sendTransactionEmail` call at line 1068.

### 2. `supabase/functions/check-rebalance/index.ts` (line 168)

**Error:** `error` is of type `unknown`, can't access `.message`.

**Fix:** Change `error.message` to `error instanceof Error ? error.message : String(error)` at line 168.

### 3. `src/components/ui/chart.tsx` (lines 92-101, 230-236)

**Error:** Recharts v3 changed prop types -- `payload`, `label` no longer exist on the Tooltip component props, and `LegendProps` no longer has a `payload` key that satisfies the Pick constraint.

**Fix:**
- **ChartTooltipContent** (line 94): Replace `React.ComponentProps<typeof RechartsPrimitive.Tooltip>` with an explicit inline type containing `active?: boolean; payload?: Array<Record<string, any>>; label?: string; labelFormatter?: (label: any, payload: any[]) => React.ReactNode; formatter?: (value: any, name: string, item: any, index: number, payload: any) => React.ReactNode; color?: string;`
- **ChartLegendContent** (line 233): Replace `Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign">` with `{ payload?: Array<{ value: string; dataKey?: string; color?: string }>; verticalAlign?: "top" | "bottom" }`

### 4. `src/components/admin/CancellationFeedback.tsx` (line 180)

**Error:** `label` doesn't exist on `PieLabelRenderProps`.

**Fix:** Cast the render props parameter: change `({ label, percent })` to `((props: any) => ...)` pattern, then access `props.label` and `props.percent`.

---

All four fixes are type-only changes with zero runtime behavior change.
