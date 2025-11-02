# On-Chain ZK Proof Verification (Same as Baanx Demo)

## Overview

The x402 demo now uses **on-chain ZK proof verification** using the same `HonkVerifier` contract as the baanx demo. This means proofs are verified on-chain (on testnet/mainnet), not just locally.

## Architecture

1. **HonkVerifier Contract**: Deployed on-chain, verifies ZK proofs using the verification key
2. **X402Adapter**: Calls `verifier.verify(proof, publicInputs)` to verify proofs on-chain
3. **Proof Generation**: Real ZK proofs generated using Barretenberg (same as baanx)
4. **Public Inputs**: Extracted from the witness and passed to the verifier

## Deployment

### Step 1: Deploy HonkVerifier

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo
./scripts/deploy-honk-verifier.sh
```

This will:
- Deploy `HonkVerifier.sol` from `lib/precompute-circuit/`
- Output the deployed address
- Use the same verification key as baanx demo

### Step 2: Deploy X402Adapter with Verifier

```bash
# Set environment variables
export RPC_URL=http://localhost:8545
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export POLICY_ADDR=0x5FbDB2315678afecb367f032d93F642f64180aa3  # SimplePolicyGate
export VERIFIER_ADDR=<HONK_VERIFIER_ADDRESS_FROM_STEP_1>

# Deploy X402Adapter
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo
forge create contracts/X402Adapter.sol:X402Adapter \
  --constructor-args $POLICY_ADDR $VERIFIER_ADDR 0x0000000000000000000000000000000000000000 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## How It Works

### 1. Proof Generation (Off-Chain)

When a user creates a subscription:
- Real ZK proofs are generated using `bb prove` (Barretenberg)
- Public inputs are extracted: `[root, public_amount, ext_data_hash, nullifier]`
- Proof and public inputs are stored

### 2. Proof Verification (On-Chain)

When executing a payment (`take` or `redeemToPublic`):

```solidity
// In X402Adapter.sol
bytes32[] memory publicInputs = _extractPublicInputs(p, amount);
require(verifier.verify(proof, publicInputs), "invalid proof");
```

The `HonkVerifier.verify()` function:
- Checks proof length (must be `PROOF_SIZE * 32` bytes)
- Loads the verification key (embedded in contract)
- Verifies the proof using the Honk protocol
- Returns `true` if proof is valid

### 3. Public Inputs

The precompute circuit expects 4 public inputs:
1. **root**: Merkle root of the shielded pool
2. **public_amount**: Negative amount (circuit requires `amount + public_amount == 0`)
3. **ext_data_hash**: External data hash (0 for precompute)
4. **nullifier**: Nullifier hash (prevents double-spending)

**Important**: The public inputs must match what was used when generating the proof. Currently, we derive them deterministically, but in production they should come from the actual proof witness.

## Differences from Baanx Demo

The baanx demo:
- ✅ Uses the same `HonkVerifier.sol` contract
- ✅ Deploys verifiers for precompute, transact, reserve circuits
- ✅ Verifies proofs on-chain before executing transactions

Our x402 demo:
- ✅ Uses the same `HonkVerifier.sol` for precompute circuit
- ✅ Verifies proofs on-chain in `X402Adapter.take()` and `redeemToPublic()`
- ⚠️ Public inputs are currently derived deterministically (should match proof witness)

## Testing

To test on-chain verification:

1. **Generate a real ZK proof** (already working):
   ```bash
   # UI will generate real ZK proofs via /api/precomputes
   ```

2. **Submit a payment**:
   ```bash
   # UI calls /api/execute with proof + permit
   # X402Adapter verifies proof on-chain
   ```

3. **Check verification**:
   - If proof is valid: transaction succeeds
   - If proof is invalid: transaction reverts with "invalid proof"

## Next Steps

1. **Match Public Inputs**: Update `_extractPublicInputs()` to use actual witness values from proof generation
2. **Testnet Deployment**: Deploy to Sepolia/Holesky testnet
3. **Gas Optimization**: Optimize verifier calls for gas efficiency
4. **Batch Verification**: Consider batch verification for multiple proofs (if supported)

## References

- **HonkVerifier**: `demo/lib/precompute-circuit/HonkVerifier.sol`
- **Baanx Deployment**: `demo/scripts/deploy_bermuda.sh` (lines 44-56)
- **Barretenberg**: https://github.com/AztecProtocol/barretenberg



