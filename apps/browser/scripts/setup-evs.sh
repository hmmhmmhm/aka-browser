#!/bin/bash

# EVS Setup Script
# This script helps set up the EVS (Electron for Content Security VMP signing) environment

set -e

echo ""
echo "=========================================="
echo "EVS Setup Script"
echo "=========================================="
echo ""

# Check Python 3
echo "[1/4] Checking Python 3..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3 first:"
    echo "  macOS: brew install python3"
    echo "  Linux: sudo apt install python3 python3-pip"
    exit 1
fi
echo "✓ Python 3 found: $(python3 --version)"
echo ""

# Install castlabs-evs
echo "[2/4] Installing castlabs-evs..."
echo "Note: Using --break-system-packages flag for Homebrew Python..."
pip3 install --break-system-packages --upgrade castlabs-evs
echo "✓ castlabs-evs installed"
echo ""

# Check if EVS account exists
EVS_CONFIG="$HOME/.config/evs/config.json"
if [ -f "$EVS_CONFIG" ]; then
    echo "[3/4] EVS account already configured"
    ACCOUNT_NAME=$(cat "$EVS_CONFIG" | grep -o '"account_name": "[^"]*"' | cut -d'"' -f4)
    echo "✓ Account: $ACCOUNT_NAME"
    echo ""
    
    echo "[4/4] Refreshing authorization tokens..."
    echo "Please enter your EVS password when prompted:"
    python3 -m castlabs_evs.account reauth
else
    echo "[3/4] Creating EVS account..."
    echo "Please follow the prompts to create your free EVS account:"
    echo ""
    python3 -m castlabs_evs.account signup
    echo ""
    
    echo "[4/4] Account created successfully!"
fi

echo ""
echo "=========================================="
echo "✓ EVS Setup Complete!"
echo "=========================================="
echo ""
echo "Verifying setup..."
node scripts/evs-sign.js --verify

echo ""
echo "You can now build and sign your application:"
echo "  $ pnpm run package"
echo ""
