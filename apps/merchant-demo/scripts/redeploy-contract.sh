#!/bin/bash

# Script to redeploy the MockX402Adapter contract with updated Permit structure
# Run from: demo/apps/merchant-demo/

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 Redeploying MockX402Adapter Contract"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Create temporary build directory
TEMP_DIR="/tmp/x402-deploy-$(date +%s)"
echo "📁 Creating temporary directory: $TEMP_DIR"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Initialize Foundry project
echo "⚙️  Initializing Foundry project..."
forge init --no-git --force .

# Copy contract
echo "📋 Copying MockX402Adapter.sol..."
cp /Users/0xblockbird/Cursor/Bermuda/baanx/demo/apps/merchant-demo/contracts/MockX402Adapter.sol src/

# Build
echo "🔨 Building contract..."
forge build

# Deploy to Anvil
echo "🚀 Deploying to Anvil (localhost:8545)..."
OUTPUT=$(forge create src/MockX402Adapter.sol:MockX402Adapter \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast)

echo "$OUTPUT"

# Extract deployed address
DEPLOYED_ADDRESS=$(echo "$OUTPUT" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$DEPLOYED_ADDRESS" ]; then
  echo "❌ Failed to extract deployed address"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Contract Deployed Successfully!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📍 Deployed Address: $DEPLOYED_ADDRESS"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  📝 Next Steps:"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "1. Update .env.local with the new address:"
echo ""
echo "   NEXT_PUBLIC_X402_ADAPTER=$DEPLOYED_ADDRESS"
echo ""
echo "2. Restart the frontend:"
echo ""
echo "   cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/apps/merchant-demo"
echo "   npm run dev"
echo ""
echo "3. Refresh the browser (Cmd+Shift+R)"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🎉 Ready to test auto-recurring payments!"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Clean up
cd /
rm -rf "$TEMP_DIR"
echo "🧹 Cleaned up temporary directory"
echo ""

