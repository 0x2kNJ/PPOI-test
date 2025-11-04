# Private Balance Flow

A standalone UI for the Private Balance Flow - creating private deposits with compliance verification and zero-knowledge proofs.

## Features

Complete step-by-step flow:

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

## Running the Standalone Page

### Option 1: Using Vite Dev Server

1. Start the dev server:
   ```bash
   cd demo/ui
   npm run start
   ```

2. Access the page:
   - If configured with a route: `http://localhost:4193/private-balance-flow`
   - Or modify `index.html` temporarily to use `PrivateBalanceFlow.tsx`

### Option 2: Modify index.html

Temporarily modify `demo/ui/index.html`:

```html
<script type="module" src="/PrivateBalanceFlow.tsx"></script>
```

Or modify `demo/ui/index.tsx`:

```tsx
import PPOIFlowDemo from './src/components/PPOIFlowDemo'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<PPOIFlowDemo />)
}
```

### Option 3: Create Separate Build

You can create a separate build configuration for the Private Balance Flow page.

## Component Location

- **Component**: `demo/ui/src/components/PPOIFlowDemo.tsx`
- **Entry Point**: `demo/ui/PrivateBalanceFlow.tsx`
- **HTML**: `demo/ui/private-balance-flow.html`

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

The component uses inline styles for a clean, modern look. The page has:
- Full-height background
- Centered content with max-width
- Responsive design
- Status color coding

## Test Address

The demo uses the test address: `0xeb079a1593d0499a3bcbd56d23eef8102a5d5807`

You can modify `TEST_ADDRESS` in the component to use a different address.

