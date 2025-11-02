# Manual Local Deployment Guide

Since forge needs git submodules that may not be accessible, here's how to deploy manually:

## Prerequisites

1. **Anvil running**: `anvil --block-time 2 --port 8545` (in separate terminal)
2. **Git submodules initialized** (if available):
   ```bash
   cd demo
   git submodule update --init --recursive
   ```

## Option 1: Deploy with Forge (If Submodules Work)

If you have access to git submodules:

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo

# Deploy SimplePolicyGate
forge create contracts/SimplePolicyGate:SimplePolicyGate \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast --via-ir --optimizer-runs 200

# Save the deployed address (POLICY_GATE_ADDR)

# Deploy PPOIVerifier
forge create contracts/PPOIVerifier:PPOIVerifier \
  --constructor-args 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    0x0000000000000000000000000000000000000000000000000000000000000001 \
    1 \
    0x0000000000000000000000000000000000000000000000000000000000000002 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast --via-ir --optimizer-runs 200

# Save the deployed address (PPOI_ADDR)

# Deploy X402Adapter
forge create contracts/X402Adapter:X402Adapter \
  --constructor-args $POLICY_GATE_ADDR $PPOI_ADDR \
    0x0000000000000000000000000000000000000000 0x0 \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast --via-ir --optimizer-runs 200

# Save the X402Adapter address
```

## Option 2: Use Docker Compose (Recommended)

The existing `compose.yml` has everything set up:

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo

# Start all services (Anvil, deployer, relayer, etc.)
docker compose up -d

# Check logs
docker compose logs deployer

# Find deployed addresses in logs
docker compose logs deployer | grep "X402Adapter\|SimplePolicyGate\|PPOIVerifier"
```

## Option 3: UI-Only Demo (Mock Mode)

For testing the UI without contracts, the UI can work with mock addresses:

```bash
# .env.local already has placeholder addresses
# The UI will show errors on contract calls, but you can test:
# - Wallet connection
# - EIP-712 permit signing
# - UI flow and interactions
```

## After Deployment

1. Update `.env.local` with the deployed `X402Adapter` address:
   ```bash
   NEXT_PUBLIC_X402_ADAPTER=<DEPLOYED_ADDRESS>
   ```

2. Restart the UI:
   ```bash
   cd apps/merchant-demo
   npm run dev
   ```

3. Configure MetaMask:
   - Network: `http://127.0.0.1:8545`, Chain ID `31337`
   - Import account: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

4. Test the demo at http://localhost:3000

