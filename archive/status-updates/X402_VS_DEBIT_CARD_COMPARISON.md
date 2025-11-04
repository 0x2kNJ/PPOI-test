# X402 Demo vs Debit Card Demo: Key Differences

## Overview

The **x402 demo** and **debit card demo** share the same underlying ZK proof stack (precomputes, Barretenberg, Noir circuits), but differ in **payment model** and **use cases**.

---

## Key Differences

### 1. **Payment Model: Pull vs Push**

| Feature | Debit Card Demo | X402 Demo |
|---------|----------------|-----------|
| **Payment Initiation** | User initiates (push) | Merchant initiates (pull) |
| **User Presence** | Must be online & active | Can be offline |
| **Authorization** | One-time approval per payment | Standing authorization (permit) |
| **Recurring Payments** | ❌ Not supported | ✅ Fully supported |
| **Subscription Billing** | ❌ Not supported | ✅ Fully supported |
| **Offline Payments** | ❌ Not supported | ✅ Supported (via permit) |

**Debit Card Demo (Push):**
```typescript
// User must actively approve each payment
async function handlePay() {
  const response = await fetch('/pay', {
    method: 'POST',
    body: JSON.stringify({ amount: 100 })
  });
  // User must be online and approve
}
```

**X402 Demo (Pull):**
```typescript
// Merchant can pull payment using pre-signed permit
async function processSubscription() {
  // Merchant initiates charge using stored permit
  // User can be offline
  const result = await relayer.execute({
    method: 'take',
    permit: storedPermit, // Pre-signed by user
    amount: 100
  });
}
```

---

### 2. **EIP-712 Permit Structure**

**Debit Card Demo:**
- Simple permit structure (if used)
- No merchant binding
- One-time use

**X402 Demo:**
- **Extended Permit with `merchantCommitment`**:
```typescript
{
  noteId: bytes32,
  merchant: address,
  maxAmount: uint256,
  expiry: uint256,
  nonce: uint256,
  signature: bytes,
  merchantCommitment: bytes32  // 🆕 NEW: Supports shielded merchant addresses
}
```

**Key Addition:**
- `merchantCommitment` enables **shielded-to-shielded** transfers
- Merchant can receive payments to their own shielded address
- Maintains privacy for both user and merchant

---

### 3. **Smart Contract Events**

**Debit Card Demo:**
- `Take(merchant, recipient, amount)` - Public transfers only

**X402 Demo:**
- `Take(merchant, recipient, amount)` - Shielded-to-public
- `TakeShielded(merchant, recipientCommitment, amount)` - 🆕 Shielded-to-shielded
- `Redeem(merchant, recipient, amount)` - Public redemption

**Example:**
```solidity
// Shielded-to-shielded payment
if (permit.merchantCommitment != bytes32(0)) {
    emit TakeShielded(permit.merchant, permit.merchantCommitment, amount);
} 
// Shielded-to-public payment
else {
    emit Take(permit.merchant, recipient, amount);
}
```

---

### 4. **Subscription Management**

**Debit Card Demo:**
- ❌ No subscription management
- One-time payments only
- No recurring billing

**X402 Demo:**
- ✅ **Full subscription management**:
  - Create subscription with permit
  - Store subscription in `.subscriptions.json`
  - **Auto-recurring payments** (12 payments simulated)
  - **10-second interval** for demo (monthly in production)
  - **Pause/Resume** functionality
  - **Payment history** tracking
  - **Progress tracking** (1/12, 2/12, etc.)

**Flow:**
```typescript
// 1. User creates subscription
await createSubscription({ merchant, amount, precomputes, permit });

// 2. First payment happens automatically
await chargeSubscription(subscriptionId);

// 3. Auto-recurring payments trigger every 10 seconds
// (Monthly in production)
setInterval(() => {
  await chargeSubscription(subscriptionId);
}, 10_000); // 10 seconds for demo
```

---

### 5. **Use Cases**

**Debit Card Demo:**
- ✅ One-time payments
- ✅ User-to-merchant direct payments
- ✅ User-to-friend transfers
- ❌ Recurring payments
- ❌ Subscription billing
- ❌ Merchant-initiated charges
- ❌ Offline payments

**X402 Demo:**
- ✅ One-time payments (same as debit card)
- ✅ User-to-merchant direct payments (same as debit card)
- ✅ User-to-friend transfers (same as debit card)
- ✅ **Recurring payments** (NEW)
- ✅ **Subscription billing** (NEW)
- ✅ **Merchant-initiated charges** (NEW)
- ✅ **Offline payments** (NEW)
- ✅ **Shielded-to-shielded transfers** (NEW)

---

### 6. **Shared Components**

Both demos **reuse the same stack**:

| Component | Debit Card | X402 |
|-----------|------------|------|
| **ZK Precomputes** | ✅ Same | ✅ Same |
| **Noir Circuits** | ✅ Same | ✅ Same |
| **Barretenberg** | ✅ Same | ✅ Same |
| **Relayer/Paymaster** | ✅ Same | ✅ Same |
| **EIP-712 Signing** | ✅ Same | ✅ Extended |
| **Privacy Pool** | ✅ Same | ✅ Same |

---

### 7. **Merchant Binding**

**Debit Card Demo:**
- No specific merchant binding in permit
- Public addresses only

**X402 Demo:**
- ✅ **Merchant binding** in permit (`merchant` field)
- ✅ **Shielded merchant support** (`merchantCommitment` field)
- ✅ **Nonce per merchant** prevents replay attacks
- ✅ **Expiry per permit** for time-limited authorization

---

### 8. **API Endpoints**

**Debit Card Demo:**
- `/pay` - One-time payment

**X402 Demo:**
- `/api/precomputes` - Generate ZK proofs (same as debit card)
- `/api/execute` - Execute transaction (same as debit card)
- `/api/subscription` - 🆕 **Create subscription**
- `/api/subscription` (GET) - 🆕 **List subscriptions**
- `/api/subscription` (PUT) - 🆕 **Charge subscription**
- `/api/subscription` (DELETE) - 🆕 **Cancel subscription**

---

### 9. **State Management**

**Debit Card Demo:**
- Stateless payment requests
- No subscription state

**X402 Demo:**
- ✅ **File-based subscription storage** (`.subscriptions.json`)
- ✅ **Persists across server restarts**
- ✅ **Auto-recurring payment state**
- ✅ **Payment history tracking**
- ✅ **Progress tracking** (paymentsCompleted, countdown)

---

## Summary

### What's the Same?
- ✅ ZK proof generation (Noir + Barretenberg)
- ✅ Precompute stack
- ✅ Relayer/paymaster pattern
- ✅ Privacy-preserving transfers
- ✅ EIP-712 signing infrastructure

### What's Different in X402?

1. **🔄 Payment Direction**: Pull (merchant-initiated) vs Push (user-initiated)
2. **🔄 Merchant Binding**: Extended permit with `merchantCommitment` for shielded merchants
3. **🔄 Events**: New `TakeShielded` event for shielded-to-shielded transfers
4. **🔄 Subscriptions**: Full subscription management with auto-recurring payments
5. **🔄 Use Cases**: Supports recurring payments, subscriptions, offline payments
6. **🔄 State**: File-based subscription storage and payment history

---

## When to Use Which?

**Use Debit Card Demo When:**
- User-initiated one-time payments
- Direct user-to-merchant transfers
- No recurring billing needed
- Simple payment flow

**Use X402 Demo When:**
- Subscription billing required
- Recurring payments needed
- Merchant-initiated charges
- Offline payment support
- Shielded-to-shielded transfers
- Full subscription management

---

## Migration Path

To migrate from debit card to x402:

1. ✅ Keep existing ZK proof stack (no changes needed)
2. ✅ Extend EIP-712 permit with `merchantCommitment`
3. ✅ Add subscription management API
4. ✅ Update smart contract with `TakeShielded` event
5. ✅ Implement auto-recurring payment logic
6. ✅ Add file-based subscription storage

The core ZK infrastructure remains **100% compatible**! 🎉



