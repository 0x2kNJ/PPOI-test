#!/bin/bash

# Run all tests for truncated ladder and ZK proof generation

echo "🚀 Running All Tests for Truncated Ladder and ZK Proof Generation"
echo "=================================================================="
echo ""

# Check if tsx is installed
if ! command -v tsx &> /dev/null; then
    echo "⚠️  tsx not found. Installing..."
    npm install -g tsx
fi

echo "📋 Test 1: Truncated Ladder Implementation"
echo "-------------------------------------------"
npx tsx src/test-truncated-ladder.ts

echo ""
echo "📋 Test 2: ZK Proof Generation for Repeated Transactions"
echo "---------------------------------------------------------"
npx tsx src/test-repeated-transactions.ts

echo ""
echo "✅ All tests completed!"

