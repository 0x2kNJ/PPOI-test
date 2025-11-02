#!/bin/bash
# Manual deployment script that bypasses forge submodule issues
# Deploys x402 contracts directly to Anvil using cast

set -e

RPC_URL=${RPC_URL:-http://localhost:8545}
DEPLOYER_PK=${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}
DEPLOYER_ADDR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

echo "🚀 Manual x402 Deployment to Anvil"
echo "RPC: $RPC_URL"
echo "Deployer: $DEPLOYER_ADDR"
echo ""

# Check Anvil is running
if ! curl -s -X POST $RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    echo "❌ Anvil not running at $RPC_URL"
    echo "Start it with: anvil --block-time 2 --port 8545"
    exit 1
fi
echo "✅ Anvil is running"
echo ""

# Step 1: Compile SimplePolicyGate (no dependencies)
echo "📝 Step 1: Compiling SimplePolicyGate..."
cd "$(dirname "$0")/.."

# Use forge's solc directly to compile just this file
solc_version=$(forge --version | grep -o 'solc [0-9.]*' | cut -d' ' -f2 || echo "0.8.30")

# Try to compile with forge, ignoring submodule errors
FOUNDRY_OFFLINE=true forge build --skip test --force contracts/SimplePolicyGate.sol 2>/dev/null || true

if [ -f "out/SimplePolicyGate.sol/SimplePolicyGate.json" ]; then
    echo "✅ SimplePolicyGate compiled"
    POLICY_BYTECODE=$(jq -r '.bytecode.object' out/SimplePolicyGate.sol/SimplePolicyGate.json)
else
    echo "⚠️  Could not compile SimplePolicyGate with forge"
    echo "   Deploying requires manual compilation or Docker"
    exit 1
fi

# Deploy SimplePolicyGate
echo ""
echo "📝 Deploying SimplePolicyGate..."
POLICY_TX=$(cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" --create "$POLICY_BYTECODE" 2>&1)
POLICY_ADDR=$(echo "$POLICY_TX" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$POLICY_ADDR" ]; then
    echo "❌ SimplePolicyGate deployment failed"
    exit 1
fi
echo "✅ SimplePolicyGate deployed at: $POLICY_ADDR"

# Continue with other contracts...
echo ""
echo "📝 For PPOIVerifier and X402Adapter, you need:"
echo "   1. OpenZeppelin contracts available"
echo "   2. Forge to compile with dependencies"
echo ""
echo "Recommendation: Use Docker compose for full deployment"
echo "   cd demo && docker compose up -d"

