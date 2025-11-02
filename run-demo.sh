#!/bin/bash
# Quick script to deploy and run x402 demo locally

set -e

cd "$(dirname "$0")"

echo "🚀 x402 Demo - Local Setup"
echo ""

# Check if Anvil is running
echo "1. Checking Anvil..."
if ! cast block-number --rpc-url http://localhost:8545 > /dev/null 2>&1; then
    echo "   ❌ Anvil is not running!"
    echo "   Start it with: anvil --block-time 2 --port 8545"
    exit 1
fi
echo "   ✅ Anvil is running"

# Check if contracts are compiled
echo ""
echo "2. Compiling contracts..."
export FOUNDRY_PROFILE=x402
if ! forge build --skip test --force > /dev/null 2>&1; then
    echo "   ❌ Compilation failed"
    exit 1
fi
echo "   ✅ Contracts compiled"

# Deploy SimplePolicyGate (if not already deployed)
echo ""
echo "3. Deploying SimplePolicyGate..."
POLICY_ADDR=$(cast code 0x5FbDB2315678afecb367f032d93F642f64180aa3 --rpc-url http://localhost:8545 2>&1 | head -c 20)
if [ -z "$POLICY_ADDR" ] || [ "$POLICY_ADDR" = "0x" ]; then
    echo "   Deploying SimplePolicyGate..."
    POLICY_OUT=$(forge create contracts/SimplePolicyGate.sol:SimplePolicyGate \
        --rpc-url http://localhost:8545 \
        --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
        --broadcast \
        --profile x402 2>&1)
    POLICY_ADDR=$(echo "$POLICY_OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
    if [ -z "$POLICY_ADDR" ]; then
        echo "   ❌ SimplePolicyGate deployment failed"
        exit 1
    fi
    echo "   ✅ SimplePolicyGate deployed: $POLICY_ADDR"
else
    echo "   ✅ SimplePolicyGate already deployed: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
    POLICY_ADDR="0x5FbDB2315678afecb367f032d93F642f64180aa3"
fi

# Deploy X402Adapter
echo ""
echo "4. Deploying X402Adapter..."
ADAPTER_OUT=$(forge create contracts/X402Adapter.sol:X402Adapter \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast \
    --constructor-args "$POLICY_ADDR" 0x0000000000000000000000000000000000000000 \
    --profile x402 2>&1)

ADAPTER_ADDR=$(echo "$ADAPTER_OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$ADAPTER_ADDR" ]; then
    echo "   ❌ X402Adapter deployment failed"
    echo "$ADAPTER_OUT"
    exit 1
fi

echo "   ✅ X402Adapter deployed: $ADAPTER_ADDR"

# Create .env.local for UI
echo ""
echo "5. Creating UI config..."
ENV_FILE="apps/merchant-demo/.env.local"
cat > "$ENV_FILE" <<EOF
# RPC & relayer
RPC_URL=http://localhost:8545
RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Frontend config
NEXT_PUBLIC_X402_ADAPTER=$ADAPTER_ADDR
NEXT_PUBLIC_RELAYER_URL=/api/execute
NEXT_PUBLIC_MERCHANT=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
NEXT_PUBLIC_CHAIN_ID=31337
EOF

echo "   ✅ Created $ENV_FILE"

# Final instructions
echo ""
echo "=========================================="
echo "✅ Demo is ready!"
echo "=========================================="
echo ""
echo "📝 Contract Addresses:"
echo "   SimplePolicyGate: $POLICY_ADDR"
echo "   X402Adapter:      $ADAPTER_ADDR"
echo ""
echo "🌐 UI: http://localhost:3000"
echo ""
echo "💡 If UI is not running, start it with:"
echo "   cd apps/merchant-demo && npm run dev"
echo ""
echo "🎉 Happy testing!"

