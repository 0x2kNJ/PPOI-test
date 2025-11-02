# Subscription Charging Implementation

## Overview

The subscription charging functionality is now fully implemented using actual ZK proofs and public inputs from the witness, matching the baanx demo architecture.

## Flow

### 1. Subscription Creation
- User generates real ZK precomputes via `/api/precomputes`
- Public inputs extracted from witness: `[root, public_amount, ext_data_hash, nullifier]`
- User signs EIP-712 permit
- Subscription created with:
  - `proof`: ZK proof bytes
  - `publicInputs`: Actual public inputs from witness
  - `permitSignature`: EIP-712 permit signature
  - `nonce`: Starting nonce (increments on each charge)

### 2. Subscription Charging
When it's time to charge (or user clicks "Charge Now"):

1. **API Endpoint** (`PUT /api/subscription`):
   - Retrieves subscription with stored `proof` and `publicInputs`
   - Builds permit struct from subscription data
   - Constructs contract call: `[proof, publicInputs, permit, recipient, amount]`
   - Calls `/api/execute` to relay transaction

2. **Execute API** (`POST /api/execute`):
   - Formats `publicInputs` as `bytes32[]` for Solidity
   - Calls `X402Adapter.take(proof, publicInputs, permit, recipient, amount)`

3. **Contract** (`X402Adapter.take()`):
   - Validates permit (expiry, maxAmount, nonce)
   - Verifies EIP-712 signature
   - **Verifies ZK proof on-chain**: `verifier.verify(proof, publicInputs)`
   - Uses actual public inputs from witness (not derived)
   - Enforces policies
   - Updates subscription: increments nonce, sets next charge date

### 3. UI Updates
- Shows "Charge Now" button when `nextChargeDate <= now`
- Button is red if overdue (>24h)
- Displays last charged date
- Shows transaction hash on success
- Auto-refreshes subscription list after charge

## Key Features

### On-Chain Proof Verification
- Uses actual `HonkVerifier` contract (same as baanx demo)
- Public inputs come from proof witness (not derived)
- Proofs verified on-chain before executing payment

### Public Inputs from Witness
- `root`: Merkle root from witness computation
- `public_amount`: Negative amount from witness (circuit constraint)
- `ext_data_hash`: External data hash (0 for precompute)
- `nullifier`: Nullifier hash from witness (prevents double-spend)

### Nonce Management
- Nonce increments on each charge
- Prevents replay attacks
- Tracked per `noteId`

### Timing Validation
- Only charges when `nextChargeDate <= now`
- Sets next charge date after successful charge
- Tracks last charged timestamp

## Contract Call Format

```javascript
{
  adapter: X402_ADAPTER_ADDRESS,
  method: "take",
  args: [
    subscription.proof,              // Proof bytes from ZK generation
    subscription.publicInputs,        // Actual public inputs: [root, public_amount, ext_data_hash, nullifier]
    {
      noteId: subscription.noteId,
      merchant: subscription.merchantAddress,
      maxAmount: subscription.maxAmount,
      expiry: subscription.expiry,
      nonce: subscription.nonce,      // Increments on each charge
      signature: subscription.permitSignature
    },
    subscription.merchantAddress,    // recipient (merchant receives payment)
    subscription.amount              // amount to charge
  ]
}
```

## API Endpoints

### PUT /api/subscription
**Charge a subscription**

Request:
```json
{
  "subscriptionId": "sub_..."
}
```

Response:
```json
{
  "success": true,
  "txHash": "0x...",
  "nextCharge": "2024-12-01T00:00:00.000Z",
  "lastCharged": "2024-11-01T00:00:00.000Z"
}
```

## Error Handling

- **Subscription not found**: Returns 404
- **Subscription inactive**: Returns 400
- **Not yet time to charge**: Returns 400 with `nextCharge` date
- **Proof verification fails**: Returns 500 (contract reverts)
- **Gas estimate fails**: Returns 400
- **Execution fails**: Returns 500 with error details

## Next Steps

1. **Deploy contracts**: Deploy `HonkVerifier` and `X402Adapter` to testnet
2. **Test charging**: Create subscription, wait for charge date, click "Charge Now"
3. **Verify on-chain**: Check transaction on testnet explorer to see proof verification
4. **Production**: Replace in-memory store with database

## Testing

To test the charging flow:

1. Create a subscription via UI
2. Wait for charge date OR manually set `nextCharge` to past date
3. Click "Charge Now" button
4. Check transaction hash in status message
5. Verify subscription updates: nonce increments, `nextCharge` updates, `lastCharged` set

The proof will be verified on-chain using the actual public inputs from the witness!



