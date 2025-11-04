#!/bin/bash

# PPOI Demo Repository Cleanup Script
# Moves AI-generated debug logs to archive/ and keeps only essential docs

set -e  # Exit on error

echo "🧹 Starting repository cleanup..."
echo ""

# Create archive structure
mkdir -p archive/troubleshooting/self-protocol
mkdir -p archive/troubleshooting/websocket
mkdir -p archive/troubleshooting/qr-code
mkdir -p archive/troubleshooting/blockaid
mkdir -p archive/features/debit-card
mkdir -p archive/features/policy-gates
mkdir -p archive/features/privacy-pools
mkdir -p archive/features/trust-wallet
mkdir -p archive/features/other
mkdir -p archive/meeting-notes
mkdir -p archive/scripts

echo "✅ Created archive directory structure"

# Self Protocol debug logs
echo "📦 Archiving Self Protocol debug logs..."
find ../.. -maxdepth 1 -name "*SELF_*.md" -exec mv {} archive/troubleshooting/self-protocol/ \;
find ../.. -maxdepth 1 -name "*CANVAS*.md" -exec mv {} archive/troubleshooting/self-protocol/ \;
find ../.. -maxdepth 1 -name "*UUID*.md" -exec mv {} archive/troubleshooting/self-protocol/ \;
find ../.. -maxdepth 1 -name "*VITE*.md" -exec mv {} archive/troubleshooting/self-protocol/ \;
find .. -maxdepth 1 -name "*SELF_*.md" -exec mv {} archive/troubleshooting/self-protocol/ \;

# WebSocket debug logs
echo "📦 Archiving WebSocket debug logs..."
find ../.. -maxdepth 1 -name "*WEBSOCKET*.md" -exec mv {} archive/troubleshooting/websocket/ \;
find ../.. -maxdepth 1 -name "*CLOUDFLARE*.md" -exec mv {} archive/troubleshooting/websocket/ \;
find .. -maxdepth 1 -name "*WEBSOCKET*.md" -exec mv {} archive/troubleshooting/websocket/ \;
find .. -maxdepth 1 -name "*CLOUDFLARE*.md" -exec mv {} archive/troubleshooting/websocket/ \;

# QR Code debug logs
echo "📦 Archiving QR Code debug logs..."
find ../.. -maxdepth 1 -name "*QR_CODE*.md" -exec mv {} archive/troubleshooting/qr-code/ \;
find ../.. -maxdepth 1 -name "*RESET*.md" -exec mv {} archive/troubleshooting/qr-code/ \;
find ../.. -maxdepth 1 -name "*MANUAL*.md" -exec mv {} archive/troubleshooting/qr-code/ \;
find .. -maxdepth 1 -name "*QR*.md" -exec mv {} archive/troubleshooting/qr-code/ \;
find .. -maxdepth 1 -name "*MANUAL*.md" -exec mv {} archive/troubleshooting/qr-code/ \;

# Blockaid debug logs
echo "📦 Archiving Blockaid debug logs..."
find ../.. -maxdepth 1 -name "*BLOCKAID*.md" -exec mv {} archive/troubleshooting/blockaid/ \;
find ../.. -maxdepth 1 -name "*LOCALHOST*.md" -exec mv {} archive/troubleshooting/blockaid/ \;

# Feature exploration docs
echo "📦 Archiving feature exploration docs..."

# Debit card features
find ../.. -maxdepth 1 -name "*DEBIT_CARD*.md" -exec mv {} archive/features/debit-card/ \;
find ../.. -maxdepth 1 -name "*CARD_GRADE*.md" -exec mv {} archive/features/debit-card/ \;

# Policy gates
find ../.. -maxdepth 1 -name "*POLICY_GATES*.md" -exec mv {} archive/features/policy-gates/ \;
find ../.. -maxdepth 1 -name "*DYNAMIC_POLICY*.md" -exec mv {} archive/features/policy-gates/ \;

# Privacy pools
find ../.. -maxdepth 1 -name "*PRIVACY_POOLS*.md" -exec mv {} archive/features/privacy-pools/ \;
find ../.. -maxdepth 1 -name "*VIRTUAL*.md" -exec mv {} archive/features/privacy-pools/ \;

# Trust Wallet
find ../.. -maxdepth 1 -name "*TRUST_WALLET*.md" -exec mv {} archive/features/trust-wallet/ \;

# Other features
find ../.. -maxdepth 1 -name "*COVERAGE*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*BUCKET*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*REBUCKET*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*LADDER*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*PROXY*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*SPENDABLE*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*METAMASK*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*PERPETUAL*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*OPTIMAL*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*SEQUENTIAL*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*RESIDUAL*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*SPENDING*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*MATHEMATICAL*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*BREAKTHROUGH*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*SOLUTION*.md" -exec mv {} archive/features/other/ \;
find ../.. -maxdepth 1 -name "*WHY_*.md" -exec mv {} archive/features/other/ \;

# Meeting notes
echo "📦 Archiving meeting notes..."
find ../.. -maxdepth 1 -name "*.csv" -exec mv {} archive/meeting-notes/ \;
find ../.. -maxdepth 1 -name "*TEAM_DISCUSSION*.md" -exec mv {} archive/meeting-notes/ \;
find ../.. -maxdepth 1 -name "*meeting*.csv" -exec mv {} archive/meeting-notes/ \;

# Temporary scripts
echo "📦 Archiving temporary scripts..."
find ../.. -maxdepth 1 -name "quick_fix_setup.sh" -exec mv {} archive/scripts/ \;
find ../.. -maxdepth 1 -name "setup-github-*.sh" -exec mv {} archive/scripts/ \;
find .. -maxdepth 1 -name "check-setup.sh" -exec mv {} archive/scripts/ \;
find .. -maxdepth 1 -name "setup-self-protocol.sh" -exec mv {} archive/scripts/ \;
find .. -maxdepth 1 -name "start-local-test.sh" -exec mv {} archive/scripts/ \;
find .. -maxdepth 1 -name "start-self-mock.sh" -exec mv {} archive/scripts/ \;

# Remove build artifacts (optional - uncomment if needed)
# echo "🗑️  Removing build artifacts..."
# rm -rf cache/ out/ *.zip *.tar.gz

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Files archived: $(find archive -type f | wc -l)"
echo "  - Remaining docs in root: $(find ../.. -maxdepth 1 -name '*.md' | wc -l)"
echo "  - Remaining docs in demo/: $(find .. -maxdepth 1 -name '*.md' | wc -l)"
echo ""
echo "📁 Archive structure:"
tree -L 2 archive/ || find archive/ -type d
echo ""
echo "✨ Repository is now clean and professional!"
echo ""
echo "Next steps:"
echo "  1. Review archived files: cd archive/"
echo "  2. Test application: npm start"
echo "  3. Update documentation: edit README.md"
echo "  4. Commit changes: git add . && git commit -m 'Clean up repository'"

