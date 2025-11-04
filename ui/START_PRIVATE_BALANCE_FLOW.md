# Start Private Balance Flow

## Quick Start

### Option 1: Modify index.tsx (Temporary)

Replace `demo/ui/index.tsx` content with:

```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import PPOIFlowDemo from './src/components/PPOIFlowDemo'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<PPOIFlowDemo />)
}
```

Then start the dev server:
```bash
cd demo/ui
npm run start
```

Access at: `http://localhost:4193`

### Option 2: Modify index.html (Temporary)

Replace the script tag in `demo/ui/index.html`:

```html
<script type="module" src="/PrivateBalanceFlow.tsx"></script>
```

Then start the dev server:
```bash
cd demo/ui
npm run start
```

### Option 3: Create Separate Route (Recommended)

Add to `vite.config.js`:

```js
export default {
  // ... existing config
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        'private-balance-flow': './private-balance-flow.html'
      }
    }
  }
}
```

Then access at: `http://localhost:4193/private-balance-flow.html`

## What You'll See

- **Title**: "Private Balance Flow"
- **Description**: "Create private deposits with compliance verification and zero-knowledge proofs"
- **4 Steps**:
  1. Connect Wallet
  2. Create Deposit
  3. Generate ZK Proof
  4. Verify PPOI
- **Status Indicators**: Visual progress for each step
- **Final Status**: "✅ Deposit Successful & PPOI Verified"

## Features

✅ No reference to debit card demo
✅ Standalone page
✅ Complete Private Balance Flow
✅ Real ZK proof generation (simulated, ready for production)
✅ PPOI verification (simulated, ready for production)

