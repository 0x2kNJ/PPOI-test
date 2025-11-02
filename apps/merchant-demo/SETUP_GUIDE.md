# x402 Subscriptions Demo - Complete Setup Guide

## ✅ What Was Built

### 1. **UI Components**
- ✅ `X402SubscriptionsDemo.tsx` - Full subscription management UI
- ✅ Wallet connection (MetaMask)
- ✅ Precompute generation with truncated ladder
- ✅ Subscription creation and management
- ✅ Payment simulation

### 2. **API Routes**
- ✅ `/api/execute.ts` - Relayer endpoint for X402Adapter calls
- ✅ `/api/subscription.ts` - Subscription CRUD operations

### 3. **Configuration**
- ✅ `abis/X402Adapter.json` - Contract ABI
- ✅ `.env.local.example` - Environment template
- ✅ `tsconfig.json` - TypeScript with path aliases
- ✅ `pages/index.tsx` - SSR-disabled demo entry point

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd demo/apps/merchant-demo
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
# RPC endpoint (get from Infura/Alchemy)
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Relayer private key (needs small ETH balance for gas)
RELAYER_PK=0xYourTestPrivateKey

# Deployed X402Adapter address (from deploy-x402.ts)
NEXT_PUBLIC_X402_ADAPTER=0xYourDeployedAdapterAddress

# Relayer API endpoint (leave as-is for local dev)
NEXT_PUBLIC_RELAYER_URL=/api/execute

# Default merchant address (optional)
NEXT_PUBLIC_MERCHANT=0xDefaultMerchantAddress

# Chain ID (11155111 = Sepolia)
NEXT_PUBLIC_CHAIN_ID=11155111
```

### 3. Deploy Contracts (if not already deployed)

```bash
cd ../../scripts
export RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
export DEPLOYER_PK=0xYourDeployerKey
export POOL_ADDR=0xBermudaPoolAddress
export RELAYER_ADDR=0x0  # or specific relayer address

npx ts-node deploy-x402.ts
```

Save the deployed `X402Adapter` address to `.env.local`

### 4. Run Development Server

```bash
cd ../apps/merchant-demo
npm run dev
```

Open http://localhost:3000

## 📖 User Flow

### Step 1: Connect Wallet
1. Click "Connect Wallet"
2. Approve MetaMask connection
3. Ensure you're on Sepolia testnet

### Step 2: Create Subscription
1. Enter merchant details:
   - **Name**: e.g., "Netflix"
   - **Address**: Merchant's Ethereum address
   - **Amount**: e.g., "9.99" (USDC)
   - **Interval**: Monthly or Daily

2. Click "Generate Precompute & Permit"
   - Creates noteId from your shielded balance
   - Signs EIP-712 permit with your wallet
   - Uses truncated ladder (17 buckets for $1,000 max)
   - Max amount = subscription amount × 12 months

3. Click "Create Subscription"
   - Stores subscription with permit
   - Shows next charge date

### Step 3: Manage Subscriptions
- **Simulate Payment**: Merchant pulls funds via relayer
- **Cancel**: Deactivate subscription
- View all your active/cancelled subscriptions

## 🏗️ Architecture

### Truncated Ladder Precompute System

```
Balance: $1,000 → 17 buckets (powers of 2)
Buckets: [1¢, 2¢, 4¢, 8¢, 16¢, 32¢, 64¢, $1.28, $2.56, $5.12, $10.24, $20.48, $40.96, $81.92, $163.84, $327.68, $655.36]

Example: $9.99 subscription
├─ Decompose: 512¢ + 256¢ + 128¢ + 64¢ + 32¢ + 4¢ + 2¢ + 1¢ = 999¢
├─ Generate proof for bucket combination
├─ Sign EIP-712 permit (maxAmount = $119.88 for 12 months)
└─ Store permit for recurring payments
```

### Flow Diagram

```
┌─────────────┐
│    User     │
│  (Wallet)   │
└──────┬──────┘
       │ 1. Generate Precompute
       │    (noteId + EIP-712 permit)
       ▼
┌─────────────┐
│     UI      │
│  (Next.js)  │
└──────┬──────┘
       │ 2. Create Subscription
       │    (POST /api/subscription)
       ▼
┌─────────────┐
│  Merchant   │
│  triggers   │
└──────┬──────┘
       │ 3. Payment
       │    (POST /api/execute)
       ▼
┌─────────────┐
│   Relayer   │
│  (gasless)  │
└──────┬──────┘
       │ 4. Execute take()
       ▼
┌─────────────┐
│ X402Adapter │
│  (on-chain) │
└─────────────┘
       │
       ▼
┌─────────────┐
│   Funds     │
│ transferred │
└─────────────┘
```

## 🧪 Testing

### Test Flow 1: Create Subscription
1. Connect wallet
2. Fill in merchant details
3. Generate precompute (signs permit)
4. Create subscription
5. ✅ Verify subscription appears in list

### Test Flow 2: Simulate Payment
1. Click "Simulate Payment" on active subscription
2. Relayer calls `X402Adapter.take()`
3. ✅ Verify transaction hash displayed
4. Check block explorer for transaction

### Test Flow 3: Cancel Subscription
1. Click "Cancel" on active subscription
2. ✅ Verify subscription marked as cancelled
3. Verify "Cancel" button disappears

## 🔍 Debugging

### Check Relayer Balance
```bash
cast balance $RELAYER_ADDRESS --rpc-url $RPC_URL
```
Ensure relayer has ~0.01 ETH for gas

### Check Contract Deployment
```bash
cast code $ADAPTER_ADDRESS --rpc-url $RPC_URL
```
Should return contract bytecode

### Test API Routes
```bash
# Test relayer endpoint
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"adapter":"0x...","method":"take","args":[...]}'

# Test subscription endpoint
curl http://localhost:3000/api/subscription?userAddress=0x...
```

### Common Errors

**"Gas estimate failed"**
- Relayer out of ETH
- Invalid contract address
- Permit signature invalid

**"Method not allowed"**
- Check HTTP method (POST/GET/DELETE)
- Verify API route exists

**"Connect failed"**
- MetaMask not installed
- Wrong network selected
- Wallet locked

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `RPC_URL` | Ethereum RPC endpoint | `https://sepolia.infura.io/v3/...` |
| `RELAYER_PK` | Relayer private key | `0x123...` |
| `NEXT_PUBLIC_X402_ADAPTER` | X402Adapter contract address | `0xabc...` |
| `NEXT_PUBLIC_RELAYER_URL` | Relayer API endpoint | `/api/execute` |
| `NEXT_PUBLIC_MERCHANT` | Default merchant address | `0xdef...` |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID | `11155111` (Sepolia) |

## 🚢 Production Checklist

- [ ] Replace in-memory subscription store with database
- [ ] Add cron job for automatic subscription charges
- [ ] Integrate real Bermuda SDK for ZK proofs
- [ ] Connect to actual shielded pool for noteId
- [ ] Add PPOI verification for compliance
- [ ] Implement proper error handling & retry logic
- [ ] Add email/webhook notifications
- [ ] Set up monitoring & alerting
- [ ] Add rate limiting on API routes
- [ ] Implement proper authentication
- [ ] Add subscription payment history
- [ ] Handle failed payments gracefully

## 📂 File Structure

```
apps/merchant-demo/
├── pages/
│   ├── index.tsx                      # Main entry (SSR disabled)
│   └── api/
│       ├── execute.ts                 # Relayer endpoint
│       └── subscription.ts            # Subscription CRUD
├── components/
│   └── X402SubscriptionsDemo.tsx      # Main UI component
├── abis/
│   └── X402Adapter.json               # Contract ABI
├── .env.local.example                 # Environment template
├── tsconfig.json                      # TypeScript config
├── package.json                       # Dependencies
├── README.md                          # User documentation
└── SETUP_GUIDE.md                     # This file
```

## ✅ Complete!

Your x402 subscriptions demo is ready to run. The system uses the truncated ladder approach (17 buckets for $1,000) and supports full subscription lifecycle management with private pull-payments.



