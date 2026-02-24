

# Fix: Stabilize `useComposedRefs` to Break the Infinite Loop

## Root Cause

The `useComposedRefs` function in our Radix patch (`src/lib/radix-compose-refs-patch.ts`) has a critical memoization bug:

```typescript
function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  return useCallback(composeRefs(...refs), refs);
  //                                      ^^^^ NEW array every render!
}
```

`refs` is a JavaScript rest parameter, which creates a **new array on every function call**. Since `useCallback` does a shallow comparison of its dependency array, it sees a different array reference each render and **never memoizes**. This means a brand-new composed ref callback is returned on every render.

In React 19, when React detects a new ref callback:
1. It calls the **old** callback's cleanup (which sets all refs to `null`)
2. Setting a ref to `null` calls `setNode(null)` inside Radix's `usePresence` -- a `setState`
3. The `setState` triggers a re-render
4. The re-render creates yet another new composed ref (because memoization is broken)
5. React sees another new ref, calls old cleanup again... **infinite loop**

This specifically crashes the Admin page because it uses `Tabs` with `TabsContent`, which uses `Presence` internally, which uses `useComposedRefs`.

## Solution

Rewrite `useComposedRefs` to use a **stable ref callback pattern**:
- Store the list of refs in a `useRef` (updated every render, no re-render)
- Return a single stable callback via `useCallback(fn, [])` that reads from the ref
- The callback never changes identity, so React 19 never triggers cleanup/re-attach cycles

## Changes

### File: `src/lib/radix-compose-refs-patch.ts`

Replace the `useComposedRefs` function with:

```typescript
function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  const refsRef = useRef(refs);
  // Update the stored refs on every render (no re-render triggered)
  refsRef.current = refs;

  // Return a STABLE callback that never changes identity
  return useCallback((node: T) => {
    refsRef.current.forEach((ref) => setRef(ref, node));
  }, []);
}
```

Also add `useRef` to the import from React.

This is a single-file change. No other files need modification.

## Why This Works

- The returned callback has a **stable identity** (empty deps array) so React 19 never cycles cleanup/re-attach
- The `refsRef` is updated every render so it always points to the latest refs, but updating a ref doesn't trigger a re-render
- `setRef` still discards return values from ref callbacks, preventing cleanup leakage
- The `composeRefs` standalone function (used outside hooks) remains unchanged since it doesn't have the memoization issue

## Technical Details

| Aspect | Before (Broken) | After (Fixed) |
|---|---|---|
| Deps array | `refs` (new array each render) | `[]` (never changes) |
| Callback identity | New function every render | Stable across renders |
| React 19 cleanup cycle | Triggered every render | Never triggered |
| Ref freshness | Always current (inline) | Always current (via useRef) |

