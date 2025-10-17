#!/bin/bash

echo "🧲 Starting Larmor Frequency Calculator..."
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the test script first
echo "🧪 Running Larmor frequency calculation test..."
node test-larmor.js

echo ""
echo "🚀 Starting web server..."
echo "   Open your browser to: http://localhost:3000"
echo "   Press Ctrl+C to stop the server"
echo ""

# Start the server
node server.js