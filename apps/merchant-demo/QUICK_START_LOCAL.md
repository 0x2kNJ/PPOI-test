# Quick Start: Local Demo with Anvil

## 🚀 3 Simple Steps to Run Locally

### Step 1: Start Anvil (Terminal 1)

```bash
anvil --block-time 2 --port 8545
```

**Keep this terminal running!** You should see:
```
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...

Listening on 0.0.0.0:8545
```

### Step 2: Deploy Contracts (Terminal 2)

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/scripts

# Deploy x402 contracts to local Anvil
export RPC_URL=http://localhost:8545
export DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export POOL_ADDR=0x0000000000000000000000000000000000000000
export RELAYER_ADDR=0x0

npx ts-node deploy-x402.ts
```

**Save the X402Adapter address from the output!** Example:
```
✅ X402Adapter deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Step 3: Configure & Run UI (Terminal 3)

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/apps/merchant-demo

# Create .env.local file (replace <ADAPTER_ADDR> with address from Step 2)
cat > .env.local << EOF
RPC_URL=http://localhost:8545
RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEXT_PUBLIC_X402_ADAPTER=<ADAPTER_ADDR>
NEXT_PUBLIC_RELAYER_URL=/api/execute
NEXT_PUBLIC_MERCHANT=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
NEXT_PUBLIC_CHAIN_ID=31337
EOF

# Start UI
npm run dev
```

**Or use the automated script:**
```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/apps/merchant-demo
./setup-local.sh
```

### Step 4: Configure MetaMask

1. **Add Anvil Network**:
   - Open MetaMask → Settings → Networks → Add Network
   - Network Name: `Localhost 8545`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
   - Save

2. **Import Test Account**:
   - MetaMask → Import Account
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - This account has 10,000 ETH for gas!

3. **Switch to Localhost 8545** network

### Step 5: Test the Demo!

1. Open **http://localhost:3000**
2. Click **"Connect Wallet"**
3. Approve MetaMask connection
4. Enter amount: **10.00**
5. Click **"Subscribe for 12 months"**
6. Approve the EIP-712 signature request
7. Watch the checkmarks update! ✅

## ✅ Verification Checklist

- [ ] Anvil running on port 8545
- [ ] Contracts deployed (X402Adapter address saved)
- [ ] `.env.local` created with correct addresses
- [ ] MetaMask configured with Anvil network
- [ ] MetaMask account imported (has 10,000 ETH)
- [ ] UI running on http://localhost:3000
- [ ] Wallet connected successfully

## 🐛 Troubleshooting

### "Invalid address" Error
**Fix**: Ensure `.env.local` has correct `NEXT_PUBLIC_X402_ADAPTER`:
```bash
# Check .env.local
cat .env.local | grep NEXT_PUBLIC_X402_ADAPTER

# Should show something like:
# NEXT_PUBLIC_X402_ADAPTER=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### "Gas estimate failed"
**Fix**: 
1. Ensure Anvil is running: `curl http://localhost:8545`
2. Check relayer has ETH (account #1 has 10,000 ETH)
3. Verify contract is deployed: `cast code $ADAPTER_ADDR --rpc-url http://localhost:8545`

### "Connection failed"
**Fix**:
1. Add Anvil network to MetaMask (see Step 4)
2. Import test account private key
3. Ensure MetaMask is on Chain ID 31337

### Contract not found
**Fix**: Redeploy contracts:
```bash
cd demo/scripts
export RPC_URL=http://localhost:8545
export DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
npx ts-node deploy-x402.ts
```

## 📝 Anvil Accounts

All accounts have 10,000 ETH each:

| Account | Address | Private Key |
|---------|---------|-------------|
| #1 (Relayer) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| #2 (Merchant) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| #3 (User) | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

## 🎯 What You're Testing

- ✅ **Truncated Ladder**: 14 buckets for $120 balance
- ✅ **EIP-712 Permits**: Wallet signatures
- ✅ **Subscription Creation**: Full lifecycle
- ✅ **Payment Simulation**: Pull payments via relayer
- ✅ **Local Blockchain**: All on Anvil (no testnet needed)

## 🚀 Next Steps

Once local demo works:
1. Test subscription creation
2. Test permit signing
3. Test payment simulation
4. Verify transactions (use Otterscan at http://localhost:4194)

