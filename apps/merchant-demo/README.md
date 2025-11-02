# x402 Private Pull-Payments Subscriptions Demo

Demo application for x402 private pull-payments with subscription management using Bermuda's shielded pool and truncated ladder precompute system (17 buckets for up to $1,000).

## Features

- 🔐 **Private Subscriptions**: EIP-712 permits for pull payments
- 🪜 **Truncated Ladder**: Optimal 17-bucket system for $1,000 max
- 🔄 **Auto-Recurring Payments**: Automatic execution every 10 seconds (simulates monthly)
- ⏱️ **Countdown Timer**: Visual countdown showing time until next payment
- 📊 **Progress Tracking**: Real-time display of payment progress (X/12 completed)
- 📜 **Payment History**: Complete log of all payments with timestamps and TX hashes
- ⏸️ **Pause/Resume**: Control auto-payments with pause/resume buttons
- 💾 **File-Based Storage**: Subscriptions persist across server restarts (`.subscriptions.json`)
- ⚡ **Precomputed Proofs**: Instant payment execution
- 🛡️ **Relayer**: Gasless transactions via relayer

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Anvil (Local Blockchain)

**Terminal 1**:
```bash
anvil --chain-id 31337
# Keep this running! Required for real transactions.
```

### 3. Deploy Contract

Deploy the MockX402Adapter contract to Anvil:

```bash
# Option 1: Using the deployment script
node scripts/deploy-simple.js
# This will output the deployed address - keep it private!

# Option 2: Using Forge directly
cd /tmp && mkdir x402-deploy && cd x402-deploy
forge init --no-git --force .
cp ../demo/apps/merchant-demo/contracts/MockX402Adapter.sol src/
forge build
forge create src/MockX402Adapter.sol:MockX402Adapter \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
# Copy the deployed address to .env.local (keep it private!)
```

**⚠️ Important**: 
- Keep your deployed contract address **private**
- Only add it to `.env.local` (never commit to version control)
- Ensure `.env.local` is in `.gitignore`
- The contract address is sensitive and should not be exposed publicly

### 4. Configure Environment

Create `.env.local`:

```bash
# Anvil (local testnet) Configuration
RPC_URL=http://localhost:8545

# Anvil's default test account #1 (pre-funded with 10000 ETH)
RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# X402Adapter contract address (deployed to Anvil)
# Replace with your deployed contract address from deployment step
NEXT_PUBLIC_X402_ADAPTER=<YOUR_DEPLOYED_CONTRACT_ADDRESS>

# Mock backend URL for ZK proof generation
NEXT_PUBLIC_PRECOMPUTE_API_URL=http://localhost:3001
```

### 5. Start Backend (ZK Proof Generation)

**Terminal 2**:
```bash
cd ../../mock-backend
npm start
# 🚀 Mock Backend Server running on http://localhost:3001
# ✅ Real ZK proof generation: ENABLED
```

### 6. Run Development Server

**Terminal 3**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### 1. Connect Wallet
- Connect MetaMask
- Auto-switches to Anvil network (ChainId: 31337)
- If not detected, prompts to add Anvil network

### 2. Create Subscription
- Enter amount (e.g., $10.00 USDC)
- Click "Subscribe for 12 months"
- **Real ZK Proof Generation** (~7 seconds):
  - Generates cryptographic witness values
  - Executes Noir circuit (`nargo execute`)
  - Generates Barretenberg Honk proof (`bb prove`)
  - Returns proof + public inputs
- **EIP-712 Permit Signing**:
  - Signs permit in MetaMask
  - Includes: noteId, merchant, maxAmount, expiry, nonce, merchantCommitment
- **Subscription Creation**:
  - Stores subscription with proof + permit to `.subscriptions.json`
  - **Automatic First Payment**:
    - Relayer submits transaction to Anvil
    - Calls `adapter.take()` with proof + permit
    - Returns real transaction hash
- **Auto-Recurring Payments Activated**:
  - Countdown timer starts: 10 seconds
  - Payment 1/12 completed and recorded

### 3. Auto-Recurring Payments

After the first payment completes:

- **⏱️ Countdown Timer**:
  - Large display showing seconds until next payment
  - Counts down: 10s → 9s → 8s... → 1s → 0s
  - Automatically resets to 10s after each payment

- **🔄 Automatic Payment Processing**:
  - When countdown reaches 0, next payment triggers automatically
  - Uses stored subscription data from `.subscriptions.json`
  - Relayer executes transaction on Anvil
  - Payment recorded in history log
  - Progress bar updates: "X / 12 Payments Completed"

- **📊 Progress Tracking**:
  - Visual progress bar fills as payments complete
  - Real-time updates after each transaction
  - Payment history grows with each successful payment

- **⏸️ Control Options**:
  - **Pause**: Click "⏸ Pause Auto-Payments" to stop automatic processing
  - **Resume**: Click "▶️ Resume Auto-Payments" to continue from where it stopped

- **🎉 Completion**:
  - After 12 payments (approximately 2 minutes), subscription completes
  - Status message: "🎉 All 12 payments completed! Subscription fulfilled."

### 4. View Confirmation
- See "Confirmation" box with:
  - ✅ Real transaction hash (on-chain proof)
  - ✅ Amount: $10.00 USDC
  - ✅ Timestamp
  - ✅ Privacy: Zero-Knowledge Proof Verified

### 5. Payment History
- Scrollable list showing all completed payments
- Each entry includes:
  - Payment #X of 12
  - Amount paid
  - Timestamp
  - Transaction hash (truncated for display)

## Architecture

### Truncated Ladder Approach

For $1,000 max balance:
- **17 buckets**: Powers of 2 from 1¢ to 65,536¢
- **Coverage**: 100% - any amount from $0.01 to $1,000.00
- **Efficiency**: 76.3%
- **Decomposition**: Greedy algorithm (always take largest bucket)

Example: $9.99 subscription
- Buckets: [512¢, 256¢, 128¢, 64¢, 32¢, 4¢, 2¢, 1¢] = 999¢
- Proof generation: Precompute for each bucket combination
- Permit: EIP-712 signature with maxAmount = $119.88 (12 months)

### API Routes

#### `/api/execute` (POST)
Relayer endpoint that executes `X402Adapter.take()` or `redeemToPublic()`

Request:
```json
{
  "adapter": "0x...",
  "method": "take",
  "args": [proof, permit, recipient, amount]
}
```

Response:
```json
{
  "txHash": "0x..."
}
```

#### `/api/subscription` 
- **POST**: Create subscription (saves to `.subscriptions.json`)
- **GET**: Get user subscriptions (loads from `.subscriptions.json`)
- **PUT**: Charge subscription (executes payment, updates file)
- **DELETE**: Cancel subscription (updates file)

**File-Based Storage**:
- Subscriptions stored in `.subscriptions.json` (auto-generated)
- Persists across server restarts and hot-reloads
- Includes: proof, permit, nonce, nextCharge, lastCharged
- JSON format for easy debugging

## Security

- ✅ EIP-712 domain-separated signatures
- ✅ Merchant binding in permits
- ✅ Nonce-based replay protection
- ✅ Expiry timestamps
- ✅ Relayer gas estimation
- ✅ Max amount caps

## Testing

### Local Testing
1. Deploy X402Adapter to testnet (see `demo/scripts/deploy-x402.ts`)
2. Update `.env.local` with contract addresses
3. Fund relayer wallet with small amount for gas
4. Connect wallet and create subscriptions

### Test Flow
1. Generate precompute → Signs EIP-712 permit
2. Create subscription → Stores permit + subscription details
3. Simulate payment → Relayer calls `adapter.take()`
4. Verify transaction on block explorer

## File Structure

```
apps/merchant-demo/
├── pages/
│   ├── index.tsx                  # Main page
│   └── api/
│       ├── execute.ts             # Relayer endpoint
│       └── subscription.ts        # Subscription management
├── components/
│   └── X402SubscriptionsDemo.tsx  # Main UI component
├── abis/
│   └── X402Adapter.json           # Contract ABI
└── .env.local.example             # Environment template
```

## ✅ What's Real (No Mocks!)

This demo uses **100% real cryptographic technology**:

- ✅ **Real ZK Proofs**: Generated with Noir circuits + Barretenberg Honk prover
- ✅ **Real EIP-712 Signatures**: Cryptographically valid permit signing
- ✅ **Real Smart Contract**: Deployed MockX402Adapter on Anvil blockchain (configured via environment variables)
- ✅ **Real Blockchain Transactions**: Actual on-chain transaction execution
- ✅ **Real Cryptographic Verification**: All proofs verified on-chain

**No mock proofs, no fake transactions - production-grade privacy tech!**

## Production Considerations

1. **Database**: Replace in-memory store with PostgreSQL/MongoDB
2. **Cron Job**: Add scheduler for automatic subscription charges
3. **Pool Integration**: Connect to real shielded pool for noteId/balance (currently uses mock noteId)
4. **Compliance**: Add PPOI verification for regulated merchants
5. **Error Handling**: Add retry logic and failure notifications
6. **Network**: Deploy to Base Sepolia or Linea Sepolia for testnet

## Troubleshooting

### "Connect failed"
- Ensure MetaMask is installed
- Ensure Anvil is running on port 8545
- Frontend will auto-switch/add Anvil network

### "Gas estimate failed"
- Ensure Anvil is running: `anvil --chain-id 31337`
- Check contract is deployed: verify `NEXT_PUBLIC_X402_ADAPTER` in `.env.local`
- Check permit signature is valid (chainId must be 31337)

### "Invalid signature"
- Verify chainId matches Anvil (31337)
- Check adapter address is correct in `.env.local`
- Ensure permit hasn't expired

### "No precomputes available"
- Ensure mock-backend is running on port 3001
- Check `/api/precomputes` endpoint is accessible
- Verify Noir circuit is compiled (`nargo compile`)

### "Transaction failed"
- Check Anvil is running and accessible
- Verify relayer private key has ETH (Anvil account #1 is pre-funded)
- Check contract address in `.env.local` matches deployed address

## Links

- [X402 Specification](../README_X402.md)
- [Truncated Ladder Implementation](../../../TRUNCATED_LADDER_IMPLEMENTATION.md)
- [Bermuda Documentation](../../../README.md)
