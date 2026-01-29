
# Fix for Tutorial Step 7 Not Showing

## Problem Summary

The tutorial is getting stuck on step 7 (Assets Section) because:

1. **Missing unique keys on AnimatePresence children** - Framer Motion requires unique keys for each child inside `AnimatePresence` to properly animate elements. The console shows duplicate key warnings which cause unpredictable behavior.

2. **Tooltip renders at wrong position** - When the target element isn't found or positioned correctly, the tooltip still renders at `(0, 0)` instead of waiting for valid coordinates.

3. **Race condition with scroll** - The element might not be in view when the overlay tries to calculate its position, causing the lookup to fail.

---

## Solution

### 1. Add unique keys to AnimatePresence children

Add a `key` prop to each motion element inside AnimatePresence that changes based on the current step:

```typescript
// Before
<motion.div initial={{ opacity: 0 }} ...>

// After  
<motion.div key={`overlay-${currentStep}`} initial={{ opacity: 0 }} ...>
```

### 2. Wait for valid target position before rendering tooltip

Only render the spotlight and tooltip when we have valid coordinates:

```typescript
// Before
if (!isActive || !currentStepData?.target) {
  return null;
}

// After
if (!isActive || !currentStepData?.target) {
  return null;
}

// Don't render until we have valid position data
if (!targetRect) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/75" />
  );
}
```

### 3. Add retry logic for element finding

If the element isn't found immediately, retry a few times with increasing delays to handle slow-loading elements:

```typescript
const updateTargetPosition = useCallback(() => {
  if (!currentStepData?.target) {
    setTargetRect(null);
    return;
  }

  const findElement = (attempt = 0) => {
    const element = document.querySelector(`[data-tutorial="${currentStepData.target}"]`);
    if (element) {
      // Calculate position...
    } else if (attempt < 3) {
      // Retry after delay
      setTimeout(() => findElement(attempt + 1), 200);
    } else {
      // Skip to next step if element not found after retries
      console.warn(`Tutorial element not found: ${currentStepData.target}`);
      setTargetRect(null);
    }
  };
  
  findElement();
}, [currentStepData]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Tutorial/TutorialOverlay.tsx` | Add keys to motion elements, show loading state when targetRect is null, add retry logic for element finding |

---

## Technical Details

### Updated TutorialOverlay.tsx structure:

```typescript
return (
  <AnimatePresence mode="wait">
    {/* Loading overlay while finding element */}
    {!targetRect && (
      <motion.div
        key="loading-overlay"
        className="fixed inset-0 z-[90] bg-black/75"
      />
    )}
    
    {/* Dark overlay with spotlight - only when we have position */}
    {targetRect && (
      <motion.div
        key={`spotlight-${currentStep}`}
        // ... spotlight styles
      />
    )}
    
    {/* Tooltip - only when we have position */}
    {targetRect && (
      <motion.div
        key={`tooltip-${currentStep}`}
        // ... tooltip content
      />
    )}
  </AnimatePresence>
);
```

### Key changes:
- Add `mode="wait"` to AnimatePresence for smoother transitions
- Add unique `key` props to each motion element
- Conditionally render spotlight and tooltip only when `targetRect` is valid
- Show a simple dark overlay while searching for the element
- Add retry logic with 3 attempts and 200ms delays between attempts

---

## Expected Outcome

After these fixes:
- Step 7 will properly find and highlight the "Assets by Category" section
- The tooltip will only appear once the element is located
- No more React key warnings in the console
- Smooth transitions between steps
