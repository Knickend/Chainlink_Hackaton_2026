

## CRE Workflow Audit: Discrepancies Found

After comparing all three workflows against the latest CRE TypeScript SDK documentation (fetched from docs.chain.link), here are the discrepancies found:

---

### 1. `initWorkflow` Signature (ALL THREE WORKFLOWS)

**Current code:**
```text
const initWorkflow = (rawConfig?: unknown) => { ... }
```

**Official docs pattern:**
```text
const initWorkflow = (config: Config) => { ... }
```

The SDK's `Runner.newRunner()` accepts a `configSchema` (Zod) or `configParser` and passes the **already-parsed, typed config** to `initWorkflow`. Your workflows receive `rawConfig?: unknown` and manually parse it inside `initWorkflow`, which duplicates work the Runner already does.

**Impact:** Functional but redundant. The manual `parseConfig()` inside `initWorkflow` is unnecessary if the Runner's `configParser` already runs first. Currently your `Runner.newRunner` passes `configParser`, so the config IS parsed before reaching `initWorkflow` -- but then `initWorkflow` ignores the parsed result and re-parses from `rawConfig`.

**Fix:** Change `initWorkflow` to accept typed `Config` directly, and remove the internal `parseConfig()` call. The Runner's `configParser` already handles parsing.

---

### 2. CronCapability Import Path (ALL THREE WORKFLOWS)

**Current code:**
```text
import { CronCapability } from "./node_modules/@chainlink/cre-sdk/dist/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen.js";
```

**Official docs pattern:**
```text
import { CronCapability } from "@chainlink/cre-sdk"
```

The docs explicitly show `CronCapability` as a direct export from the SDK package. Importing from internal `dist/generated-sdk/...` paths is fragile -- it will break on any SDK version update that restructures internals.

**Impact:** Works now, but will break on SDK upgrades. This is the highest-priority fix.

**Fix:** Change to `import { CronCapability } from "@chainlink/cre-sdk"` in all three workflows.

---

### 3. `consensusMedianAggregation` Used on Strings (x402 + portfolio-summary)

**Official docs (consensus-ts):**
> `consensusMedianAggregation<T>()` -- Supported Types: `number`, `bigint`, `Date`

**x402-cre-verified workflow** returns a raw JSON **string** from `runInNodeMode` and aggregates it with `consensusMedianAggregation()`. Median aggregation on strings is undefined behavior -- it's designed for numeric types only.

**portfolio-summary workflow** has the same issue: one path returns a string `"[]"` or `"0"` from the node callback.

**Impact:** May silently produce incorrect results or fail in production when nodes return slightly different string values. String consensus should use `consensusIdenticalAggregation<string>()` instead.

**Fix:**
- For string returns (JSON payloads): use `consensusIdenticalAggregation<string>()`
- For numeric returns (counts, prices): `consensusMedianAggregation<number>()` is correct

---

### 4. `await main()` at Module Level (ALL THREE WORKFLOWS)

**Current code:**
```text
export async function main() { ... }
await main();
```

**Official docs (Pattern 1 - recommended):**
```text
export async function main() { ... }
// No need to call main() - the SDK automatically appends:
// main().catch(sendErrorResponse)
```

The docs state that the SDK **automatically** appends `main().catch(sendErrorResponse)` if you don't call it yourself. By manually calling `await main()`, you bypass the SDK's error handling. If `main()` throws, the error won't be reported to CRE properly.

**Impact:** Errors during workflow initialization won't be reported to the CRE execution UI. You lose visibility into failures.

**Fix:** Remove `await main();` from the bottom of each file. The SDK handles invocation automatically.

---

### 5. Handler Callback Signature Missing `payload` Parameter (ALL THREE)

**Official docs:**
```text
const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => { ... }
```

**Current code:**
```text
const handler = async (runtime: cre.Runtime) => { ... }
```

The cron trigger callback should receive both `runtime` and a `CronPayload` parameter. Currently the payload is ignored. Also, the `Runtime` should be typed as `Runtime<Config>` not just `Runtime`.

**Impact:** Low -- `CronPayload` for cron triggers is minimal. But typed `Runtime<Config>` would give access to `runtime.config` instead of manual config parsing.

---

### 6. High-Level HTTPClient API Not Used (ALL THREE)

The docs recommend a **high-level** `httpClient.sendRequest(runtime, fetchFn, consensusAggregation)` pattern that automatically handles `runInNodeMode`. All three workflows use the low-level pattern with manual `runtime.runInNodeMode()` + `new HTTPClient()` inside the callback.

**Impact:** Functional but more verbose. The high-level API reduces boilerplate and is the recommended approach.

**Fix:** Optional refactor to use the high-level API. Not a correctness issue.

---

### Summary of Fixes by Priority

| Priority | Issue | Workflows Affected |
|----------|-------|--------------------|
| HIGH | CronCapability import from internal dist path | All 3 |
| HIGH | `consensusMedianAggregation` on strings | x402, portfolio-summary |
| MEDIUM | `await main()` bypasses SDK error handling | All 3 |
| MEDIUM | `initWorkflow` receives raw config instead of typed Config | All 3 |
| LOW | Missing `CronPayload` parameter in handler | All 3 |
| LOW | Not using high-level HTTPClient API | All 3 |

---

### Build Errors (Separate Issue)

The `recharts` v3 type errors in `chart.tsx` and `CancellationFeedback.tsx` are unrelated to CRE but block the build. These will also be fixed:

- `chart.tsx`: Cast tooltip props to `any` for `payload` and `label` access; cast legend `payload` to typed array
- `CancellationFeedback.tsx`: Cast pie label render props to access `label` property

---

### Implementation Plan

1. Fix all 3 CRE workflows:
   - Update `CronCapability` import to use `@chainlink/cre-sdk`
   - Fix consensus aggregation type for string returns
   - Remove `await main()` calls
   - Update `initWorkflow` signature to accept typed config
2. Fix recharts build errors in `chart.tsx` and `CancellationFeedback.tsx`

