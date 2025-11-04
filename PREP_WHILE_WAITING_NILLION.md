# Prep Work While Waiting for Nillion API Access

This document tracks what we can build **right now** before Nillion nilCC API access is available.

## ✅ What's Already Done

### Contracts
- ✅ **DelegationAnchor.sol** - Created at `demo/contracts/DelegationAnchor.sol`
  - Stores Merkle root for delegation verification
  - Only pool/poster can update root
  - Ready to deploy

### SDK/Library
- ✅ **lib/delegation.ts** - Created at `demo/apps/merchant-demo/lib/delegation.ts`
  - `buildDelegationLeaf()` - Builds leaf from policy hash + salt
  - `actionHash()` - Computes action hash for attestation binding
  - `getMerkleProofForDelegation()` - Returns empty array for demo (TODO: pool integration)
  - `isValidLeaf()` - Validates leaf format

### API Endpoints
- ✅ **/api/delegation-root.ts** - Fetches latest root from DelegationAnchor contract
- ✅ **/api/nillion/attest.ts** - Mock attestation endpoint (ECDSA demo signature)
  - **NOTE**: This will be replaced with real Nillion nilCC API call when access is available
  - Currently uses demo private key from env var
- ✅ **/api/execute.ts** - Updated to support `takeWithDelegationAnchor` method

### ABIs
- ✅ **DelegationAnchor.json** - Complete ABI for DelegationAnchor contract

## 🚧 What's Next (Can Do Now)

### 1. Add `takeWithDelegationAnchor` to X402Adapter.sol

**File**: `demo/contracts/X402Adapter.sol`

Add new method after existing `take()` method:

```solidity
/**
 * @notice Delegation-aware pull payment: verifies delegation note inclusion + Nillion attestation
 * @param proof ZK proof bytes
 * @param publicInputs Public inputs: [root, public_amount, ext_data_hash, nullifier]
 * @param p EIP-712 permit
 * @param recipient Address to receive funds
 * @param amount Amount to transfer
 * @param root Merkle root from DelegationAnchor
 * @param leafCommitment Delegation leaf commitment (keccak256(policyHash || salt))
 * @param merkleProof Merkle proof array (siblings)
 * @param actionHash Action hash for attestation binding
 * @param attestation Nillion attestation signature (mock in demo)
 */
function takeWithDelegationAnchor(
    bytes calldata proof,
    bytes32[] calldata publicInputs,
    Permit calldata p,
    address recipient,
    uint256 amount,
    bytes32 root,
    bytes32 leafCommitment,
    bytes32[] calldata merkleProof,
    bytes32 actionHash,
    bytes calldata attestation
) external nonReentrant returns (bool) {
    // Existing x402 validations
    require(block.timestamp <= p.expiry, "permit expired");
    require(p.merchant != address(0) && recipient != address(0), "bad addr");
    require(amount <= p.maxAmount, "over max");
    require(publicInputs.length == 4, "invalid public inputs length");
    
    _checkRelayer();
    _checkNonce(p.noteId, p.nonce);
    _verifyPermitSig(p);
    require(verifier.verify(proof, publicInputs), "invalid proof");
    
    // Delegation-specific validations
    IDelegationAnchor anchor = IDelegationAnchor(delegationAnchor); // TODO: add to state
    require(root == anchor.latestRoot(), "stale root");
    require(_verifyMerkle(leafCommitment, root, merkleProof), "bad inclusion");
    _verifyAttestation(leafCommitment, actionHash, root, attestation);
    
    _enforcePolicies(p.merchant, recipient, amount);
    
    emit Take(p.merchant, recipient, p.noteId, amount);
    emit X402TakeDelegated(p.merchant, p.noteId, amount, root, leafCommitment);
    return true;
}

// Helper: Merkle verification
function _verifyMerkle(bytes32 leaf, bytes32 root, bytes32[] memory siblings) internal pure returns (bool) {
    bytes32 h = leaf;
    for (uint256 i = 0; i < siblings.length; i++) {
        bytes32 s = siblings[i];
        h = (h < s) ? keccak256(abi.encodePacked(h, s)) : keccak256(abi.encodePacked(s, h));
    }
    return h == root;
}

// Helper: Attestation verification (demo: ECDSA, production: Nillion nilCC)
function _verifyAttestation(bytes32 leaf, bytes32 actionHash, bytes32 root, bytes calldata signature) internal view {
    // Demo: ECDSA over keccak256(leaf || actionHash || root)
    bytes32 digest = keccak256(abi.encodePacked(leaf, actionHash, root));
    bytes32 ethSignedHash = digest.toEthSignedMessageHash();
    address signer = ethSignedHash.recover(signature);
    require(signer == attestor, "bad attestation"); // TODO: add attestor to state
}
```

**Changes needed in X402Adapter.sol:**
- Add `IDelegationAnchor` interface
- Add `delegationAnchor` and `attestor` to state
- Add to constructor parameters
- Add helper functions `_verifyMerkle()` and `_verifyAttestation()`
- Add event `X402TakeDelegated`

### 2. Update X402Adapter.json ABI

**File**: `demo/apps/merchant-demo/abis/X402Adapter.json`

Add the new function entry for `takeWithDelegationAnchor`:

```json
{
  "type": "function",
  "name": "takeWithDelegationAnchor",
  "inputs": [
    { "name": "proof", "type": "bytes" },
    { "name": "publicInputs", "type": "bytes32[]" },
    {
      "name": "permit",
      "type": "tuple",
      "components": [
        { "name": "noteId", "type": "bytes32" },
        { "name": "merchant", "type": "address" },
        { "name": "maxAmount", "type": "uint256" },
        { "name": "expiry", "type": "uint256" },
        { "name": "nonce", "type": "uint256" },
        { "name": "signature", "type": "bytes" },
        { "name": "merchantCommitment", "type": "bytes32" }
      ]
    },
    { "name": "recipient", "type": "address" },
    { "name": "amount", "type": "uint256" },
    { "name": "root", "type": "bytes32" },
    { "name": "leafCommitment", "type": "bytes32" },
    { "name": "merkleProof", "type": "bytes32[]" },
    { "name": "actionHash", "type": "bytes32" },
    { "name": "attestation", "type": "bytes" }
  ],
  "outputs": [{ "name": "", "type": "bool" }],
  "stateMutability": "nonpayable"
}
```

### 3. Deploy DelegationAnchor Contract

**Script**: `demo/scripts/deploy-delegation-anchor.sh`

```bash
#!/bin/bash
set -e

RPC_URL=${RPC_URL:-http://localhost:8545}
DEPLOYER_PK=${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}

# Default initial root (empty tree)
INITIAL_ROOT=${INITIAL_ROOT:-0x0000000000000000000000000000000000000000000000000000000000000000}
# Default poster (deployer for demo)
POSTER_ADDR=${POSTER_ADDR:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}

cd "$(dirname "$0")/.."

echo "🚀 Deploying DelegationAnchor..."
echo "RPC: $RPC_URL"
echo "Initial Root: $INITIAL_ROOT"
echo "Poster: $POSTER_ADDR"
echo ""

OUT=$(forge create contracts/DelegationAnchor.sol:DelegationAnchor \
  --constructor-args "$POSTER_ADDR" "$INITIAL_ROOT" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PK" \
  --broadcast \
  --via-ir \
  --optimizer-runs 200 2>&1)

ANCHOR_ADDR=$(echo "$OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$ANCHOR_ADDR" ]; then
    echo "❌ DelegationAnchor deployment failed"
    echo "$OUT"
    exit 1
fi

echo "✅ DelegationAnchor deployed at: $ANCHOR_ADDR"
echo ""
echo "📝 Add to .env.local:"
echo "NEXT_PUBLIC_DELEGATION_ANCHOR=$ANCHOR_ADDR"
```

### 4. Add UI Components to X402SubscriptionsDemo.tsx

**Location**: `demo/apps/merchant-demo/components/X402SubscriptionsDemo.tsx`

Add delegation toggle and inputs. See `X402_PRIVATE_DELEGATIONS_OPTION_A.md` for full UI spec.

Key additions:
- Import delegation utilities
- Add state for `useDelegation`, `policyHash`, `salt`, `leafCommitment`
- Add UI toggle and input fields
- Update subscription flow to use delegation when enabled

### 5. Environment Variables

**File**: `demo/apps/merchant-demo/.env.local`

Add:

```bash
# Delegation Anchor
NEXT_PUBLIC_DELEGATION_ANCHOR=0x<YOUR_DEPLOYED_ANCHOR_ADDRESS>

# Demo Nillion Attestor (mock)
NILLION_DEMO_ATTESTOR_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## 🔄 What Will Change When Nillion API Access Arrives

### 1. `/api/nillion/attest.ts`

**Current (Mock)**:
```typescript
const sig = await DEMO_ATTESTOR_WALLET.signMessage(ethers.getBytes(digest));
return res.status(200).json({ attestation: sig });
```

**Future (Real Nillion nilCC)**:
```typescript
// TODO: Replace with actual Nillion nilCC API call
const nillionClient = new NillionClient({
  apiKey: process.env.NILLION_API_KEY,
  apiUrl: process.env.NILLION_API_URL
});

// Deploy policy to Confidential VM (if not already deployed)
const workload = await nillionClient.deployWorkload({
  dockerCompose: policyDockerCompose,
  policyHash: leafCommitment
});

// Request attestation from TEE
const attestation = await nillionClient.requestAttestation({
  workloadId: workload.id,
  actionHash: actionHash,
  merkleRoot: latestRoot,
  leafCommitment: leafCommitment
});

return res.status(200).json({ attestation: attestation.signature });
```

### 2. Contract Attestation Verification

**Current (Mock)**: Simple ECDSA recovery
```solidity
address signer = ethSignedHash.recover(signature);
require(signer == attestor, "bad attestation");
```

**Future (Real Nillion)**: Verify TEE attestation report
```solidity
// TODO: Replace with Nillion TEE attestation verification
// This will verify:
// 1. AMD SEV-SNP attestation report
// 2. Workload integrity (Docker Compose hash matches)
// 3. Policy evaluation result matches action
require(verifyNillionAttestation(attestation, leafCommitment, actionHash), "bad attestation");
```

### 3. Merkle Proof Generation

**Current (Mock)**: Returns empty array
```typescript
return []; // TODO: integrate with pool client
```

**Future (Real Pool Integration)**:
```typescript
const poolClient = getBermudaPoolClient();
const proof = await poolClient.getMerkleProofForLeaf(leaf);
return proof;
```

## 📋 Testing Checklist

Before Nillion API access:
- [ ] Deploy DelegationAnchor contract
- [ ] Add `takeWithDelegationAnchor` to X402Adapter
- [ ] Update X402Adapter constructor to accept `delegationAnchor` and `attestor`
- [ ] Redeploy X402Adapter with new parameters
- [ ] Test `/api/delegation-root` endpoint
- [ ] Test `/api/nillion/attest` (mock) endpoint
- [ ] Test `takeWithDelegationAnchor` via `/api/execute` (with mock attestation)
- [ ] Add UI toggle and inputs
- [ ] Test full flow in UI with delegation enabled
- [ ] Verify Merkle proof structure (even if empty)
- [ ] Verify attestation format matches contract expectations

After Nillion API access:
- [ ] Replace mock attestation with real Nillion nilCC API calls
- [ ] Update contract attestation verification for TEE reports
- [ ] Test with real Nillion confidential VMs
- [ ] Integrate real Merkle proofs from pool

## 🎯 Quick Start (Test What We Have)

1. **Deploy DelegationAnchor:**
```bash
cd demo
forge create contracts/DelegationAnchor.sol:DelegationAnchor \
  --constructor-args 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    0x0000000000000000000000000000000000000000000000000000000000000000 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

2. **Test API endpoint:**
```bash
# Add to .env.local:
# NEXT_PUBLIC_DELEGATION_ANCHOR=<DEPLOYED_ADDRESS>
# NILLION_DEMO_ATTESTOR_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Start Next.js
cd demo/apps/merchant-demo
npm run dev

# Test delegation root endpoint
curl http://localhost:3000/api/delegation-root

# Test attestation endpoint (mock)
curl -X POST http://localhost:3000/api/nillion/attest \
  -H "Content-Type: application/json" \
  -d '{
    "leafCommitment": "0x1111111111111111111111111111111111111111111111111111111111111111",
    "actionHash": "0x2222222222222222222222222222222222222222222222222222222222222222",
    "latestRoot": "0x3333333333333333333333333333333333333333333333333333333333333333"
  }'
```

## 📝 Notes

- **Mock attestation is temporary** - All attestation code is clearly marked with `TODO` comments
- **Empty Merkle proofs work** - Contract will accept empty array for demo (real proofs needed in production)
- **Environment variables** - Make sure to set all required env vars before testing
- **Contract deployment order** - Deploy DelegationAnchor first, then update X402Adapter with anchor address

---

**Status**: Ready to proceed with contract updates and UI integration! 🚀







