# Local Demo Setup Guide (Anvil)

This guide shows you how to run the x402 subscriptions demo entirely locally using Foundry's Anvil.

## Prerequisites

- **Foundry** installed: `foundryup` or `curl -L https://foundry.paradigm.xyz | bash`
- **Node.js** 18+ and npm
- **MetaMask** browser extension

## Quick Start (3 Steps)

### Step 1: Start Anvil Local Blockchain

```bash
# Terminal 1: Start Anvil
anvil --block-time 2 --port 8545
```

This starts a local blockchain on `http://localhost:8545` with:
- 10 test accounts pre-funded with 10,000 ETH each
- Default chain ID: 31337
- Block time: 2 seconds

**Keep this terminal running!**

### Step 2: Deploy Contracts Locally

```bash
# Terminal 2: Deploy x402 contracts
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/scripts

# Set environment variables for local Anvil
export RPC_URL=http://localhost:8545
export DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # Anvil account #1
export POOL_ADDR=0x0000000000000000000000000000000000000000  # Placeholder (not needed for demo)
export RELAYER_ADDR=0x0  # No restriction (any sender allowed)

# Deploy contracts
npx ts-node deploy-x402.ts
```

**Save the X402Adapter address** from the output!

### Step 3: Configure & Run UI

```bash
# Terminal 3: Configure and start UI
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/apps/merchant-demo

# Create .env.local file
cat > .env.local << EOF
RPC_URL=http://localhost:8545
RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEXT_PUBLIC_X402_ADAPTER=<PASTE_X402_ADAPTER_ADDRESS_HERE>
NEXT_PUBLIC_RELAYER_URL=/api/execute
NEXT_PUBLIC_MERCHANT=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
NEXT_PUBLIC_CHAIN_ID=31337
EOF

# Replace <PASTE_X402_ADAPTER_ADDRESS_HERE> with actual address from Step 2
# Then start the UI
npm run dev
```

## Complete Setup Script

I've created a script to automate this - see `setup-local.sh` below.

## Testing the Demo

1. **Open http://localhost:3000**

2. **Connect MetaMask**:
   - Add Anvil network:
     - Network Name: `Localhost 8545`
     - RPC URL: `http://127.0.0.1:8545`
     - Chain ID: `31337`
     - Currency Symbol: `ETH`
   - Import Anvil account #1 private key:
     ```
     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
     ```
   - This account has 10,000 ETH for gas!

3. **Create Subscription**:
   - Enter amount: `10.00`
   - Click "Subscribe for 12 months"
   - Approve MetaMask signature requests
   - Watch checkmarks update! ✅

## Anvil Test Accounts

Use any of these accounts (all have 10,000 ETH):

| # | Address | Private Key |
|---|---------|-------------|
| 1 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 2 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 3 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

## Troubleshooting

### "Invalid address" error
- ✅ Ensure `.env.local` has `NEXT_PUBLIC_X402_ADAPTER` set correctly
- ✅ Restart `npm run dev` after updating `.env.local`

### "Gas estimate failed"
- ✅ Ensure Anvil is running on port 8545
- ✅ Check relayer has ETH (use account #1: has 10,000 ETH)
- ✅ Verify contract is deployed correctly

### "Connection failed"
- ✅ Add Anvil network to MetaMask (see above)
- ✅ Import Anvil account private key
- ✅ Ensure MetaMask is on Chain ID 31337

### Contract not found
- ✅ Redeploy contracts: `npx ts-node deploy-x402.ts`
- ✅ Copy the X402Adapter address to `.env.local`
- ✅ Restart Next.js dev server

## Manual Deployment (If Scripts Fail)

```bash
# Deploy SimplePolicyGate
forge create SimplePolicyGate --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Deploy PPOIVerifier
forge create PPOIVerifier --constructor-args 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 0x0000000000000000000000000000000000000000000000000000000000000001 1 0x0000000000000000000000000000000000000000000000000000000000000002 --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Deploy X402Adapter
forge create X402Adapter --constructor-args <POLICY_GATE_ADDR> <PPOI_ADDR> 0x0000000000000000000000000000000000000000 0x0000000000000000000000000000000000000000 --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
```

## Next Steps

Once everything is working locally:
1. Test subscription creation ✅
2. Test permit signing ✅
3. Test payment simulation ✅
4. Verify transactions on local block explorer (if using Otterscan)

