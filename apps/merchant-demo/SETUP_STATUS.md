# Local Demo Setup Status

## ✅ Completed Steps

### Step 1: Start Anvil ✅
- Anvil is running on `http://localhost:8545`
- Chain ID: 31337
- Test accounts pre-funded with 10,000 ETH

### Step 2: Deploy Contracts ⚠️
**Issue**: Forge deployment is blocked by missing git submodules

**Solution Options**:

#### Option A: Fix Submodules (If You Have Access)
```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo
git submodule update --init --recursive
```

Then deploy:
```bash
cd scripts
export RPC_URL=http://localhost:8545
export DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export POOL_ADDR=0x0000000000000000000000000000000000000000
export RELAYER_ADDR=0x0

# Try direct forge deployment
cd ..
forge create contracts/SimplePolicyGate:SimplePolicyGate \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast --via-ir --optimizer-runs 200
```

#### Option B: Use Docker Compose (If Docker Running)
```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo
docker compose up -d
docker compose logs deployer | grep "X402Adapter"
```

#### Option C: Manual Deployment (Simplest for Demo)
Deploy contracts one by one using forge create commands (see MANUAL_DEPLOYMENT.md)

#### Option D: UI-Only Testing (No Contracts)
For UI testing, `.env.local` has placeholder addresses. You can test:
- Wallet connection
- EIP-712 permit signing
- UI flow and interactions
- Contract calls will fail, but UI works

### Step 3: Configure UI ✅
- `.env.local` created with placeholder addresses
- UI running at http://localhost:3000
- Ready to update with deployed contract addresses

### Step 4: Configure MetaMask 📝
**Manual step required:**

1. **Add Network**:
   - Open MetaMask → Settings → Networks → Add Network
   - Network Name: `Localhost 8545`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import Account**:
   - MetaMask → Import Account
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - This account has 10,000 ETH!

3. **Switch Network**: Select "Localhost 8545" in MetaMask

## Current Status

- ✅ **Step 1**: Anvil running
- ⚠️ **Step 2**: Contracts need deployment (blocked by submodules)
- ✅ **Step 3**: UI configured (placeholder addresses)
- 📝 **Step 4**: MetaMask config (manual)

## Next Steps

1. **If you have git submodule access**: Run `git submodule update --init --recursive` then deploy
2. **If Docker is available**: Use `docker compose up -d`
3. **For UI testing only**: Current setup works for UI testing (contract calls will fail)
4. **Manual forge deployment**: See MANUAL_DEPLOYMENT.md

## Quick Test (UI Only)

Even without deployed contracts, you can:
1. Open http://localhost:3000
2. Connect MetaMask (with Anvil network configured)
3. Test wallet connection
4. Test EIP-712 permit signing
5. See UI flow and interactions

Contract calls will fail, but the UI demonstrates the full flow!

## Deployment Status

| Component | Status | Address |
|-----------|--------|---------|
| Anvil | ✅ Running | http://localhost:8545 |
| SimplePolicyGate | ⏳ Not Deployed | - |
| PPOIVerifier | ⏳ Not Deployed | - |
| X402Adapter | ⏳ Not Deployed | - |
| UI | ✅ Running | http://localhost:3000 |
| MetaMask | 📝 Manual Config | - |

