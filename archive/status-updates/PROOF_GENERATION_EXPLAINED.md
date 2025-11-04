# ZK Proof Generation: Demo vs Production

## TL;DR

**x402 Demo**: ✅ Works WITHOUT submodules (uses mock proofs)  
**Production**: ❌ Needs circuit submodules (for real ZK proofs)

## Current Demo Implementation

The mock-backend generates **placeholder proofs** - no ZK circuits needed:

```typescript
// From demo/mock-backend/src/test-subscription-scenario.ts
function generatePrecompute(...) {
  // Simulate ZK proof generation (in production: call actual ZK circuit)
  
  // Generate mock proof (just hex-encoded JSON)
  const proofData = {
    witness: JSON.stringify(witness),
    timestamp: Date.now(),
  }
  const proof = `0x${Buffer.from(JSON.stringify(proofData)).toString('hex')}`
  
  return { proof, publicInputs, ... }
}
```

**No real ZK computation** - just simulated proof bytes for demo purposes.

## What Submodules Contain (Not Needed for Demo)

These are for **production** ZK proof generation:

- `precompute-circuit/` - Generates precompute ZK proofs
- `stx-circuit/` - Shielded transaction circuit
- `reserve-circuit/` - Reserve proof circuit  
- `pool/` - Bermuda pool contracts (verification)
- `relayer/` - Transaction relayer service
- `registry/` - Compliance registry

## When You Need Real ZK Proofs

For production, you'd need:

1. **Circuit files** (from submodules):
   - `.circom` files (circuit definitions)
   - `.wasm` files (compiled circuits)
   - `.zkey` files (proving keys)
   - `.vkey.json` files (verification keys)

2. **ZK proving library**:
   - `snarkjs` (for Groth16/PLONK proofs)
   - Or custom Rust prover

3. **Real proof generation**:
```typescript
// Production code (not in demo):
const proof = await snarkjs.groth16.fullProve(
  witness,
  wasmFile,
  zkeyFile
)
```

## x402 Demo Works With Mocks

The demo shows the **entire flow** without real proofs:

1. ✅ **Wallet connection** - works
2. ✅ **Permit signing (EIP-712)** - works (real signatures!)  
3. ✅ **Subscription UI** - works
4. ✅ **Mock proof generation** - works (placeholder bytes)
5. ⚠️ **Smart contract verification** - would fail on real verifier (expects real proof format)

For the x402 demo, this is **perfect** - you can demonstrate the UX and flow without the complexity of ZK circuits!

## Summary

```
Demo (now):        Mock proofs ✅ No submodules needed
Production (later): Real proofs ❌ Needs circuit submodules
```

**You don't need git submodule access for the x402 demo!** 🎉



