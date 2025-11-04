# PPOI Flow Demo - Integration Guide

## Quick Start

### Option 1: Add to Existing App

In `demo/ui/App.tsx`, add an import and route:

```tsx
import PPOIFlowDemo from './src/components/PPOIFlowDemo'

// In your App component:
<PPOIFlowDemo />
```

### Option 2: Create Standalone Page

1. Copy `ppoi-flow.html` to `demo/ui/public/ppoi-flow.html`
2. Update `vite.config.js` to add a route
3. Or simply modify `index.html` temporarily to use `PPOIFlowPage.tsx`

### Option 3: Direct Access

1. Start the dev server: `cd demo/ui && npm run start`
2. Navigate to the component route
3. Or add a button/link in your main app to navigate to the PPOI flow

## Component Location

The component is located at:
- **File**: `demo/ui/src/components/PPOIFlowDemo.tsx`
- **Standalone entry**: `demo/ui/PPOIFlowPage.tsx`

## Features

✅ **Step-by-step flow** with visual status indicators
✅ **Wallet connection** via MetaMask
✅ **Deposit creation** with UTXO and commitment
✅ **ZK proof generation** (simulated, ready for real integration)
✅ **PPOI verification** (simulated, ready for real integration)
✅ **Status updates** showing progress at each step
✅ **Final status**: "✅ Deposit Successful & PPOI Verified"

## Visual Flow

```
1. Connect Wallet → [Connect Button]
   ↓
2. Create Deposit → [Create Deposit Button]
   ↓
3. Generate ZK Proof → [Generate Proof Button]
   ↓
4. Verify PPOI → [Verify PPOI Button]
   ↓
✅ Deposit Successful & PPOI Verified
```

## Status Colors

- **Green**: Step completed successfully
- **Blue**: Step in progress
- **Gray**: Step pending
- **Red**: Error occurred

## Next Steps for Production

1. **Replace proof generation** with real SDK calls
2. **Replace PPOI verification** with Blockaid integration
3. **Add on-chain verification** with pool contract
4. **Add transaction hashes** for tracking

## Testing

1. Start Anvil: `anvil --block-time 2 --port 8545`
2. Start UI: `cd demo/ui && npm run start`
3. Open browser: `http://localhost:4193`
4. Navigate to PPOI flow component
5. Connect wallet and follow the flow

