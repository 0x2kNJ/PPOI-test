# PPOI Flow Demo UI

A complete UI demonstration of the PPOI (Privacy-Preserving Off-chain Identity) flow from wallet connection to deposit verification.

## Features

The demo shows a complete step-by-step flow:

1. **Connect Wallet** - Connect MetaMask wallet
2. **Create Deposit** - Create deposit UTXO with commitment
3. **Generate ZK Proof** - Generate real ZK proof using Noir/Barretenberg
4. **Verify PPOI** - Verify compliance and proof on-chain

## Status Indicators

Each step shows:
- ✅ **Completed** - Step completed successfully (green)
- ⟳ **In Progress** - Step currently being processed (blue)
- ✕ **Error** - Step failed (red)

## Final Status

When all steps are complete:
- ✅ **Deposit Successful** - Deposit created successfully
- ✅ **PPOI Verified** - Deposit is compliant and proof verified on-chain

## Running the Demo

### Option 1: Standalone Page

1. Add a new route/page in your Vite config to serve `ppoi-flow.html`
2. Or modify `index.html` to import `PPOIFlowPage.tsx` instead of `App.tsx`

### Option 2: Integrate into Existing App

1. Import `PPOIFlowDemo` component:
   ```tsx
   import PPOIFlowDemo from './src/components/PPOIFlowDemo.tsx'
   ```

2. Add to your app:
   ```tsx
   <PPOIFlowDemo />
   ```

## Component Structure

```
PPOIFlowDemo.tsx
├── Wallet Connection
├── Deposit Creation
├── ZK Proof Generation
└── PPOI Verification
```

## Flow Steps

### Step 1: Connect Wallet
- Connects to MetaMask
- Requests account access
- Shows connected address

### Step 2: Create Deposit
- Generates shielded address
- Creates UTXO with commitment
- Shows deposit details:
  - Address (recipient)
  - Amount
  - Commitment hash
  - Shielded address

### Step 3: Generate ZK Proof
- Simulates proof generation (in production, calls `prepareTransact()` → `getProof()` → `prove2x2()`)
- Shows proof details:
  - Proof size
  - Public inputs count
  - Generation time
  - Proof hash

### Step 4: Verify PPOI
- Simulates PPOI verification (in production, checks Blockaid compliance and verifies proof on-chain)
- Shows final status: "✅ Deposit PPOI Verified"

## Production Integration

To integrate with real functionality:

1. **Replace proof generation**:
   ```typescript
   // In handleGenerateProof():
   const { args } = await sdk.deposit({
     token: ethers.ZeroAddress,
     amount: parseEther('1.0'),
     shieldedAddress: shieldedAddress,
     recipient: TEST_ADDRESS,
     fee: 0n
   })
   ```

2. **Replace PPOI verification**:
   ```typescript
   // In handleVerifyPPOI():
   // 1. Check compliance with Blockaid
   const compliance = await blockaidChecker.checkAddress(TEST_ADDRESS, 'ethereum')
   
   // 2. Verify proof on-chain
   const verified = await pool.verifyProof(proof, publicInputs)
   ```

## Styling

The component uses inline styles for simplicity. To customize:
- Modify the style objects in each element
- Or add a CSS file and use className

## Test Address

The demo uses the test address: `0xeb079a1593d0499a3bcbd56d23eef8102a5d5807`

You can modify `TEST_ADDRESS` in the component to use a different address.

