#!/bin/bash

# start-symphony.sh - Start the Symphony Kanban System in the background

echo "🚀 Starting Symphony Kanban System..."

# Check if ports are already in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Warning: Port 3001 (API) is already in use."
fi

if lsof -Pi :5174 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Warning: Port 5174 (Frontend) is already in use."
fi

# Run the dev command in the background
# Using nohup to ensure it keeps running after terminal closes
# Redirection to symphony.log
nohup pnpm dev:symphony > symphony.log 2>&1 &

PID=$!
echo "📡 System processes spawned (Root PID: $PID). Logging to symphony.log"

# Wait for backend to be ready
echo "⏳ Waiting for services to initialize..."
MAX_RETRIES=30
COUNT=0
while [ $COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/api/health | grep -q "ok"; then
        echo "✅ Backend API is UP at http://localhost:3001"
        break
    fi
    sleep 2
    COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Timeout waiting for Backend API. Check symphony.log for details."
else
    echo "✅ Frontend is starting at http://localhost:5174"
    echo "🎉 Symphony is ready!"
fi
