

# Fix DCA Trigger CRE Workflow to Use Correct SDK API

## Problem

The current `dca-trigger-ts/main.ts` uses a fabricated `Workflow` / `addStep` API pattern that does not exist in the `@chainlink/cre-sdk`. The real SDK uses `cre.Handler()` with a `CronCapability` trigger and a callback receiving `(runtime, config)`, plus `HTTPClient` for HTTP calls with consensus -- exactly as the working `portfolio-summary-ts/main.ts` does.

## Solution

Rewrite `main.ts` to use the correct CRE SDK API while preserving all existing business logic (strategy filtering, budget checks, dip-buy placeholders, execute-dca-order calls).

## Changes

### `incontrol-cre-ts/dca-trigger-ts/main.ts` -- Full rewrite

**Before (broken):**
```text
import { Workflow, Config } from "@chainlink/cre-sdk";
const workflow = new Workflow<DCAConfig>({ ... });
workflow.addStep("fetch-due-strategies", async (ctx) => { ... });
workflow.addStep("execute-orders", async (ctx) => { ... });
export default workflow;
```

**After (correct SDK pattern):**
```text
import * as cre from "@chainlink/cre-sdk";

type DCAConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  cronSecret: string;
  priceApiUrl?: string;
};

export default cre.Handler(
  new cre.capabilities.CronCapability().trigger({
    schedule: "0 0 */1 * * *"  // every hour (config overrides)
  }),
  async (config: DCAConfig, runtime: cre.Runtime) => {
    // 1. Fetch active strategies via HTTPClient with consensus
    // 2. Filter due strategies by frequency
    // 3. For each due strategy: budget check, price fetch, execute order
    // All using runtime.runInNodeMode() + HTTPClient instead of bare fetch()
  }
);
```

**Key API corrections:**

| Old (broken) | New (correct) |
|---|---|
| `import { Workflow, Config }` | `import * as cre` |
| `new Workflow<T>()` | `cre.Handler(trigger, callback)` |
| `workflow.addStep()` | Single callback function |
| `ctx.config` / `ctx.state` | `config` and local variables |
| Bare `fetch()` calls | `cre.capabilities.HTTPClient` with `runtime.runInNodeMode()` and consensus |
| `export default workflow` | `export default cre.Handler(...)` |

**Business logic preserved:**
- Fetch all active strategies from Supabase REST API
- Filter strategies due for execution based on frequency (hourly/daily/weekly/biweekly/monthly)
- Budget remaining checks and auto-skip when exhausted
- Price fetching for dip-buy logic (placeholder comparison kept as-is)
- POST to `execute-dca-order` edge function for each due strategy
- Result logging

### `incontrol-cre-ts/dca-trigger-ts/package.json` -- Bump SDK version

Update `@chainlink/cre-sdk` from `^1.0.7` to `^1.0.8` to match the root project.

