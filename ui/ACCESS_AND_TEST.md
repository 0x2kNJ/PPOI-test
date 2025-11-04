# How to Access and Test the Private Balance Flow UI

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd demo/ui
npm install --legacy-peer-deps
```

If that fails, try:
```bash
npm install --ignore-scripts
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

Open your browser and go to:
```
http://localhost:4193
```

## 📱 What You'll See

The **Private Balance Flow** page with:

1. **Title**: "Private Balance Flow"
2. **Description**: "Create private deposits with compliance verification and zero-knowledge proofs"
3. **Status Card**: Shows current step and progress
4. **4 Flow Steps**:
   - **Step 1**: Connect Wallet
   - **Step 2**: Create Deposit  
   - **Step 3**: Generate ZK Proof
   - **Step 4**: Verify PPOI

## 🧪 Testing the Flow

### 1. Connect Wallet

1. Click **"Connect"** button
2. MetaMask will prompt (if installed)
3. Select account
4. Status updates: **"✅ Wallet connected"**

**Note**: If MetaMask isn't installed, you'll see an error but can still test other steps.

### 2. Create Deposit

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

### 3. Generate ZK Proof

1. Click **"Generate Proof"** button (appears after deposit is created)
2. Simulates proof generation (~2 seconds)
3. Status updates: **"✅ ZK Proof Generated"**
4. Shows proof details:
   - Proof size
   - Public inputs
   - Generation time

### 4. Verify PPOI

1. Click **"Verify PPOI"** button (appears after proof is generated)
2. Simulates PPOI verification (~1.5 seconds)
3. Status updates: **"✅ PPOI Verified"**
4. Final success message: **"✅ Deposit Successful & PPOI Verified"**

## 🎨 Visual Indicators

- **Green** ✅: Step completed successfully
- **Blue** ⟳: Step in progress
- **Gray**: Step pending (not started)
- **Red** ✕: Error occurred

## 🔧 Troubleshooting

### Port 4193 in Use

```bash
# Use different port
npx vite --port 3000
```

Then access: `http://localhost:3000`

### Dependencies Won't Install

```bash
# Install with legacy peer deps
npm install --legacy-peer-deps

# Or skip scripts
npm install --ignore-scripts
```

### MetaMask Not Detected

- Install MetaMask extension
- Refresh the page
- The UI still works for testing other steps (deposit, proof, verification)

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 📂 Current Setup

- **Entry Point**: `demo/ui/index.tsx`
- **Component**: `demo/ui/src/components/PPOIFlowDemo.tsx`
- **Port**: 4193 (default)
- **Test Address**: `0xeb079a1593d0499a3bcbd56d23eef8102a5d5807`

## ✅ Testing Checklist

- [ ] Navigate to `demo/ui` directory
- [ ] Run `npm install --legacy-peer-deps`
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

1. ✅ Wallet connected (if MetaMask installed)
2. ✅ Deposit created with commitment
3. ✅ ZK proof generated
4. ✅ PPOI verified
5. ✅ Final success message displayed

## 🔄 Reset Flow

Click **"Reset & Start Over"** button to start again from the beginning.

