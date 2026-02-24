/**
 * Patched version of @radix-ui/react-compose-refs to fix React 19 compatibility.
 *
 * React 19 ref callbacks can return cleanup functions. The original `setRef`
 * returns `ref(value)`, which leaks the cleanup into `composeRefs`. This causes
 * `composeRefs` to install a composite cleanup that calls `setRef(ref, null)`
 * for every ref on unmount, which triggers `setNode(null)` → re-render →
 * new composed ref → React calls cleanup → calls refs again → infinite loop.
 *
 * Fix: call ref callbacks but do NOT propagate their return value.
 *
 * See: https://github.com/radix-ui/primitives/issues/3799
 */
import { useCallback, useRef } from 'react';

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T) {
  if (typeof ref === 'function') {
    // Call the ref but discard the return value to prevent React 19
    // cleanup functions from being captured by composeRefs.
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

function composeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T) => {
    refs.forEach((ref) => setRef(ref, node));
    // Do NOT return a cleanup function — React 19 would call it,
    // null all refs, trigger setState, and cause an infinite loop.
  };
}

function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((node: T) => {
    refsRef.current.forEach((ref) => setRef(ref, node));
  }, []);
}

export { composeRefs, useComposedRefs, setRef };
