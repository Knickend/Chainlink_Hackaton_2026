

# Fix: Force Vite to Re-bundle Dependencies with Patched Code

## Problem

The source file `src/lib/radix-compose-refs-patch.ts` has the correct fix, but Vite's dependency pre-bundling cache (`.vite/deps/`) is serving a **stale version** of the patch. The cached chunk `chunk-H7AAVJOF.js` still contains:

1. `composeRefs` with a cleanup return (causes React 19 to null all refs on ref identity change)
2. `useComposedRefs` with `refs` as dependency array (new array every render, so `useCallback` never memoizes)

This means our patch edits have had **zero runtime effect** because the old pre-bundled code keeps getting served.

## Root Cause Chain

```text
Vite dep cache serves old patch code
  -> useComposedRefs returns new function every render (broken useCallback deps)
  -> React 19 detects new ref callback
  -> Calls old callback cleanup (the stale composeRefs cleanup return)
  -> Cleanup nulls all refs -> triggers setState in Presence
  -> Re-render -> new useComposedRefs -> new function -> INFINITE LOOP
```

## Solution

### 1. Force Vite to re-optimize dependencies

Add `optimizeDeps.force: true` to `vite.config.ts`. This tells Vite to discard the cached pre-bundled deps and rebuild them, picking up the latest version of our patch file.

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  server: { ... },
  plugins: [...],
  optimizeDeps: {
    force: true,  // Force re-optimization to pick up patched compose-refs
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@radix-ui/react-compose-refs": path.resolve(__dirname, "./src/lib/radix-compose-refs-patch.ts"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
```

### 2. Verify the patch file is correct (it already is)

The current `src/lib/radix-compose-refs-patch.ts` already has:
- `setRef` that discards return values
- `composeRefs` that does NOT return a cleanup
- `useComposedRefs` that uses `useRef` + stable `useCallback(fn, [])`

No changes needed to this file.

## Files to Change

| File | Change |
|---|---|
| `vite.config.ts` | Add `optimizeDeps: { force: true }` |

This is a single-line addition. No other files need to change.

## Why This Works

- `optimizeDeps.force: true` tells Vite to re-run esbuild on all dependencies, discarding the stale `.vite/deps/` cache
- When re-bundled, Radix packages that import `@radix-ui/react-compose-refs` will resolve to our patch file (via the alias)
- The re-bundled `chunk-H7AAVJOF.js` will contain our fixed code with stable callbacks and no cleanup returns
- The infinite loop breaks because React 19 never sees a new ref callback identity

## Note on framer-motion

`framer-motion` bundles its own copy of `composeRefs`/`useComposedRefs` with the same broken pattern. However, it only uses it in `LayoutGroup` which is not currently triggering the crash. If it becomes a problem later, we can address it separately by patching framer-motion's exports or avoiding layout animations.

