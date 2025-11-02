#!/bin/bash
# Quick setup script for local Anvil demo

set -e

echo "🚀 x402 Local Demo Setup"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Anvil
echo -e "${YELLOW}Step 1: Checking Anvil...${NC}"
if ! command -v anvil &> /dev/null; then
    echo -e "${RED}❌ Anvil not found. Install Foundry:${NC}"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    exit 1
fi
echo -e "${GREEN}✅ Anvil found${NC}"

# Step 2: Check if Anvil is running
echo -e "${YELLOW}Step 2: Checking if Anvil is running...${NC}"
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Anvil not running. Starting Anvil...${NC}"
    echo "   Run in a separate terminal: anvil --block-time 2 --port 8545"
    echo "   Then run this script again."
    read -p "Press Enter to continue anyway (you'll need to start Anvil manually)..."
else
    echo -e "${GREEN}✅ Anvil is running${NC}"
fi

# Step 3: Deploy contracts
echo ""
echo -e "${YELLOW}Step 3: Deploying x402 contracts...${NC}"
cd ../../scripts

export RPC_URL=http://localhost:8545
export DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export POOL_ADDR=0x0000000000000000000000000000000000000000
export RELAYER_ADDR=0x0

echo "   RPC URL: $RPC_URL"
echo "   Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo ""

# Deploy contracts
if npx ts-node deploy-x402.ts 2>&1 | tee /tmp/x402-deploy.log; then
    # Extract X402Adapter address from log
    ADAPTER_ADDR=$(grep -i "X402Adapter deployed at:" /tmp/x402-deploy.log | grep -o '0x[a-fA-F0-9]\{40\}' | tail -1)
    
    if [ -z "$ADAPTER_ADDR" ]; then
        echo -e "${RED}❌ Failed to extract X402Adapter address${NC}"
        echo "   Check deployment log above"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ Contracts deployed!${NC}"
    echo "   X402Adapter: $ADAPTER_ADDR"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Step 4: Create .env.local
echo ""
echo -e "${YELLOW}Step 4: Creating .env.local...${NC}"
cd ../apps/merchant-demo

cat > .env.local << EOF
# Local Anvil configuration
RPC_URL=http://localhost:8545
RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEXT_PUBLIC_X402_ADAPTER=$ADAPTER_ADDR
NEXT_PUBLIC_RELAYER_URL=/api/execute
NEXT_PUBLIC_MERCHANT=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
NEXT_PUBLIC_CHAIN_ID=31337
EOF

echo -e "${GREEN}✅ .env.local created${NC}"
echo "   X402Adapter: $ADAPTER_ADDR"

# Step 5: Summary
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Ensure Anvil is running: anvil --block-time 2 --port 8545"
echo "   2. Configure MetaMask:"
echo "      - Add network: http://127.0.0.1:8545, Chain ID 31337"
echo "      - Import account: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "   3. Start UI: npm run dev"
echo "   4. Open: http://localhost:3000"
echo ""
echo "📝 Contract Addresses:"
echo "   X402Adapter: $ADAPTER_ADDR"
echo "   Relayer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Anvil account #1)"
echo "   Merchant: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Anvil account #2)"
echo ""



