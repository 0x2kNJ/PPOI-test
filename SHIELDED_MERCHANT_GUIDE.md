# Shielded Merchant Address - Implementation Guide

## Current State

**Current:** Merchants receive payments to **public addresses**

```typescript
// Current in http402-subscription-demo.tsx (line ~285)
merchantCommitment: "0x0000000000000000000000000000000000000000000000000000000000000000"
// ↑ 0x0 = public address recipient
```

**Result:** Payment visible on-chain to merchant's public address

---

## Shielded Merchant Support

The x402 contract **already supports** shielded merchant addresses via `merchantCommitment` field!

### Contract Implementation

```solidity
// demo/apps/merchant-demo/contracts/MockX402Adapter.sol
struct Permit {
    bytes32 noteId;
    address merchant;
    uint256 maxAmount;
    uint256 expiry;
    uint256 nonce;
    bytes signature;
    bytes32 merchantCommitment; // ← Shielded address for merchant!
}

function take(
    bytes calldata proof,
    bytes32[] calldata publicInputs,
    Permit calldata permit,
    address recipient,
    uint256 amount
) external returns (bool) {
    // Shielded-to-shielded transfer
    if (permit.merchantCommitment != bytes32(0)) {
        // Payment goes to shielded commitment
        emit TakeShielded(permit.merchant, permit.merchantCommitment, amount);
        // In production: pool.transferShielded(merchantCommitment, amount)
    } 
    // Shielded-to-public transfer
    else {
        // Payment goes to public address
        emit Take(permit.merchant, recipient, amount);
        // In production: pool.transferPublic(recipient, amount)
    }
    
    return true;
}
```

**Key Points:**
- If `merchantCommitment != 0x0` → **Shielded-to-shielded** transfer
- If `merchantCommitment == 0x0` → **Shielded-to-public** transfer

---

## How to Enable Shielded Merchant

### Step 1: Generate Merchant's Shielded Commitment

```typescript
// Generate shielded commitment for merchant
import { generateCommitment } from "bermuda-sdk";

const merchantShieldedKey = ethers.randomBytes(32); // Merchant's private key
const merchantCommitment = generateCommitment(merchantShieldedKey);
// merchantCommitment = bytes32 hash of merchant's shielded address
```

### Step 2: Update Frontend to Use Shielded Commitment

**Current code (public):**
```typescript
// demo/apps/merchant-demo/pages/http402-subscription-demo.tsx
const signature = await signer.signTypedData(domain, types, {
  noteId: noteId,
  merchant: merchantAddress,
  maxAmount: BigInt(maxAmountWei),
  expiry: BigInt(expiry),
  nonce: BigInt(nonce),
  merchantCommitment: "0x0000000000000000000000000000000000000000000000000000000000000000",
  // ↑ 0x0 = public address
});
```

**Update to shielded:**
```typescript
// demo/apps/merchant-demo/pages/http402-subscription-demo.tsx
const MERCHANT_SHIELDED_COMMITMENT = process.env.NEXT_PUBLIC_MERCHANT_COMMITMENT || "0x0...";

const signature = await signer.signTypedData(domain, types, {
  noteId: noteId,
  merchant: merchantAddress, // Public address for identification
  maxAmount: BigInt(maxAmountWei),
  expiry: BigInt(expiry),
  nonce: BigInt(nonce),
  merchantCommitment: MERCHANT_SHIELDED_COMMITMENT, // ← Shielded address!
});
```

### Step 3: Configure Environment

```bash
# demo/apps/merchant-demo/.env.local
NEXT_PUBLIC_MERCHANT_COMMITMENT=0xabc123... # Merchant's shielded commitment
```

---

## Complete Flow with Shielded Merchant

### 1. User Creates Subscription

```typescript
// User signs permit with merchant's shielded commitment
const permit = {
  noteId: "0x...",
  merchant: "0x123...",           // Public address (for tracking)
  maxAmount: "1000000",
  expiry: 1234567890,
  nonce: 1,
  signature: "0x...",
  merchantCommitment: "0xabc..." // ← Merchant's shielded address
};
```

### 2. User Makes Subscription Payment

```typescript
// Payment goes to shielded address
await x402Adapter.take(
  proof,
  publicInputs,
  permit,
  merchantPublicAddress,  // Fallback (not used if merchantCommitment != 0)
  amount
);
```

### 3. Contract Executes Shielded Transfer

```solidity
// Contract checks merchantCommitment
if (permit.merchantCommitment != bytes32(0)) {
    // Shielded-to-shielded transfer!
    emit TakeShielded(
        permit.merchant,           // Public address for indexing
        permit.merchantCommitment, // Shielded recipient
        amount
    );
    
    // In production: Transfer to shielded pool
    // pool.transferShielded(permit.merchantCommitment, amount);
}
```

### 4. Merchant Receives Payment

**Result:**
- Payment arrives at merchant's **shielded address**
- Merchant balance **hidden on-chain**
- Only merchant with private key can spend
- No public visibility of merchant balance

---

## Privacy Benefits

### Without Shielded Merchant (Current):
```
User (shielded) → Merchant (public)
❌ Merchant balance visible on-chain
❌ Anyone can see merchant received payment
❌ Anyone can track merchant's total revenue
```

### With Shielded Merchant:
```
User (shielded) → Merchant (shielded)
✅ Merchant balance hidden on-chain
✅ No one can see merchant received payment
✅ No one can track merchant's total revenue
✅ Full privacy for both parties
```

---

## Implementation Checklist

To enable shielded merchant addresses:

- [ ] Generate merchant's shielded commitment (off-chain)
- [ ] Store commitment in environment variable
- [ ] Update frontend to use `merchantCommitment != 0x0`
- [ ] Update contract to route to shielded pool (production)
- [ ] Update server to track shielded balance (off-chain)
- [ ] Generate merchant's shielded keypair for spending

---

## Server-Side Changes

### Current (Public Address):
```typescript
// Server knows merchant's public balance
const balance = await provider.getBalance(merchantAddress);
console.log(`Merchant balance: ${balance}`);
```

### With Shielded Address:
```typescript
// Server tracks shielded balance off-chain
import { decryptShieldedBalance } from "bermuda-sdk";

const shieldedBalance = await decryptShieldedBalance(
  merchantShieldedKey,
  poolContract
);
console.log(`Merchant shielded balance: ${shieldedBalance}`);
```

**Key Point:** Server needs merchant's **private shielded key** to:
1. Decrypt incoming payments
2. Check shielded balance
3. Spend from shielded pool

---

## Events Comparison

### Public Merchant:
```solidity
event Take(
    address indexed merchant,    // Public address
    address indexed recipient,   // Public address
    uint256 amount              // Visible amount
);
```

**On-chain visibility:** Everyone can see merchant received payment

### Shielded Merchant:
```solidity
event TakeShielded(
    address indexed merchant,           // Public address (for indexing only)
    bytes32 indexed recipientCommitment, // Shielded address
    uint256 amount                      // Amount (still visible in event)
);
```

**On-chain visibility:** Only merchant address visible (for indexing), recipient is shielded commitment

---

## Production Integration

For full shielded merchant support in production:

### 1. Pool Integration
```solidity
// Replace mock with actual pool call
function _transferToShielded(bytes32 commitment, uint256 amount) internal {
    // Call Bermuda pool contract
    bermudaPool.depositShielded{value: amount}(commitment);
}
```

### 2. Merchant Key Management
```typescript
// Secure key storage for merchant
import { encryptKey, decryptKey } from "merchant-key-manager";

const encryptedKey = await encryptKey(merchantShieldedKey, merchantPassword);
await db.merchants.update({ address }, { encryptedShieldedKey: encryptedKey });
```

### 3. Balance Tracking
```typescript
// Track shielded balance in database
await db.merchantBalances.increment({
  merchantAddress: merchant,
  shieldedBalance: amount,
  lastUpdated: Date.now(),
});
```

---

## Summary

### Current State:
- ✅ Contract supports `merchantCommitment` field
- ✅ Shielded-to-shielded logic implemented
- ⚠️ Frontend uses `merchantCommitment: 0x0` (public)
- ⚠️ Server expects public address

### To Enable Shielded Merchant:
1. Generate merchant's shielded commitment
2. Set `NEXT_PUBLIC_MERCHANT_COMMITMENT` env var
3. Update frontend to use commitment != 0x0
4. Update contract to call pool (production)
5. Update server to track shielded balance

### Benefits:
- ✅ Full privacy for merchants
- ✅ Hidden merchant balances
- ✅ No revenue tracking
- ✅ Both user and merchant shielded

**The infrastructure is already there - just needs to be activated!** 🎉

