#!/bin/bash
# Deploy HonkVerifier for precompute circuit (same as baanx demo)

set -e

RPC=${RPC:-http://localhost:8545}
FROM=${FROM:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}
PRIVATE_KEY=${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}

echo "Deploying HonkVerifier for precompute circuit..."

cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo

# Deploy the precompute verifier (same as baanx demo)
r="$(
  forge create \
    --optimizer-runs 200 \
    --no-cache \
    --out ./out \
    --broadcast \
    --private-key $PRIVATE_KEY \
    --rpc-url "$RPC" \
    lib/precompute-circuit/HonkVerifier.sol:HonkVerifier
)"

verifier_address=$(echo "$r" | grep 'Deployed to:' | grep -o '0x[a-fA-F0-9]\{40\}')
echo "✅ HonkVerifier deployed to: $verifier_address"
echo ""
echo "PRECOMPUTE_VERIFIER_ADDRESS=$verifier_address"
echo ""
echo "Update your deployment script with this address!"

