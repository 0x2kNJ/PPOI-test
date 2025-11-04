# How to Access and Test the Private Balance Flow UI

## ✅ Quick Start (3 Steps)

### Step 1: Navigate to UI Directory

```bash
cd demo/ui
```

### Step 2: Start Development Server

```bash
npm run start
```

Or use the quick start script:
```bash
./START_UI.sh
```

### Step 3: Open Browser

Open your browser and navigate to:
```
http://localhost:4193
```

## 🎯 What You'll See

The **Private Balance Flow** page with:

- **Title**: "Private Balance Flow"
- **Description**: "Create private deposits with compliance verification and zero-knowledge proofs"
- **Status Card**: Shows current step and progress
- **4 Flow Steps**:
  1. Connect Wallet
  2. Create Deposit
  3. Generate ZK Proof
  4. Verify PPOI

## 🧪 Testing the Flow

### Step 1: Connect Wallet

1. Click the **"Connect"** button
2. MetaMask will prompt you (if installed)
3. Select your account
4. Status updates: **"✅ Wallet connected"**

**Note**: If MetaMask isn't installed, you'll see an error but can still test other steps.

### Step 2: Create Deposit

1. Click **"Create Deposit"** button (appears after wallet is connected)
2. System creates:
   - Shielded address
   - UTXO with commitment
   - Deposit details
3. Status updates: **"✅ Deposit Created"**
4. Shows:
   - Address: `0xeb079a1593d0499a3bcbd56d23eef8102a5d5807`
   - Amount: `1.0 ETH`
   - Commitment hash
   - Shielded address

### Step 3: Generate ZK Proof

1. Click **"Generate Proof"** button (appears after deposit is created)
2. Simulates proof generation (~2 seconds)
3. Status updates: **"✅ ZK Proof Generated"**
4. Shows:
   - Proof size: `X bytes`
   - Public inputs: `4`
   - Generation time: `Xms`
   - Proof hash

### Step 4: Verify PPOI

1. Click **"Verify PPOI"** button (appears after proof is generated)
2. Simulates PPOI verification (~1.5 seconds)
3. Status updates: **"✅ PPOI Verified"**
4. Final success message appears:
   - **"✅ Deposit Successful & PPOI Verified"**
   - "Your deposit has been created, ZK proof generated, and PPOI verification completed successfully!"

### Step 5: Reset (Optional)

Click **"Reset & Start Over"** button to start again from the beginning.

## 🎨 Status Indicators

- **Green** (#4caf50): Step completed successfully ✅
- **Blue** (#2196f3): Step in progress ⟳
- **Gray** (#999): Step pending (not started)
- **Red** (#ff4444): Error occurred ✕

## 📊 Visual Flow

```
┌─────────────────────────────────────┐
│  Private Balance Flow               │
│  Create private deposits with...    │
├─────────────────────────────────────┤
│  Status: Ready to start             │
├─────────────────────────────────────┤
│  [1] Connect Wallet      [Connect] │
│  [2] Create Deposit  [Create Deposit]│
│  [3] Generate ZK Proof [Generate Proof]│
│  [4] Verify PPOI      [Verify PPOI]│
├─────────────────────────────────────┤
│  ✅ Deposit Successful & PPOI Verified│
└─────────────────────────────────────┘
```

## 🔧 Troubleshooting

### Port 4193 Already in Use

```bash
# Use different port
npx vite --port 3000
```

Then access: `http://localhost:3000`

### Dependencies Not Installed

```bash
cd demo/ui
npm install --legacy-peer-deps
```

### MetaMask Not Detected

- Install MetaMask extension
- Refresh the page
- The UI still works for testing other steps (deposit, proof, verification)

### Server Won't Start

```bash
# Check if port is in use
lsof -i :4193

# Kill the process or use different port
npx vite --port 3000
```

## 📂 Current Configuration

- **Entry Point**: `demo/ui/index.tsx` (uses Private Balance Flow)
- **Component**: `demo/ui/src/components/PPOIFlowDemo.tsx`
- **Port**: 4193 (default)
- **Test Address**: `0xeb079a1593d0499a3bcbd56d23eef8102a5d5807`

## ✅ Testing Checklist

- [ ] Navigate to `demo/ui` directory
- [ ] Run `npm run start`
- [ ] Open browser to `http://localhost:4193`
- [ ] See "Private Balance Flow" page
- [ ] Click "Connect Wallet" (or skip if no MetaMask)
- [ ] Click "Create Deposit"
- [ ] Click "Generate Proof"
- [ ] Click "Verify PPOI"
- [ ] See "✅ Deposit Successful & PPOI Verified"

## 🎯 Expected Results

After completing all steps:

1. ✅ **Wallet connected** (if MetaMask installed)
2. ✅ **Deposit created** with commitment
3. ✅ **ZK proof generated** (simulated)
4. ✅ **PPOI verified** (simulated)
5. ✅ **Final success message** displayed

## 🔄 Reset Flow

Click **"Reset & Start Over"** button to start again from the beginning.

## 📝 Next Steps

After testing:

1. **Replace Simulated Proofs**: Integrate real SDK calls
2. **Replace Simulated PPOI**: Integrate Blockaid compliance checking
3. **Add On-Chain Verification**: Deploy pool contract
4. **Add Transaction Tracking**: Show transaction hashes

