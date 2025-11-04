#!/bin/bash

echo "🔍 Checking Self Protocol Setup"
echo "==============================="
echo ""

# Check backend
echo "1. Checking mock backend..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Backend running on localhost:3001"
    curl -s http://localhost:3001/health
else
    echo "   ❌ Backend NOT running"
    echo "   Start it with: cd backend && node mock-server.js"
fi
echo ""

# Check .env.demo
echo "2. Checking .env.demo..."
if [ -f "ui/.env.demo" ]; then
    echo "   ✅ .env.demo exists"
    echo "   Content:"
    cat ui/.env.demo | sed 's/^/      /'
    
    CALLBACK_URL=$(grep VITE_SELF_CALLBACK_URL ui/.env.demo | cut -d'=' -f2)
    echo ""
    echo "   Callback URL: $CALLBACK_URL"
    
    # Extract just the base URL (remove /api/self-callback)
    BASE_URL=$(echo $CALLBACK_URL | sed 's|/api/self-callback||')
    
    echo ""
    echo "3. Testing callback endpoint..."
    if curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
        echo "   ✅ Endpoint reachable!"
        curl -s "${BASE_URL}/health"
    else
        echo "   ❌ Endpoint NOT reachable"
        echo "   This is why you're getting 404!"
    fi
else
    echo "   ❌ .env.demo NOT found"
    echo "   Create it with your Cloudflare tunnel URL"
fi
echo ""

echo "📋 Summary:"
echo "----------"
echo "For Self Protocol to work, you need:"
echo "1. Mock backend running ✓/✗"
echo "2. Cloudflare tunnel running ✓/✗"
echo "3. .env.demo with correct URL ✓/✗"
echo "4. Frontend restarted after .env.demo created ✓/✗"
echo ""

