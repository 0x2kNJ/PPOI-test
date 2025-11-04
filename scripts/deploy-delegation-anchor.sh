#!/bin/bash
# Deploy DelegationAnchor contract for x402 private delegations

set -e

RPC_URL=${RPC_URL:-http://localhost:8545}
DEPLOYER_PK=${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}

# Default initial root (empty tree - 0x0)
INITIAL_ROOT=${INITIAL_ROOT:-0x0000000000000000000000000000000000000000000000000000000000000000}
# Default poster (deployer for demo - Anvil account #0)
POSTER_ADDR=${POSTER_ADDR:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}

cd "$(dirname "$0")/.."

echo "🚀 Deploying DelegationAnchor..."
echo "=========================================="
echo "RPC URL: $RPC_URL"
echo "Initial Root: $INITIAL_ROOT"
echo "Poster Address: $POSTER_ADDR"
echo ""

# Deploy DelegationAnchor
OUT=$(forge create contracts/DelegationAnchor.sol:DelegationAnchor \
  --constructor-args "$POSTER_ADDR" "$INITIAL_ROOT" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PK" \
  --broadcast \
  --via-ir \
  --optimizer-runs 200 2>&1)

ANCHOR_ADDR=$(echo "$OUT" | grep -i "deployed to:" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$ANCHOR_ADDR" ]; then
    echo "❌ DelegationAnchor deployment failed"
    echo "$OUT"
    exit 1
fi

echo "✅ DelegationAnchor deployed successfully!"
echo ""
echo "=========================================="
echo "📊 Deployment Summary"
echo "=========================================="
echo "Contract: DelegationAnchor"
echo "Address: $ANCHOR_ADDR"
echo "Poster: $POSTER_ADDR"
echo "Initial Root: $INITIAL_ROOT"
echo ""
echo "📝 Add to .env.local:"
echo "NEXT_PUBLIC_DELEGATION_ANCHOR=$ANCHOR_ADDR"
echo ""
echo "📝 Next steps:"
echo "1. Add NEXT_PUBLIC_DELEGATION_ANCHOR to .env.local"
echo "2. Update X402Adapter to include DelegationAnchor in constructor"
echo "3. Deploy updated X402Adapter with delegationAnchor address"
echo ""







