#!/bin/bash
# Stop x402 Demo Services

echo "🛑 Stopping x402 Demo Services..."

# Read PIDs
BACKEND_PID=$(cat "$(dirname "$0")/backend.pid" 2>/dev/null)
FRONTEND_PID=$(cat "$(dirname "$0")/frontend.pid" 2>/dev/null)

# Stop backend
if [ -n "$BACKEND_PID" ]; then
    echo "   Stopping Mock Backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null && echo "   ✅ Mock Backend stopped" || echo "   ⚠️  Process not found"
fi

# Stop frontend
if [ -n "$FRONTEND_PID" ]; then
    echo "   Stopping Frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null && echo "   ✅ Frontend stopped" || echo "   ⚠️  Process not found"
fi

# Clean up PID files
rm -f "$(dirname "$0")/backend.pid" "$(dirname "$0")/frontend.pid"

# Also kill any processes on the ports (fallback)
BACKEND_PORT_PID=$(lsof -ti:3001)
FRONTEND_PORT_PID=$(lsof -ti:3000)

if [ -n "$BACKEND_PORT_PID" ]; then
    echo "   Cleaning up process on port 3001..."
    kill $BACKEND_PORT_PID 2>/dev/null
fi

if [ -n "$FRONTEND_PORT_PID" ]; then
    echo "   Cleaning up process on port 3000..."
    kill $FRONTEND_PORT_PID 2>/dev/null
fi

echo ""
echo "✅ All x402 Demo services stopped"



