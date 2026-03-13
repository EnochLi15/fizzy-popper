#!/bin/bash

# stop-symphony.sh - Stop the Symphony Kanban System

echo "🛑 Stopping Symphony Kanban System..."

# Function to kill processes by port
kill_port() {
    PORT=$1
    PID=$(lsof -ti :$PORT)
    if [ ! -z "$PID" ]; then
        echo "Killing process on port $PORT (PID: $PID)"
        kill -9 $PID 2>/dev/null
    fi
}

# Kill API and Frontend
kill_port 3001
kill_port 5174

# Kill any lingering pnpm/tsx/vite processes related to the project
# We use grep to narrow down to this directory to avoid killing unrelated processes
PROJECT_DIR=$(pwd)
PIDS=$(ps aux | grep "$PROJECT_DIR" | grep -E "tsx|vite|node" | grep -v grep | awk '{print $2}')

if [ ! -z "$PIDS" ]; then
    echo "Cleaning up lingering processes..."
    echo "$PIDS" | xargs kill -9 2>/dev/null
fi

echo "✅ All Symphony processes stopped."
