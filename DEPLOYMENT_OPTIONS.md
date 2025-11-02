# How to Deploy x402 Contracts and Make Them Work

## Current Situation
- ✅ Anvil running (block 287)
- ✅ UI running (http://localhost:3000)
- ❌ Contracts not deployed (blocked by git submodules)

## Option 1: Docker Compose (EASIEST - Recommended)

This is the **quickest way** to get contracts deployed:

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo

# Start all services (Anvil, deployer, contracts, relayer)
docker compose up -d

# Wait ~30 seconds for deployment
sleep 30

# Check deployment logs
docker compose logs deployer

# Find deployed addresses
docker compose logs deployer | grep "X402Adapter\|SimplePolicyGate\|PPOIVerifier"
```

**Then update** `/Users/0xblockbird/Cursor/Bermuda/baanx/demo/apps/merchant-demo/.env.local`:
```bash
# Copy X402Adapter address from logs
NEXT_PUBLIC_X402_ADAPTER=<DEPLOYED_ADDRESS_FROM_LOGS>
```

Restart UI:
```bash
cd apps/merchant-demo
npm run dev
```

**Done!** All contracts deployed and working.

---

## Option 2: Fix Git Submodules (If You Have Access)

If you have SSH access to BermudaBay repos:

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx

# Initialize submodules
git submodule update --init --recursive

# Deploy contracts
cd demo/scripts
export RPC_URL=http://localhost:8545
export DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
npx tsx deploy-x402.ts
```

---

## Option 3: Manual Compilation & Deployment (Advanced)

If Docker isn't available and you don't have git access:

### Step 1: Install solc
```bash
# macOS
brew install solidity

# Or use foundryup
foundryup
```

### Step 2: Compile contracts manually
```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo

# SimplePolicyGate (no dependencies)
solc --bin --abi --optimize contracts/SimplePolicyGate.sol -o out/manual/

# PPOIVerifier (needs OpenZeppelin)
solc --bin --abi --optimize \
  --base-path . \
  --include-path lib/openzeppelin-contracts \
  contracts/PPOIVerifier.sol -o out/manual/

# X402Adapter (needs OpenZeppelin)  
solc --bin --abi --optimize \
  --base-path . \
  --include-path lib/openzeppelin-contracts \
  contracts/X402Adapter.sol -o out/manual/
```

### Step 3: Deploy with cast
```bash
# Deploy SimplePolicyGate
POLICY_BYTECODE=$(cat out/manual/SimplePolicyGate.bin)
POLICY_ADDR=$(cast send --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --create "0x$POLICY_BYTECODE" | grep "deployed to:" | cut -d: -f2 | tr -d ' ')

# Deploy PPOIVerifier (with constructor args)
PPOI_BYTECODE=$(cat out/manual/PPOIVerifier.bin)
PPOI_ADDR=$(cast send --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --create "0x$PPOI_BYTECODE" \
  --constructor-args \
    0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    0x0000000000000000000000000000000000000000000000000000000000000001 \
    1 \
    0x0000000000000000000000000000000000000000000000000000000000000002 \
  | grep "deployed to:" | cut -d: -f2 | tr -d ' ')

# Deploy X402Adapter (with constructor args)
ADAPTER_BYTECODE=$(cat out/manual/X402Adapter.bin)
ADAPTER_ADDR=$(cast send --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --create "0x$ADAPTER_BYTECODE" \
  --constructor-args \
    $POLICY_ADDR \
    $PPOI_ADDR \
    0x0000000000000000000000000000000000000000 \
    0x0 \
  | grep "deployed to:" | cut -d: -f2 | tr -d ' ')

echo "SimplePolicyGate: $POLICY_ADDR"
echo "PPOIVerifier: $PPOI_ADDR"  
echo "X402Adapter: $ADAPTER_ADDR"
```

---

## Option 4: Use Existing Deployed Instance (If Available)

If there's a testnet deployment already:

Update `.env.local`:
```bash
RPC_URL=https://sepolia.infura.io/v3/<YOUR_KEY>
NEXT_PUBLIC_X402_ADAPTER=<DEPLOYED_SEPOLIA_ADDRESS>
NEXT_PUBLIC_CHAIN_ID=11155111
```

---

## My Recommendation

**Use Docker Compose (Option 1)**

Why:
- ✅ Deploys everything in 1 command
- ✅ Includes relayer, mock backend, all contracts
- ✅ No git access needed
- ✅ No manual compilation needed
- ✅ Takes ~2 minutes

Just run:
```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo
docker compose up -d
docker compose logs deployer | grep X402Adapter
```

Then update `.env.local` with the X402Adapter address and restart the UI.

---

## What You Need Right Now

Tell me which option you prefer:
1. **Docker Compose** - I'll help you run it
2. **Fix Git Submodules** - If you have SSH access
3. **Manual Compilation** - If no Docker/git access
4. **Existing Deployment** - If there's a testnet instance

Which do you want to try?

