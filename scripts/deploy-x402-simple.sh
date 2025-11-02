#!/bin/bash
# Simple deployment script for local Anvil - uses forge create directly

set -e

RPC_URL=${RPC_URL:-http://localhost:8545}
DEPLOYER_PK=${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}
POOL_ADDR=${POOL_ADDR:-0x0000000000000000000000000000000000000000}
RELAYER_ADDR=${RELAYER_ADDR:-0x0}
DEPLOYER_ADDR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

echo "🚀 Deploying x402 contracts to local Anvil..."
echo "RPC: $RPC_URL"
echo "Deployer: $DEPLOYER_ADDR"
echo ""

cd "$(dirname "$0")/.."

# Step 1: Deploy SimplePolicyGate
echo "📝 Step 1: Deploying SimplePolicyGate..."
POLICY_GATE_OUT=$(forge create contracts/SimplePolicyGate:SimplePolicyGate \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PK" \
  --broadcast 2>&1) || echo "Failed - may need to compile first"

POLICY_GATE_ADDR=$(echo "$POLICY_GATE_OUT" | grep -oP 'Deployed to: \K0x[a-fA-F0-9]{40}' || echo "")
if [ -z "$POLICY_GATE_ADDR" ]; then
    echo "⚠️  SimplePolicyGate deployment failed or not found"
    echo "   You may need to compile contracts first: forge build --skip test"
    POLICY_GATE_ADDR="MANUAL_DEPLOY_NEEDED"
else
    echo "✅ SimplePolicyGate deployed at: $POLICY_GATE_ADDR"
fi

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
  --broadcast 2>&1) || echo "Failed"

PPOI_ADDR=$(echo "$PPOI_OUT" | grep -oP 'Deployed to: \K0x[a-fA-F0-9]{40}' || echo "")
if [ -z "$PPOI_ADDR" ]; then
    echo "⚠️  PPOIVerifier deployment failed or not found"
    PPOI_ADDR="MANUAL_DEPLOY_NEEDED"
else
    echo "✅ PPOIVerifier deployed at: $PPOI_ADDR"
fi

# Step 3: Deploy X402Adapter
if [ "$POLICY_GATE_ADDR" != "MANUAL_DEPLOY_NEEDED" ] && [ "$PPOI_ADDR" != "MANUAL_DEPLOY_NEEDED" ]; then
    echo ""
    echo "📝 Step 3: Deploying X402Adapter..."
    ADAPTER_OUT=$(forge create contracts/X402Adapter:X402Adapter \
      --constructor-args "$POLICY_GATE_ADDR" "$PPOI_ADDR" "$POOL_ADDR" "$RELAYER_ADDR" \
      --rpc-url "$RPC_URL" \
      --private-key "$DEPLOYER_PK" \
      --broadcast 2>&1) || echo "Failed"
    
    ADAPTER_ADDR=$(echo "$ADAPTER_OUT" | grep -oP 'Deployed to: \K0x[a-fA-F0-9]{40}' || echo "")
    if [ -z "$ADAPTER_ADDR" ]; then
        echo "⚠️  X402Adapter deployment failed"
        ADAPTER_ADDR="MANUAL_DEPLOY_NEEDED"
    else
        echo "✅ X402Adapter deployed at: $ADAPTER_ADDR"
    fi
else
    echo ""
    echo "⚠️  Skipping X402Adapter - dependencies not deployed"
    ADAPTER_ADDR="MANUAL_DEPLOY_NEEDED"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Deployment Summary"
echo "=========================================="
echo "SimplePolicyGate: $POLICY_GATE_ADDR"
echo "PPOIVerifier: $PPOI_ADDR"
echo "X402Adapter: $ADAPTER_ADDR"
echo ""

if [ "$ADAPTER_ADDR" != "MANUAL_DEPLOY_NEEDED" ]; then
    echo "✅ All contracts deployed!"
    echo ""
    echo "📝 Add to .env.local:"
    echo "NEXT_PUBLIC_X402_ADAPTER=$ADAPTER_ADDR"
else
    echo "⚠️  Manual deployment needed. Run:"
    echo ""
    echo "forge create contracts/SimplePolicyGate:SimplePolicyGate --rpc-url $RPC_URL --private-key $DEPLOYER_PK --broadcast"
    echo "forge create contracts/PPOIVerifier:PPOIVerifier --constructor-args $DEPLOYER_ADDR 0x0000000000000000000000000000000000000000000000000000000000000001 1 0x0000000000000000000000000000000000000000000000000000000000000002 --rpc-url $RPC_URL --private-key $DEPLOYER_PK --broadcast"
    echo "forge create contracts/X402Adapter:X402Adapter --constructor-args <POLICY> <PPOI> $POOL_ADDR $RELAYER_ADDR --rpc-url $RPC_URL --private-key $DEPLOYER_PK --broadcast"
fi



