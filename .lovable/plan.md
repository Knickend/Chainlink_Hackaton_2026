

## Fix: Policy Engine Deployment - Wrong Constructor Args

### Root Cause (Two Bugs)

1. **Wrong CONSTRUCTOR_ARGS_HEX_LEN**: The original creation tx used 68 bytes of `_data` (not 36), making the total constructor args 384 hex chars (6 words), not 320 (5 words). Stripping only 320 chars leaves 1 word of old data in the creation code, corrupting the deployed bytecode.

2. **Wrong `initialize` selector**: The actual PolicyEngine uses `initialize(uint8,address)` (selector `0x85ee7ba6`) with two parameters: `defaultResult` and `admin`. Our code computed the selector for `initialize(uint8)` (`0x4351e6b6`) which doesn't exist on the contract.

### Evidence

Original tx constructor args (from `0x9f93...`):
```text
word 0: impl address (013f9b3a...)
word 1: offset = 0x40 (64)
word 2: length = 0x44 (68 bytes)  <-- NOT 0x24 (36 bytes)
word 3: 85ee7ba6 + uint8(1)       <-- selector is 85ee7ba6, NOT 4351e6b6
word 4: address arg               <-- second parameter (admin)
word 5: padding
Total = 6 words = 384 hex chars
```

Our failed tx had `4351e6b6` (wrong selector) and only stripped 320 chars (leaving corruption).

### Fix in `supabase/functions/privacy-vault/index.ts`

In the `deploy-policy-engine` case (around lines 838-856):

1. Change `CONSTRUCTOR_ARGS_HEX_LEN` from `320` to `384`
2. Use the correct selector `0x85ee7ba6` for `initialize(uint8,address)` instead of computing `keccak256("initialize(uint8)")`
3. Build `_data` as 68 bytes: `85ee7ba6` + `encode(uint8 0)` + `encode(address deployer)` = 4 + 32 + 32 = 68 bytes
4. Update the ABI-encoded bytes:
   - Length = 68 (0x44) instead of 36 (0x24)
   - initData = 68 bytes padded to 96 bytes (3 words = 192 hex chars)
   - Total constructor args = address(32) + offset(32) + length(32) + data(96) = 192 bytes = 384 hex chars

### Specific Code Changes

```text
// OLD (line 839):
const CONSTRUCTOR_ARGS_HEX_LEN = 320;

// NEW:
const CONSTRUCTOR_ARGS_HEX_LEN = 384;

// OLD (lines 845-849):
const initSelector = bytesToHex(keccak256(...("initialize(uint8)"))).slice(0,10);
const initData = initSelector.slice(2) + encodeUint256(0);
const initDataPadded = initData.padEnd(128, "0");

// NEW:
const initSelector = "85ee7ba6";  // initialize(uint8,address)
const accountAddr = "0x" + deriveAddress(privateKeyHex).slice(2);
const initData = initSelector + encodeUint256(0) + padTo32(accountAddr);
// 8 + 64 + 64 = 136 hex chars = 68 bytes, pad to 96 bytes = 192 hex chars
const initDataPadded = initData.padEnd(192, "0");

// OLD (line 856):
const constructorArgs = padTo32(implAddress) + encodeUint256(64) + encodeUint256(36) + initDataPadded;

// NEW:
const constructorArgs = padTo32(implAddress) + encodeUint256(64) + encodeUint256(68) + initDataPadded;
```

Note: `accountAddr` derivation must move before this block (it's currently at line 862, after the constructor args construction). Move it earlier or derive it inline.

### Expected Outcome
- Correct creation bytecode (no corruption from leftover old constructor args)
- Correct `initialize(uint8,address)` call with `defaultResult=0` (Allowed) and `admin=ourAccount`
- Proxy deployment succeeds, giving us a permissive PolicyEngine we control

