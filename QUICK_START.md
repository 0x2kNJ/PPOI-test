# 🚀 x402 Demo - Quick Start Guide

## ✅ What's Already Running

1. **Anvil** (local blockchain) - http://localhost:8545 ✅
2. **UI** (Next.js) - http://localhost:3000 ✅
3. **Contracts** - SimplePolicyGate deployed ✅

## 📋 Step-by-Step Setup

### Step 1: Deploy X402Adapter

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo

# Deploy X402Adapter
POLICY_ADDR=0x5FbDB2315678afecb367f032d93F642f64180aa3
cast send --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --create "$(cat out/X402Adapter.sol/X402Adapter.json | jq -r '.bytecode.object')" \
  "$POLICY_ADDR" \
  0x0000000000000000000000000000000000000000
```

Copy the `contractAddress` from the output.

### Step 2: Configure UI Environment

Create/update `demo/apps/merchant-demo/.env.local`:

```bash
# RPC & relayer
RPC_URL=http://localhost:8545
RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Frontend config
NEXT_PUBLIC_X402_ADAPTER=<X402Adapter_ADDRESS_FROM_STEP_1>
NEXT_PUBLIC_RELAYER_URL=/api/execute
NEXT_PUBLIC_MERCHANT=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
NEXT_PUBLIC_CHAIN_ID=31337
```

### Step 3: Restart UI (if needed)

The UI should already be running on http://localhost:3000

If not:
```bash
cd demo/apps/merchant-demo
npm run dev
```

## 🎯 Test the Demo

1. **Open**: http://localhost:3000
2. **Connect Wallet** - Use MetaMask or WalletConnect
   - Network: Localhost 8545
   - Chain ID: 31337
3. **Create Subscription**:
   - Amount: $10.00 USDC/month
   - Click "Generate Precompute & Sign Permit"
4. **Test Payment**: Click "Charge Now" to test the pull payment

## 📝 What Works

✅ Wallet connection  
✅ EIP-712 permit signing  
✅ Precompute generation (mock proofs)  
✅ Subscription UI  
✅ Policy enforcement  

## ⚠️ What's Demo-Only

- **Proof verification**: Uses placeholder proofs (not real ZK)
- **Pool integration**: No actual shielded pool transfers
- **Compliance**: Simplified (no PPOI)

## 🐛 Troubleshooting

### UI shows errors?
- Check `.env.local` has correct `NEXT_PUBLIC_X402_ADAPTER`
- Verify Anvil is running: `cast block-number --rpc-url http://localhost:8545`

### Contract calls fail?
- Verify X402Adapter is deployed
- Check contract address in `.env.local`
- Verify SimplePolicyGate is deployed: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

## 🎉 That's It!

The demo is ready to test. All contracts are local - no submodules, no external dependencies!

