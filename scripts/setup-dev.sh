#!/bin/bash

# Setup Development Environment

echo "Setting up BitTask development environment..."

# install root dependencies
# npm install

# setup contracts
echo "Setting up contracts..."
cd contracts
npm install
cd ..

# setup frontend
echo "Setting up frontend..."
cd frontend
npm install
if [ ! -f .env.local ]; then
    echo "Creating .env.local..."
    cp .env.sample .env.local
fi
cd ..

echo "Setup complete! Run 'cd frontend && npm run dev' to start the app."
