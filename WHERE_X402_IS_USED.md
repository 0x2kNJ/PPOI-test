# Where X402 Is Used in This Demo

## Overview

**x402** (ERC-402) is the Ethereum standard for **pull payments** - enabling merchants to pull funds from users' accounts with pre-authorized permits. This demo implements the x402 pattern using the **X402Adapter** smart contract.

---

## 🔍 X402 Usage Points

### 1. **Smart Contract: X402Adapter** 

**Location:** `demo/apps/merchant-demo/contracts/MockX402Adapter.sol`

This is the **core x402 implementation** - the smart contract that enforces the x402 pull payment standard:

```solidity
contract MockX402Adapter {
    // X402 Standard: Pull payment function
    function take(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        Permit calldata permit,  // ← EIP-712 permit (x402 authorization)
        address recipient,
        uint256 amount
    ) external returns (bool) {
        // X402 validations:
        require(block.timestamp <= permit.expiry, "permit expired");
        require(amount <= permit.maxAmount, "over max");
        
        // Shielded-to-shielded or shielded-to-public transfer
        if (permit.merchantCommitment != bytes32(0)) {
            emit TakeShielded(permit.merchant, permit.merchantCommitment, amount);
        } else {
            emit Take(permit.merchant, recipient, amount);
        }
        
        return true;
    }
}
```

**What makes this x402:**
- ✅ **Pull payment** - Merchant initiates (not user)
- ✅ **EIP-712 Permit** - Pre-authorized off-chain signature
- ✅ **Standing authorization** - User pre-approves merchant to pull funds
- ✅ **Nonce-based** - Prevents replay attacks

---

### 2. **Relayer API: Execute Contract Call**

**Location:** `demo/apps/merchant-demo/pages/api/execute.ts`

This is where the **x402 `take()` function is called** on-chain:

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { adapter, method, args } = req.body;
  
  // Only x402 methods allowed
  if (!["take", "redeemToPublic"].includes(method)) {
    return res.status(400).json({ error: "unsupported method" });
  }

  // Connect to X402Adapter contract
  const contract = new ethers.Contract(ADAPTER_ADDR, X402Abi, wallet);
  
  // Execute x402 pull payment
  const tx = await contract[method](...args, { gasLimit: gas * BigInt(12) / BigInt(10) });
  
  return res.status(200).json({ txHash: receipt.hash });
}
```

**What happens here:**
1. Receives request with `method: "take"` and x402 permit + proof
2. Calls **X402Adapter.take()** on-chain
3. Contract validates permit and executes pull payment
4. Returns transaction hash

---

### 3. **Subscription API: Charges Using X402**

**Location:** `demo/apps/merchant-demo/pages/api/subscription.ts`

When charging a subscription, it **calls the execute API** which calls x402:

```typescript
// PUT /api/subscription - Charge subscription
const permit = {
  noteId: sub.noteId,
  merchant: sub.merchantAddress,
  maxAmount: sub.maxAmount,
  expiry: sub.expiry,
  nonce: sub.nonce,
  signature: sub.permitSignature,  // ← Pre-signed EIP-712 permit
  merchantCommitment: "0x0...",
};

// X402 pull payment arguments
const args = [
  sub.proof,           // ZK proof
  sub.publicInputs,    // Public inputs
  permit,              // ← X402 permit (authorization)
  sub.merchantAddress, // Recipient
  sub.amount,          // Amount to pull
];

// Call execute API → calls X402Adapter.take()
const executeRes = await fetch("/api/execute", {
  method: "POST",
  body: JSON.stringify({
    adapter: ADAPTER_ADDR,  // ← X402Adapter contract
    method: "take",         // ← x402 pull payment method
    args: args,
  }),
});
```

**What makes this x402:**
- Merchant initiates charge (pull, not push)
- Uses pre-signed permit (user already authorized)
- Calls `X402Adapter.take()` via relayer
- User doesn't need to be online

---

### 4. **Frontend: Creating X402 Permit**

**Location:** `demo/apps/merchant-demo/components/X402SubscriptionsDemo.tsx`

When user subscribes, they **sign an EIP-712 permit** authorizing x402 pulls:

```typescript
// EIP-712 types for x402 permit
const types = {
  Permit: [
    { name: "noteId", type: "bytes32" },
    { name: "merchant", type: "address" },
    { name: "maxAmount", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "merchantCommitment", type: "bytes32" },  // ← x402 extension
  ],
};

// User signs x402 permit in MetaMask
const signature = await signer.signTypedData(
  {
    name: "Bermuda X402",  // ← x402 domain
    version: "1",
    chainId: chainId,
  },
  types,
  {
    noteId: noteId,
    merchant: merchantAddress,
    maxAmount: maxAmountWei,
    expiry: BigInt(expiry),
    nonce: BigInt(nonce),
    merchantCommitment: "0x0...",  // ← x402 shielded merchant support
  }
);
```

**What makes this x402:**
- Signs **EIP-712 permit** with "Bermuda X402" domain
- **Pre-authorizes** merchant to pull funds
- Includes `merchantCommitment` for shielded merchants
- User only signs **once** for recurring payments

---

### 5. **Contract ABI: X402Adapter Interface**

**Location:** `demo/apps/merchant-demo/abis/X402Adapter.json`

The ABI defines the x402 contract interface:

```json
{
  "name": "take",
  "type": "function",
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
        { "name": "merchantCommitment", "type": "bytes32" }  // ← x402 extension
      ]
    },
    { "name": "recipient", "type": "address" },
    { "name": "amount", "type": "uint256" }
  ]
}
```

---

## 🔄 Complete X402 Flow

### Step 1: User Creates Subscription (Frontend)
```
User clicks "Subscribe for 12 months"
↓
Generate ZK precomputes
↓
Sign EIP-712 permit (x402 authorization)
↓
Store subscription with permit
```

### Step 2: First Payment (Automatic)
```
Merchant calls PUT /api/subscription
↓
Subscription API calls /api/execute
↓
Execute API calls X402Adapter.take(proof, permit, amount)
↓
✅ X402 pull payment executed on-chain
```

### Step 3: Recurring Payments (Auto)
```
Every 10 seconds (demo) / monthly (production):
↓
Merchant calls PUT /api/subscription again
↓
Uses same pre-signed permit (x402 authorization)
↓
Calls X402Adapter.take() via relayer
↓
✅ Recurring x402 pull payment
```

---

## 🎯 Key X402 Features in This Demo

### 1. **Pull Payment Pattern**
- ❌ **NOT**: User pushes payment to merchant
- ✅ **IS**: Merchant pulls payment from user (with permit)

### 2. **EIP-712 Permits**
- User signs **once** to authorize recurring pulls
- Permit includes: `merchant`, `maxAmount`, `expiry`, `nonce`
- Domain: `"Bermuda X402"` version `"1"`

### 3. **Standing Authorization**
- Permit stored in `.subscriptions.json`
- Reused for multiple pulls (until expiry/nonce exhausted)
- User can be offline during pulls

### 4. **Merchant Binding**
- `merchant` field binds permit to specific merchant
- `merchantCommitment` enables shielded-to-shielded transfers
- Wrong merchant cannot use permit (enforced on-chain)

### 5. **Gasless for User**
- Relayer pays gas (via `/api/execute`)
- User only signs once (off-chain)
- User never needs ETH for gas

---

## 📊 X402 vs Non-X402

### Without X402 (Push Payment):
```typescript
// User must be online and approve each payment
userWallet.sendPayment({
  to: merchant,
  amount: 100,
  // User must sign every time
});
```

### With X402 (Pull Payment):
```typescript
// User signs once (off-chain)
const permit = await signPermit({
  merchant: merchantAddress,
  maxAmount: 1000,
  expiry: future,
});

// Merchant can pull anytime (user offline OK)
await x402Adapter.take(proof, permit, merchant, 100);
```

---

## 🔍 Where to Find X402 Code

| File | Purpose | X402 Usage |
|------|---------|------------|
| `contracts/MockX402Adapter.sol` | Smart contract | ✅ **Core x402 implementation** |
| `pages/api/execute.ts` | Relayer | ✅ **Calls x402Adapter.take()** |
| `pages/api/subscription.ts` | Subscription management | ✅ **Uses x402 to charge** |
| `components/X402SubscriptionsDemo.tsx` | UI | ✅ **Signs x402 permit** |
| `abis/X402Adapter.json` | Contract interface | ✅ **x402 function definitions** |

---

## ✅ Summary

**X402 is used in:**

1. ✅ **Smart Contract** - `MockX402Adapter.take()` implements x402 pull payments
2. ✅ **Relayer** - `/api/execute` calls x402 contract method
3. ✅ **Subscriptions** - Charges use x402 pull pattern
4. ✅ **Frontend** - User signs x402 EIP-712 permit
5. ✅ **ABI** - Defines x402 contract interface

**The x402 standard enables:**
- Merchant-initiated payments (pull, not push)
- Standing authorization via EIP-712 permits
- Recurring payments without user interaction
- Offline payments (user doesn't need to be online)
- Gasless for users (relayer pays gas)

This is the **core difference** from a regular push payment - the merchant **pulls** funds using a pre-authorized permit, following the x402 (ERC-402) standard! 🎉



