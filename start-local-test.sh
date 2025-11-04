#!/bin/bash

echo "🧪 Starting Self Protocol - Local Test Mode"
echo "============================================"
echo ""
echo "⚠️  Note: This uses a placeholder URL for local testing."
echo "   The QR code will generate, but scanning won't work without ngrok."
echo ""

# Kill any existing processes
echo "Cleaning up old processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1

# Start mock backend
echo "Starting mock backend on port 3001..."
cd backend
node mock-server.js > /tmp/mock-backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 2

if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Mock backend started (PID: $BACKEND_PID)"
    echo "   URL: http://localhost:3001"
else
    echo "❌ Failed to start mock backend"
    cat /tmp/mock-backend.log
    exit 1
fi

# Create .env.demo for UI (with placeholder)
cd ui
cat > .env.demo << 'EOF'
# Local test mode - uses placeholder URL
# The QR code will generate but won't work until you set up ngrok
# See MOCK_BACKEND_SETUP.md for ngrok instructions
VITE_SELF_CALLBACK_URL=https://your-app.com/api/self-callback
EOF

echo "✅ Created ui/.env.demo"
echo ""
echo "📋 What's Running:"
echo "   • Mock backend: http://localhost:3001"
echo "   • Logs: tail -f /tmp/mock-backend.log"
echo ""
echo "📱 Next Steps:"
echo ""
echo "1. Start the UI (in a NEW terminal):"
echo "   cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/ui"
echo "   npm run start"
echo ""
echo "2. Open browser:"
echo "   http://localhost:4193"
echo ""
echo "3. Test the QR code generation:"
echo "   • Create deposit"
echo "   • Enable Self Protocol"
echo "   • Click 'Verify Identity'"
echo "   • QR code should appear ✅"
echo ""
echo "⚠️  To make scanning work, install ngrok:"
echo "   Mac: brew install ngrok"
echo "   Then run: ./start-self-mock.sh"
echo ""
echo "🛑 To stop: kill $BACKEND_PID"
echo ""

