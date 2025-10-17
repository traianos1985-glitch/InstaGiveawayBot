#!/bin/bash

echo "🧲 Larmor Frequency Calculator - Starting Up"
echo "============================================="

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

echo "✅ Node.js and npm are available"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Run the test script first
echo "🧪 Running Larmor frequency tests..."
node test-larmor.js

if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

echo ""
echo "🚀 Starting the real-time server..."
echo "🌐 Server will be available at: http://localhost:5000"
echo "💬 Chat interface will be available for system interaction"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
node server.js