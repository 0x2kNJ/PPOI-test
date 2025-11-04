# Quick Start - Private Balance Flow UI

## Step-by-Step Instructions

### 1. Navigate to UI Directory

```bash
cd demo/ui
```

### 2. Install Dependencies

```bash
npm install
```

If you encounter errors with git dependencies, try:

```bash
npm install --legacy-peer-deps
```

Or install TypeScript first:

```bash
npm install typescript --save-dev
npm install
```

### 3. Start Development Server

```bash
npm run start
```

This will start Vite dev server on port **4193**

### 4. Open Browser

Open your browser and go to:
```
http://localhost:4193
```

## What You'll See

The **Private Balance Flow** page with:

- **Title**: "Private Balance Flow"
- **4 Steps**:
  1. Connect Wallet
  2. Create Deposit
  3. Generate ZK Proof
  4. Verify PPOI

## Testing the Flow

1. **Click "Connect"** → Connect MetaMask wallet
2. **Click "Create Deposit"** → Creates deposit UTXO
3. **Click "Generate Proof"** → Generates ZK proof
4. **Click "Verify PPOI"** → Verifies compliance

## MetaMask Setup (Optional)

If you want to test with wallet connection:

1. Install MetaMask browser extension
2. Add localhost network (Chain ID: 31337)
3. Start Anvil: `anvil --port 8545`
4. Import test account from Anvil

## Troubleshooting

### Port 4193 in Use

```bash
# Use different port
npx vite --port 3000
```

### Dependencies Error

```bash
# Install TypeScript first
npm install typescript --save-dev

# Then install dependencies
npm install --legacy-peer-deps
```

### Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Current Setup

- **Entry Point**: `demo/ui/index.tsx` (uses Private Balance Flow)
- **Component**: `demo/ui/src/components/PPOIFlowDemo.tsx`
- **Port**: 4193 (default)

## Next Steps

After testing the UI:

1. Test with real proofs (integrate SDK)
2. Test with real PPOI (integrate Blockaid)
3. Test on-chain verification (deploy pool contract)

