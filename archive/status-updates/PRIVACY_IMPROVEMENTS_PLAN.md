# Privacy Improvements Plan

## 🎯 Current Privacy Gaps

1. ❌ **Payment amount** - Visible in `amount` parameter
2. ❌ **Public amount** - Visible in `publicInputs` array  
3. ❌ **Max amount** - Visible in EIP-712 permit
4. ❌ **User address** - Required for HTTP 402 but visible

---

## 🔧 Improvement #1: Remove maxAmount from Permit ✅ (Partially Done)

### Status: **Already Implemented with DelegationPermit**

**What's Done:**
```typescript
// components/X402SubscriptionsDemo.tsx (lines 504-553)
DelegationPermit: [
  { name: "noteId", type: "bytes32" },
  { name: "merchant", type: "address" },
  // maxAmount removed - verified privately in Nillion attestation
  { name: "expiry", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "merchantCommitment", type: "bytes32" },
]
```

**How to Use:**
```typescript
// Enable delegation in UI
const useDelegation = true; // Set this flag
```

**Next Steps:**
1. ✅ Make DelegationPermit the default (already available)
2. ⚠️ Update contract to support DelegationPermit verification
3. ⚠️ Move maxAmount verification to off-chain (Nillion or similar)

**Privacy Gain:** Hides subscription spending limits from blockchain observers

---

## 🔧 Improvement #2: Amount Range Proofs (ZK Circuit Enhancement)

### Problem:
Exact amount is visible in transaction (`amount` parameter)

### Solution:
Use ZK range proofs instead of exact amounts

```typescript
// Instead of: amount = 1.0 USDC (exact)
// Use: amount ∈ [0.99, 1.01] USDC (range)

// ZK Proof proves:
// - amount >= minAmount (e.g., 0.99 USDC)
// - amount <= maxAmount (e.g., 1.01 USDC)
// - Without revealing exact amount
```

**Implementation:**
```noir
// lib/precompute-circuit/src/main.nr
fn main(
    // ... existing inputs
    amount: Field,
    minAmount: Field,
    maxAmount: Field,
) -> pub Field {
    // Prove amount is in range
    assert(amount >= minAmount);
    assert(amount <= maxAmount);
    
    // Return commitment instead of exact amount
    let amountCommitment = pedersen_hash(amount, salt);
    amountCommitment
}
```

**Contract Changes:**
```solidity
// contracts/X402Adapter.sol
function take(
    bytes calldata proof,
    bytes32[] calldata publicInputs, // Contains amountCommitment, not amount
    Permit calldata permit,
    address recipient,
    bytes32 amountCommitment, // Instead of uint256 amount
    uint256 minAmount,
    uint256 maxAmount
) external returns (bool) {
    // Verify ZK proof proves amountCommitment ∈ [minAmount, maxAmount]
    // Merchant only knows the range, not exact amount
}
```

**Privacy Gain:** Hides exact payment amounts, reveals only ranges

**Effort:** Medium - Requires ZK circuit modification + range proof system

---

## 🔧 Improvement #3: Amount Commitments (Alternative Approach)

### Problem:
Amount is visible in transaction logs and events

### Solution:
Use Pedersen commitments for amounts

```solidity
// contracts/X402Adapter.sol
event TakeShielded(
    address indexed merchant,
    bytes32 indexed recipientCommitment,
    bytes32 amountCommitment, // Hash of amount instead of raw amount
    bytes32 nullifier
);

function take(
    bytes calldata proof,
    bytes32[] calldata publicInputs,
    Permit calldata permit,
    address recipient,
    bytes32 amountCommitment // Hash commitment instead of amount
) external {
    // Generate commitment: keccak256(amount, salt, nullifier)
    // Merchant can decrypt off-chain via ZK proof
    emit TakeShielded(
        permit.merchant,
        permit.merchantCommitment,
        amountCommitment,
        nullifier
    );
}
```

**Verification:**
- Merchant receives `amountCommitment` on-chain
- Merchant verifies ZK proof proves commitment matches actual amount
- Actual amount never appears on-chain

**Privacy Gain:** Complete amount confidentiality on-chain

**Effort:** Medium - Requires commitment scheme + off-chain verification

---

## 🔧 Improvement #4: Hide Public Amount in ZK Circuit

### Problem:
`public_amount` in `publicInputs` reveals the net change

### Solution:
Make public amount optional or hide it in circuit

```noir
// lib/precompute-circuit/src/main.nr
fn main(
    // ... existing private inputs
    public_amount: Field,
    hidePublicAmount: bool, // Flag to hide public amount
) -> pub Field[] {
    let publicInputs = [
        root,
        if hidePublicAmount {
            0 // Hide public amount
        } else {
            public_amount
        },
        ext_data_hash,
        nullifier
    ];
    publicInputs
}
```

**Contract Changes:**
```solidity
// Only verify public amount off-chain via ZK proof
// Don't include in publicInputs array
function take(
    bytes calldata proof,
    bytes32[] calldata publicInputs, // No public_amount field
    // ... rest
) external {
    // Verify proof, public_amount is hidden in proof
}
```

**Privacy Gain:** Hides net balance changes from observers

**Effort:** Low - Circuit modification only

---

## 🔧 Improvement #5: Session-Based User Addresses (HTTP 402 Enhancement)

### Problem:
User address is required for HTTP 402 but reveals identity

### Solution:
Use temporary session addresses per subscription

```typescript
// Generate ephemeral address per subscription
import { ethers } from "ethers";

function generateSessionAddress(
    userAddress: string,
    subscriptionId: string,
    nonce: number
): string {
    // Derive temporary address from user's main address
    const sessionKey = ethers.solidityPackedKeccak256(
        ["address", "bytes32", "uint256"],
        [userAddress, subscriptionId, nonce]
    );
    
    // Create wallet from session key
    const sessionWallet = new ethers.Wallet(sessionKey);
    return sessionWallet.address;
}

// Usage:
const sessionAddr = generateSessionAddress(
    userAddress,
    subscriptionId,
    1
);

// Use sessionAddr for subscription payments
// Only server and user know the link (via subscriptionId)
```

**HTTP 402 Flow:**
```typescript
// 1. User requests content
GET /api/weather?subscriptionId=abc123

// 2. Server checks subscription
// - Server has encrypted link: subscriptionId → userAddress
// - Server doesn't expose userAddress

// 3. Server responds with session address
HTTP 402 Payment Required
{
  "sessionAddress": "0xTemp123...", // Temporary address
  "subscriptionId": "abc123"
}

// 4. User pays to sessionAddress
// 5. Server verifies payment via subscriptionId
```

**Privacy Gain:** Hides user's main address from HTTP 402 responses

**Effort:** Medium - Requires session management system

---

## 🔧 Improvement #6: Encrypted Subscription Storage

### Problem:
Subscription data stored in plaintext (`.subscriptions.json`)

### Solution:
Encrypt subscription IDs and user mappings

```typescript
// lib/subscription-encryption.ts
import { ethers } from "ethers";

export async function encryptSubscription(
    subscriptionId: string,
    userAddress: string,
    serverSecretKey: string
): Promise<string> {
    // Encrypt subscription data
    const encrypted = await ethers.utils.AES256GCM.encrypt(
        JSON.stringify({ subscriptionId, userAddress }),
        serverSecretKey
    );
    return encrypted;
}

// Store encrypted
await saveSubscription({
    id: encryptedId, // Encrypted subscription ID
    // ... rest of data
});
```

**Privacy Gain:** Server compromise doesn't expose subscription graph

**Effort:** Low - Just add encryption layer

---

## 📊 Priority Ranking

### 🔴 **High Priority (Do First)**

1. **Remove maxAmount from Permits** - ✅ Already available, make default
2. **Hide Public Amount in Circuit** - Low effort, immediate privacy gain
3. **Encrypt Subscription Storage** - Low effort, security improvement

### 🟡 **Medium Priority (Next Sprint)**

4. **Amount Range Proofs** - Significant privacy improvement
5. **Session-Based Addresses** - Better HTTP 402 privacy

### 🟢 **Lower Priority (Future)**

6. **Amount Commitments** - Most complex but best privacy

---

## 🎯 Quick Wins (Implement First)

### 1. Make DelegationPermit Default (5 minutes)

```typescript
// components/X402SubscriptionsDemo.tsx
const useDelegation = true; // Change default to true
```

### 2. Hide Public Amount in Circuit (30 minutes)

```noir
// lib/precompute-circuit/src/main.nr
// Modify to exclude public_amount from publicInputs
```

### 3. Encrypt Subscription Storage (1 hour)

```typescript
// Add encryption wrapper to subscription storage
```

---

## 📈 Expected Privacy Improvements

| Improvement | Current Privacy | After Improvement | Gain |
|------------|----------------|------------------|------|
| **Amount Confidentiality** | ❌ 0% (visible) | ✅ 100% (range/hidden) | +100% |
| **Max Amount Privacy** | ❌ 0% (visible) | ✅ 100% (removed) | +100% |
| **Public Amount Privacy** | ❌ 0% (visible) | ✅ 100% (hidden) | +100% |
| **User Address Privacy** | ❌ 0% (required) | ✅ 80% (session-based) | +80% |
| **Subscription Privacy** | ⚠️ 50% (plaintext) | ✅ 100% (encrypted) | +50% |

---

## 🚀 Implementation Order

**Week 1:**
1. Make DelegationPermit default
2. Encrypt subscription storage
3. Hide public amount in circuit

**Week 2:**
4. Implement amount range proofs
5. Add session-based addresses

**Week 3:**
6. Full amount commitments (if needed)

---

## 🔒 Target Privacy Level

**Goal:** Match or exceed Fhenix402's amount confidentiality while maintaining:
- ✅ Address anonymity (already have)
- ✅ Transaction unlinkability (already have)
- ✅ Pull payments (already have)
- ✅ Gasless transactions (already have)
- ✅ Subscription support (already have)

**Result:** Best-in-class privacy-preserving x402 implementation! 🎉







