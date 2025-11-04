# Testing Instructions - Private Balance Flow UI

## Quick Access

### Current Status

The UI is set up to show **Private Balance Flow** by default (no debit card demo).

### Step 1: Install Dependencies

The SDK dependency needs TypeScript. First, install it in the SDK:

```bash
cd demo/ui/lib/sdk
npm install typescript --save-dev
npm install
```

Then install UI dependencies:

```bash
cd ../..  # Back to demo/ui
npm install
```

### Step 2: Start Development Server

```bash
cd demo/ui
npm run start
```

Or:

```bash
npx vite --port 4193
```

### Step 3: Open Browser

Open your browser and navigate to:
```
http://localhost:4193
```

## What You'll See

The **Private Balance Flow** page with:

1. **Title**: "Private Balance Flow"
2. **Description**: "Create private deposits with compliance verification and zero-knowledge proofs"
3. **Status Card**: Shows current step and progress
4. **4 Flow Steps**:
   - **Step 1**: Connect Wallet (button: "Connect")
   - **Step 2**: Create Deposit (button: "Create Deposit")
   - **Step 3**: Generate ZK Proof (button: "Generate Proof")
   - **Step 4**: Verify PPOI (button: "Verify PPOI")

## Testing the Complete Flow

### 1. Connect Wallet

- Click the **"Connect"** button
- MetaMask will prompt you to connect
- Select your account
- Status updates: "✅ Wallet connected"
- Address shown: `0x...` (your address)

**Note**: If MetaMask isn't installed, you'll see an error. The UI will still work for testing the other steps.

### 2. Create Deposit

- Click **"Create Deposit"** button (appears after wallet is connected)
- System generates:
  - Shielded address
  - UTXO with commitment
  - Deposit details
- Status updates: "✅ Deposit Created"
- Shows:
  - Address: `0xeb079a1593d0499a3bcbd56d23eef8102a5d5807`
  - Amount: `1.0 ETH`
  - Commitment hash
  - Shielded address

### 3. Generate ZK Proof

- Click **"Generate Proof"** button (appears after deposit is created)
- Simulates real ZK proof generation (2 seconds)
- Status updates: "✅ ZK Proof Generated"
- Shows:
  - Proof size: `X bytes`
  - Public inputs: `4`
  - Generation time: `Xms`
  - Proof hash

### 4. Verify PPOI

- Click **"Verify PPOI"** button (appears after proof is generated)
- Simulates PPOI verification (1.5 seconds)
- Status updates: "✅ PPOI Verified"
- Final success message appears:
  - "✅ Deposit Successful & PPOI Verified"
  - "Your deposit has been created, ZK proof generated, and PPOI verification completed successfully!"

### 5. Reset (Optional)

- Click **"Reset & Start Over"** button to start again

## Status Colors

- **Green** (#4caf50): Step completed successfully ✅
- **Blue** (#2196f3): Step in progress ⟳
- **Gray** (#999): Step pending (not started)
- **Red** (#ff4444): Error occurred ✕

## Visual Flow

```
┌─────────────────────────────────────┐
│  Private Balance Flow               │
│  Create private deposits with...    │
├─────────────────────────────────────┤
│  Status: Ready to start              │
├─────────────────────────────────────┤
│  [1] Connect Wallet         [Connect]│
│  [2] Create Deposit    [Create Deposit]│
│  [3] Generate ZK Proof  [Generate Proof]│
│  [4] Verify PPOI        [Verify PPOI]│
├─────────────────────────────────────┤
│  ✅ Deposit Successful & PPOI Verified│
└─────────────────────────────────────┘
```

## Troubleshooting

### Port 4193 Already in Use

```bash
# Use different port
npx vite --port 3000
```

Then access: `http://localhost:3000`

### Dependencies Not Installing

The SDK dependency requires TypeScript. Install it first:

```bash
cd demo/ui/lib/sdk
npm install typescript --save-dev
npm install
cd ../../..
npm install
```

### MetaMask Not Detected

- Make sure MetaMask extension is installed
- Refresh the page
- Check that MetaMask is unlocked
- The UI will still work for testing other steps (deposit creation, proof generation, etc.)

### Module Not Found Errors

```bash
cd demo/ui
rm -rf node_modules package-lock.json
cd lib/sdk
rm -rf node_modules package-lock.json
cd ../../..
npm install
```

### Build Errors

If you see build errors:

```bash
cd demo/ui/lib/sdk
npm run build
cd ../../..
npm run start
```

## Testing Without MetaMask

You can test the flow without MetaMask:

1. **Skip Step 1** (Connect Wallet) - it will show an error but you can still test other steps
2. **Step 2-4** work independently - they don't require wallet connection

## Current Configuration

- **Entry Point**: `demo/ui/index.tsx`
- **Component**: `demo/ui/src/components/PPOIFlowDemo.tsx`
- **Port**: 4193 (default)
- **Test Address**: `0xeb079a1593d0499a3bcbd56d23eef8102a5d5807`

## Next Steps After Testing

1. **Replace Simulated Proofs**: Integrate real SDK calls
2. **Replace Simulated PPOI**: Integrate Blockaid compliance checking
3. **Add On-Chain Verification**: Deploy pool contract and verify proofs on-chain
4. **Add Transaction Tracking**: Show transaction hashes

