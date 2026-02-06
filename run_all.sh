#!/bin/bash

# Kill background processes on exit
trap "kill 0" EXIT

echo "🚀 Iniciando IBKR Analytics..."

# Start Backend
echo "📡 Iniciando Backend (FastAPI)..."
./venv/bin/python3 api.py &

# Start Frontend
echo "💻 Iniciando Frontend (Vite)..."
cd frontend && npm run dev &

# Wait for both
wait
