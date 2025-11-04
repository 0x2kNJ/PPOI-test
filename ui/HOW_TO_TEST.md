# How to Access and Test the Private Balance Flow UI

## Quick Start

### Step 1: Install Dependencies (if needed)

```bash
cd demo/ui
npm install
```

### Step 2: Start the Development Server

```bash
npm run start
```

Or:

```bash
npx vite --port 4193
```

### Step 3: Open in Browser

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
   - **Step 1**: Connect Wallet
   - **Step 2**: Create Deposit
   - **Step 3**: Generate ZK Proof
   - **Step 4**: Verify PPOI

## Testing the Flow

### Step 1: Connect Wallet

1. Click the **"Connect"** button
2. MetaMask will prompt you to connect
3. Select your account
4. Status will update to: "✅ Wallet connected"

**Note**: Make sure MetaMask is installed and configured for localhost network (Chain ID: 31337)

### Step 2: Create Deposit

1. After wallet is connected, click **"Create Deposit"** button
2. The system will:
   - Generate a shielded address
   - Create a UTXO with commitment
   - Show deposit details
3. Status will update to: "✅ Deposit Created"

### Step 3: Generate ZK Proof

1. After deposit is created, click **"Generate Proof"** button
2. The system will simulate generating a real ZK proof
3. Status will update to: "✅ ZK Proof Generated"
4. Proof details will be displayed

### Step 4: Verify PPOI

1. After proof is generated, click **"Verify PPOI"** button
2. The system will simulate PPOI verification
3. Status will update to: "✅ PPOI Verified"
4. Final success message will appear: "✅ Deposit Successful & PPOI Verified"

## Status Indicators

- **Green**: Step completed successfully ✅
- **Blue**: Step in progress ⟳
- **Gray**: Step pending (not started)
- **Red**: Error occurred ✕

## Prerequisites

### 1. MetaMask Extension

Install MetaMask browser extension:
- Chrome: https://chrome.google.com/webstore/detail/metamask
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/ether-metamask
- Brave: Built-in or install extension

### 2. Local Network Setup (Optional)

If you want to test with a local blockchain:

1. **Start Anvil** (Foundry):
   ```bash
   anvil --block-time 2 --port 8545
   ```

2. **Add Network to MetaMask**:
   - Network Name: `Localhost 8545`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

3. **Import Test Account** (from Anvil):
   - Import the first account from Anvil's output
   - It will have 10,000 ETH for testing

## Troubleshooting

### Port Already in Use

If port 4193 is already in use:

```bash
# Check what's using the port
lsof -i :4193

# Kill the process or use a different port
npm run start -- --port 3000
```

### Dependencies Not Installed

```bash
cd demo/ui
npm install
```

### MetaMask Not Detected

- Make sure MetaMask extension is installed
- Refresh the page
- Check that MetaMask is unlocked
- Try a different browser

### Module Not Found Errors

```bash
cd demo/ui
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

```bash
cd demo/ui
npm run build
```

## Switching Between Apps

To switch between Private Balance Flow and Debit Card Demo:

Edit `demo/ui/index.tsx`:

```tsx
// Private Balance Flow (current)
import PPOIFlowDemo from './src/components/PPOIFlowDemo'
root.render(<PPOIFlowDemo />)

// Debit Card Demo (commented out)
// import App from './App'
// root.render(<App />)
```

## Testing Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm run start`)
- [ ] Browser opened to `http://localhost:4193`
- [ ] MetaMask extension installed
- [ ] MetaMask connected (if needed)
- [ ] Can click "Connect Wallet"
- [ ] Can click "Create Deposit"
- [ ] Can click "Generate Proof"
- [ ] Can click "Verify PPOI"
- [ ] Final status shows "✅ Deposit Successful & PPOI Verified"

## Next Steps

Once you've tested the UI flow:

1. **Test with Real Proofs**: Replace simulated proof generation with real SDK calls
2. **Test with Real PPOI**: Integrate Blockaid for real compliance checking
3. **Test On-Chain**: Deploy pool contract and test on-chain verification
4. **Test with Different Addresses**: Modify `TEST_ADDRESS` in the component

## Support

If you encounter issues:

1. Check browser console for errors
2. Check terminal for build errors
3. Verify all dependencies are installed
4. Make sure MetaMask is properly configured

