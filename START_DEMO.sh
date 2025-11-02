#!/bin/bash
# Start x402 Demo - All Services

echo "🚀 Starting x402 Private Pull-Payments Demo"
echo ""

# Check if ports are available
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3001 is already in use. Please stop the existing process."
    exit 1
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is already in use. Please stop the existing process."
    exit 1
fi

# Start mock-backend in background
echo "1️⃣  Starting Mock Backend (ZK Proof Generation)..."
cd "$(dirname "$0")/mock-backend"
npm start > ../mock-backend.log 2>&1 &
BACKEND_PID=$!
echo "   ✅ Mock Backend started (PID: $BACKEND_PID)"
echo "   📝 Logs: demo/mock-backend.log"

# Wait for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "   ❌ Mock Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start Next.js frontend in background
echo ""
echo "2️⃣  Starting Next.js Frontend..."
cd "$(dirname "$0")/apps/merchant-demo"
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   ✅ Frontend started (PID: $FRONTEND_PID)"
echo "   📝 Logs: demo/frontend.log"

# Wait for frontend to start
sleep 5

echo ""
echo "✅ x402 Demo is running!"
echo ""
echo "🌐 Open your browser:"
echo "   http://localhost:3000"
echo ""
echo "📊 Service Status:"
echo "   Mock Backend:  http://localhost:3001  (PID: $BACKEND_PID)"
echo "   Frontend:      http://localhost:3000  (PID: $FRONTEND_PID)"
echo ""
echo "🛑 To stop all services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Or use: ./STOP_DEMO.sh"
echo ""

# Save PIDs for cleanup
echo "$BACKEND_PID" > "$(dirname "$0")/backend.pid"
echo "$FRONTEND_PID" > "$(dirname "$0")/frontend.pid"

# Keep script running and tail logs
echo "📋 Streaming logs (Ctrl+C to stop watching, services will continue)..."
echo ""
tail -f "$(dirname "$0")/mock-backend.log" "$(dirname "$0")/frontend.log"

