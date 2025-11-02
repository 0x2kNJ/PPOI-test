#!/bin/bash
# Direct deployment using forge create (no build artifacts needed)

set -e

RPC_URL=${RPC_URL:-http://localhost:8545}
DEPLOYER_PK=${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}
POOL_ADDR=${POOL_ADDR:-0x0000000000000000000000000000000000000000}
RELAYER_ADDR=${RELAYER_ADDR:-0x0}
DEPLOYER_ADDR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

cd "$(dirname "$0")/.."

echo "🚀 Deploying x402 contracts to local Anvil..."
echo "RPC: $RPC_URL"
echo ""

# Step 1: Deploy SimplePolicyGate (no dependencies)
echo "📝 Step 1: Deploying SimplePolicyGate..."
POLICY_OUT=$(forge create contracts/SimplePolicyGate:SimplePolicyGate \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PK" \
  --broadcast \
  --via-ir \
  --optimizer-runs 200 2>&1)

POLICY_GATE_ADDR=$(echo "$POLICY_OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$POLICY_GATE_ADDR" ]; then
    echo "❌ SimplePolicyGate deployment failed"
    echo "$POLICY_OUT"
    exit 1
fi

echo "✅ SimplePolicyGate deployed at: $POLICY_GATE_ADDR"

# Step 2: Deploy PPOIVerifier
echo ""
echo "📝 Step 2: Deploying PPOIVerifier..."
PPOI_OUT=$(forge create contracts/PPOIVerifier:PPOIVerifier \
  --constructor-args "$DEPLOYER_ADDR" \
    0x0000000000000000000000000000000000000000000000000000000000000001 \
    1 \
    0x0000000000000000000000000000000000000000000000000000000000000002 \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PK" \
  --broadcast \
  --via-ir \
  --optimizer-runs 200 2>&1)

PPOI_ADDR=$(echo "$PPOI_OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$PPOI_ADDR" ]; then
    echo "❌ PPOIVerifier deployment failed"
    echo "$PPOI_OUT"
    exit 1
fi

echo "✅ PPOIVerifier deployed at: $PPOI_ADDR"

# Step 3: Deploy X402Adapter
echo ""
echo "📝 Step 3: Deploying X402Adapter..."
ADAPTER_OUT=$(forge create contracts/X402Adapter:X402Adapter \
  --constructor-args "$POLICY_GATE_ADDR" "$PPOI_ADDR" "$POOL_ADDR" "$RELAYER_ADDR" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PK" \
  --broadcast \
  --via-ir \
  --optimizer-runs 200 2>&1)

ADAPTER_ADDR=$(echo "$ADAPTER_OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$ADAPTER_ADDR" ]; then
    echo "❌ X402Adapter deployment failed"
    echo "$ADAPTER_OUT"
    exit 1
fi

echo "✅ X402Adapter deployed at: $ADAPTER_ADDR"

# Summary
echo ""
echo "=========================================="
echo "✅ All contracts deployed successfully!"
echo "=========================================="
echo "SimplePolicyGate: $POLICY_GATE_ADDR"
echo "PPOIVerifier: $PPOI_ADDR"
echo "X402Adapter: $ADAPTER_ADDR"
echo ""
echo "📝 Add to .env.local:"
echo "NEXT_PUBLIC_X402_ADAPTER=$ADAPTER_ADDR"

