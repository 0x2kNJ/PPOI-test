# Gasless Transactions: How the Relayer/Paymaster Works

## 🎯 Overview

In this demo, **users pay NO gas fees**. All gas costs are covered by a **relayer/paymaster** service. This is the "gasless meta-transaction" pattern.

## 💰 How It Works

### Traditional Transaction (Gas Required)

```
User Wallet
    ↓
Signs transaction with private key
    ↓
Pays gas fee (e.g., 0.001 ETH)
    ↓
Transaction mined on blockchain
```

**Cost:** User pays gas + transaction fees

### Gasless Transaction (This Demo)

```
User Wallet
    ↓
Signs EIP-712 permit (OFF-CHAIN, NO GAS)
    ↓
Relayer Service
    ↓
Relayer wallet pays gas fee
    ↓
Transaction mined on blockchain
```

**Cost:** User pays $0 gas (relayer covers it!)

## 🔧 Technical Flow

### Step 1: User Signs Permit (Off-Chain, No Gas)

```typescript
// User signs EIP-712 permit in MetaMask
const signature = await signer.signTypedData(domain, types, {
  noteId: "...",
  merchant: "0x...",
  maxAmount: "10000000",
  expiry: 1234567890,
  nonce: 1,
  merchantCommitment: "0x0"
});
```

**Cost:** $0 (off-chain signature, no transaction)

### Step 2: Frontend Calls Relayer API

```typescript
// Frontend sends permit + proof to relayer
POST /api/execute
{
  adapter: "0x...",
  method: "take",
  args: [proof, publicInputs, permit, recipient, amount]
}
```

**Cost:** $0 (just an HTTP request)

### Step 3: Relayer Executes Transaction

```typescript
// Relayer API (execute.ts)
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RELAYER_PK, provider); // ← Relayer's wallet
const contract = new ethers.Contract(ADAPTER_ADDR, X402Abi, wallet);

// Relayer pays gas, not user!
const tx = await contract[method](...args);
const receipt = await tx.wait();
```

**Cost:** Relayer pays gas (not user!)

## 💵 Who Pays What?

### In This Demo (Anvil Testnet)

**Relayer Wallet:**
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Balance: **10,000 ETH** (pre-funded by Anvil)
- Pays: All gas costs for all users

**User Wallet:**
- Pays: **$0** (no gas fees!)
- Only signs: EIP-712 permit (off-chain)

### In Production (Mainnet)

**Relayer Wallet:**
- Funded by service provider or sponsor
- May charge users (subscription fee, etc.)
- Or: Sponsored by merchants for user acquisition

**User Wallet:**
- Still pays: **$0** gas
- May pay: Service fees (if applicable)

## 🏗️ Architecture

```
┌─────────────────┐
│   User Wallet   │
│  (MetaMask)     │
└────────┬────────┘
         │ 1. Signs EIP-712 permit (OFF-CHAIN, NO GAS)
         ↓
┌─────────────────┐
│  Frontend       │
│  (Next.js)      │
└────────┬────────┘
         │ 2. POST /api/execute (HTTP request)
         ↓
┌─────────────────┐
│  Relayer API    │
│  (execute.ts)   │
└────────┬────────┘
         │ 3. Uses RELAYER_PK wallet
         │ 4. Pays gas fee
         ↓
┌─────────────────┐
│  Smart Contract │
│  (X402Adapter)  │
│  On Anvil       │
└─────────────────┘
```

## 💡 Why Gasless?

### Benefits for Users

1. **No Gas Fees** - Users don't need ETH to pay
2. **Better UX** - No need to manage gas prices
3. **Lower Barrier** - Easier for non-crypto users
4. **Faster** - No gas estimation delays

### Benefits for Service

1. **User Acquisition** - Remove friction
2. **Sponsor Payments** - Merchants can sponsor gas
3. **Batch Efficiency** - Relayer can batch transactions
4. **Predictable Costs** - Service controls gas costs

## 🔐 Security

### Is It Safe?

Yes! Here's why:

1. **User Only Signs Permit** - Never gives private key
2. **Permit is Specific** - Max amount, expiry, nonce
3. **Relayer Can't Steal** - Can only execute what permit allows
4. **Nonce Prevents Replay** - Each permit can only be used once

### Permit Structure

```typescript
{
  noteId: bytes32,        // Which note to use
  merchant: address,      // Who can pull
  maxAmount: uint256,     // Maximum allowed (safety limit)
  expiry: uint256,        // When it expires
  nonce: uint256,        // Prevents replay
  merchantCommitment: bytes32  // Shielded address (optional)
}
```

Relayer can only execute within these bounds!

## 📊 Cost Breakdown

### This Demo (Anvil)

| Component | Cost |
|-----------|------|
| User signature | $0 (off-chain) |
| Relayer execution | ~0.0001 ETH per tx |
| Relayer wallet | 10,000 ETH (free on Anvil) |
| **User pays** | **$0** ✅ |

### Production Estimate (Mainnet)

| Component | Cost |
|-----------|------|
| User signature | $0 (off-chain) |
| Relayer execution | ~$0.50-2.00 per tx (varies) |
| Relayer funding | Funded by service/merchant |
| **User pays** | **$0** ✅ (or subscription fee) |

## 🛠️ How to Verify

### Check Relayer Balance

```bash
# Get relayer address
RELAYER_ADDR=$(cast wallet address --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)

# Check balance on Anvil
cast balance $RELAYER_ADDR --rpc-url http://localhost:8545

# Expected: 9999999999999999999999... ETH (lots!)
```

### Check Transaction Costs

```bash
# Get transaction receipt
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getTransactionReceipt",
    "params": ["YOUR_TX_HASH"],
    "id": 1
  }' | jq '.result | {
    gasUsed: .gasUsed,
    effectiveGasPrice: .effectiveGasPrice
  }'
```

**Notice:** Transaction has `gasUsed` but **user didn't pay it!**

## 🎯 Key Points

1. **User Signs Off-Chain** - EIP-712 permit (no gas)
2. **Relayer Pays Gas** - Uses pre-funded wallet
3. **Anvil Provides Free ETH** - 10,000 ETH per account (local)
4. **Zero User Cost** - User never pays gas fees
5. **Same Security** - Permits are cryptographically secure

## 📚 Related Patterns

### EIP-712 Permits
- Gasless authorization signatures
- Domain-separated to prevent replay
- Used in Uniswap, Compound, etc.

### Meta-Transactions
- Relayer pattern (this demo)
- Paymaster pattern (sponsor pays)
- Account abstraction (ERC-4337)

### Sponsored Transactions
- Merchants sponsor gas for users
- Service providers cover costs
- DAOs fund community transactions

## 🚀 Production Considerations

### For Real Deployment

1. **Fund Relayer** - Need real ETH on mainnet
2. **Monitor Balance** - Alert when low
3. **Rate Limiting** - Prevent abuse
4. **Cost Recovery** - Charge users or merchants
5. **Batch Transactions** - Reduce gas per tx
6. **Gas Price Optimization** - Use lower prices when possible

### Alternatives

1. **User Pays Gas** - Traditional (simpler but worse UX)
2. **Merchant Sponsors** - Merchant pays for user transactions
3. **Subscription Fee** - Users pay monthly fee, no gas per tx
4. **Token Gating** - Hold token = free gas
5. **Account Abstraction** - ERC-4337 wallets handle gas

## ✅ Summary

**How it works:**
1. User signs EIP-712 permit (off-chain, $0)
2. Frontend sends to relayer API
3. Relayer uses its wallet to execute transaction
4. Relayer pays gas (user pays $0)

**In this demo:**
- Relayer = Anvil test account #1
- Pre-funded with 10,000 ETH (free!)
- All users benefit from free gas

**In production:**
- Relayer = Service provider's wallet
- Funded by service/merchants
- Users still pay $0 gas!

**Result:** Gasless transactions = Better UX + Lower barriers! 🎉



