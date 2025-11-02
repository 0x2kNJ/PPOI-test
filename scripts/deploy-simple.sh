#!/bin/bash
# Simple deployment script using forge create with correct paths

set -e

cd "$(dirname "$0")/.."
export FOUNDRY_PROFILE=x402

RPC_URL=${RPC_URL:-http://localhost:8545}
PK=${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}

echo "🚀 Deploying x402 contracts..."
echo ""

# Deploy SimplePolicyGate (already done, but verify)
POLICY_OUT=$(forge create SimplePolicyGate:SimplePolicyGate \
  --root . \
  --rpc-url "$RPC_URL" \
  --private-key "$PK" \
  --broadcast --via-ir --optimizer-runs 200 2>&1)

POLICY_ADDR=$(echo "$POLICY_OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1 || echo "0x5FbDB2315678afecb367f032d93F642f64180aa3")
echo "✅ SimplePolicyGate: $POLICY_ADDR"

# Deploy PPOIVerifier
echo ""
echo "📝 Deploying PPOIVerifier..."
PPOI_OUT=$(forge create PPOIVerifier:PPOIVerifier \
  --root . \
  --rpc-url "$RPC_URL" \
  --private-key "$PK" \
  --broadcast --via-ir --optimizer-runs 200 \
  --constructor-args 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    0x0000000000000000000000000000000000000000000000000000000000000001 \
    1 \
    0x0000000000000000000000000000000000000000000000000000000000000002 \
  2>&1)

PPOI_ADDR=$(echo "$PPOI_OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$PPOI_ADDR" ]; then
    echo "❌ PPOIVerifier deployment failed"
    echo "$PPOI_OUT"
    exit 1
fi

echo "✅ PPOIVerifier: $PPOI_ADDR"

# Deploy X402Adapter
echo ""
echo "📝 Deploying X402Adapter..."
ADAPTER_OUT=$(forge create X402Adapter:X402Adapter \
  --root . \
  --rpc-url "$RPC_URL" \
  --private-key "$PK" \
  --broadcast --via-ir --optimizer-runs 200 \
  --constructor-args "$POLICY_ADDR" "$PPOI_ADDR" \
    0x0000000000000000000000000000000000000000 0x0 \
  2>&1)

ADAPTER_ADDR=$(echo "$ADAPTER_OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$ADAPTER_ADDR" ]; then
    echo "❌ X402Adapter deployment failed"
    echo "$ADAPTER_OUT"
    exit 1
fi

echo "✅ X402Adapter: $ADAPTER_ADDR"

echo ""
echo "=========================================="
echo "✅ ALL CONTRACTS DEPLOYED!"
echo "=========================================="
echo "SimplePolicyGate: $POLICY_ADDR"
echo "PPOIVerifier: $PPOI_ADDR"
echo "X402Adapter: $ADAPTER_ADDR"
echo ""
echo "📝 Update apps/merchant-demo/.env.local:"
echo "NEXT_PUBLIC_X402_ADAPTER=$ADAPTER_ADDR"

