#!/bin/bash

# HTTP 402 Subscription Demo - Quick Start
# This script helps you start all required services

echo "🚀 Starting HTTP 402 Subscription Demo..."
echo ""
echo "This will open 3 terminals for:"
echo "  1. Anvil (local blockchain)"
echo "  2. Mock backend (ZK proof generation)"
echo "  3. Next.js frontend (demo UI)"
echo ""
echo "================================================"
echo ""

# Check if already running
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Terminal 1: Anvil
if check_port 8545; then
    echo "✅ Anvil already running on port 8545"
else
    echo "⚠️  Anvil not running. Start it with:"
    echo "   Terminal 1: anvil --chain-id 31337"
    echo ""
fi

# Terminal 2: Mock backend
if check_port 3001; then
    echo "✅ Mock backend already running on port 3001"
else
    echo "⚠️  Mock backend not running. Start it with:"
    echo "   Terminal 2: cd demo/mock-backend && npm start"
    echo ""
fi

# Terminal 3: Next.js
if check_port 3000; then
    echo "✅ Next.js already running on port 3000"
else
    echo "⚠️  Next.js not running. Start it with:"
    echo "   Terminal 3: cd demo/apps/merchant-demo && npm run dev"
    echo ""
fi

echo "================================================"
echo ""
echo "📱 Available Demos:"
echo ""
echo "1. HTTP 402 Subscription Demo (Recommended):"
echo "   http://localhost:3000/http402-subscription-demo"
echo ""
echo "2. HTTP 402 Full Demo:"
echo "   http://localhost:3000/http402-full-demo"
echo ""
echo "3. Simple Weather Demo:"
echo "   http://localhost:3000/weather-demo"
echo ""
echo "4. Original X402 Demo:"
echo "   http://localhost:3000"
echo ""
echo "================================================"
echo ""
echo "🎯 Quick Test Flow:"
echo ""
echo "1. Open: http://localhost:3000/http402-subscription-demo"
echo "2. Connect Wallet (MetaMask)"
echo "3. Request Weather → See HTTP 402"
echo "4. Choose Subscription Plan (Daily: 1 USDC)"
echo "5. Click 'Subscribe Now' → Pay on-chain"
echo "6. Request Weather again → Get HTTP 200 + Data!"
echo "7. Keep requesting → Unlimited access!"
echo ""
echo "✅ Ready to test!"

