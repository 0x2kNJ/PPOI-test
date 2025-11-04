#!/bin/bash

# Quick start script for Private Balance Flow UI

echo "🚀 Starting Private Balance Flow UI..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Please run this script from demo/ui directory"
  echo "   cd demo/ui && ./START_UI.sh"
  exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  echo "   (This may take a few minutes)"
  npm install --legacy-peer-deps || npm install --ignore-scripts
fi

# Check if SDK dependencies are installed
if [ ! -d "lib/sdk/node_modules" ]; then
  echo "📦 Installing SDK dependencies..."
  cd lib/sdk
  npm install --legacy-peer-deps || npm install
  cd ../..
fi

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "🌐 Starting development server..."
echo "   UI will be available at: http://localhost:4193"
echo ""
echo "📝 What you'll see:"
echo "   - Private Balance Flow page"
echo "   - 4 steps: Connect Wallet → Create Deposit → Generate ZK Proof → Verify PPOI"
echo ""
echo "🔗 Open in browser: http://localhost:4193"
echo ""

# Start the dev server
npm run start

