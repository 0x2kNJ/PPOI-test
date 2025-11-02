# x402 Private Pull-Payments Demo

> **Production-ready demonstration of private recurring payments using real zero-knowledge proofs**

[![ZK Proofs](https://img.shields.io/badge/ZK-Real%20Proofs-green)](https://noir-lang.org)
[![Barretenberg](https://img.shields.io/badge/Prover-Barretenberg-blue)](https://github.com/AztecProtocol/barretenberg)
[![EIP-712](https://img.shields.io/badge/Permits-EIP--712-orange)](https://eips.ethereum.org/EIPS/eip-712)

## 🎯 What This Demo Shows

This is a **complete working demo** of x402 private pull-payments with:

- ✅ **12-month subscription simulation** - Payments every 10 seconds (simulates monthly payments)
- ✅ **Automatic recurring payments** - Countdown timer triggers payments automatically
- ✅ **Real zero-knowledge proofs** - Generated with Noir + Barretenberg (no mocks!)
- ✅ **Gasless transactions** - Relayer pays all gas fees (users pay $0)
- ✅ **EIP-712 permits** - Off-chain authorization signatures
- ✅ **On-chain execution** - Real transactions on Anvil blockchain
- ✅ **Privacy verification** - Complete privacy guarantees

## 📋 Prerequisites

Before you start, ensure you have the following installed:

### 1. Node.js

**Required:** Node.js >= 18.0.0

**Install:**
```bash
# Check version
node --version

# If not installed, download from https://nodejs.org/
# Or use nvm (Node Version Manager):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. Foundry (Anvil)

**Required:** Foundry with `anvil`, `forge`, and `cast`

**Install:**
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
anvil --version
forge --version
cast --version
```

### 3. Noir (nargo)

**Required:** Noir >= 0.19.0 (for ZK circuit compilation)

**Install:**
```bash
# Install Noirup
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
source ~/.bashrc  # or ~/.zshrc

# Install Noir
noirup --version 1.0.0-beta.9

# Verify installation
nargo --version
```

### 4. Barretenberg (bb)

**Required:** Barretenberg >= 0.8.0 (for ZK proof generation)

**Install:**
```bash
# Install bbup
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/master/barretenberg/bbup/install | bash
source ~/.bashrc  # or ~/.zshrc

# Install Barretenberg
bbup

# Verify installation
bb --version
```

### 5. MetaMask (Browser Extension)

**Required:** For wallet connection

**Install:**
- Download from https://metamask.io/
- Install browser extension
- Create or import a wallet

## 🚀 Complete Setup Instructions

### Step 1: Clone the Repository

```bash
git clone https://github.com/BermudaBay/x402-Demo.git
cd x402-Demo
```

### Step 2: Install Backend Dependencies

```bash
cd mock-backend
npm install
cd ..
```

**Expected output:**
```
✅ npm install completes successfully
✅ Dependencies installed
```

**Troubleshooting:**
- If `npm install` fails, check Node.js version: `node --version` (must be >= 18)
- If SDK dependency fails, ensure `lib/pool/` exists

### Step 3: Install Frontend Dependencies

```bash
cd apps/merchant-demo
npm install
cd ../..
```

**Expected output:**
```
✅ npm install completes successfully
✅ Next.js and dependencies installed
```

### Step 4: Compile ZK Circuit

```bash
cd lib/precompute-circuit
nargo compile
cd ../..
```

**Expected output:**
```
✅ Compiled circuit program successfully
✅ Generated artifacts in target/
```

**Troubleshooting:**
- If `nargo` not found: Run `noirup --version 1.0.0-beta.9` and reload shell
- If compilation fails: Check Noir version: `nargo --version`

### Step 5: Deploy Smart Contract

**First, start Anvil:**

```bash
# Terminal 1: Start Anvil
anvil --chain-id 31337
```

**Expected output:**
```
Listening on 127.0.0.1:8545
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
```

**Keep this terminal running!**

**Then, deploy the contract:**

```bash
# Terminal 2: Deploy contract
cd apps/merchant-demo
bash scripts/redeploy-contract.sh
```

**Expected output:**
```
✅ Contract Deployed Successfully!
📍 Deployed Address: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
```

**Copy the deployed address!**

### Step 6: Configure Environment Variables

Create `apps/merchant-demo/.env.local`:

```bash
cd apps/merchant-demo
cat > .env.local << 'EOF'
# Anvil (local testnet) Configuration
RPC_URL=http://localhost:8545

# Anvil's default test account #1 (pre-funded with 10000 ETH)
RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# X402Adapter contract address (deployed to Anvil)
# ⚠️ Replace with YOUR deployed contract address from Step 5!
NEXT_PUBLIC_X402_ADAPTER=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707

# Mock backend URL for ZK proof generation
NEXT_PUBLIC_PRECOMPUTE_API_URL=http://localhost:3001

# Chain ID (Anvil default)
NEXT_PUBLIC_CHAIN_ID=31337
EOF
```

**⚠️ IMPORTANT:**
- Replace `NEXT_PUBLIC_X402_ADAPTER` with **your actual deployed contract address**
- Never commit `.env.local` to version control (it's in `.gitignore`)

### Step 7: Start All Services

You'll need **3 terminals** running:

**Terminal 1 - Anvil (Local Blockchain):**
```bash
anvil --chain-id 31337
# Keep this running! Required for real transactions.
```

**Terminal 2 - Backend (ZK Proof Generation):**
```bash
cd mock-backend
npm start
```

**Expected output:**
```
🚀 Mock Backend Server running on http://localhost:3001
   Real ZK proof generation: ENABLED
   SDK: INSTALLED
   Endpoints:
     GET  /health - Health check
     POST /api/precomputes - Generate ZK precomputes
```

**Terminal 3 - Frontend:**
```bash
cd apps/merchant-demo
npm run dev
```

**Expected output:**
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in X.Xs
```

## 🧪 Running the Demo

### 1. Open the Demo

Open your browser: **http://localhost:3000**

### 2. Connect MetaMask

1. Click **"Connect Wallet"**
2. MetaMask will prompt to add network (Anvil)
3. Approve the network switch
4. Approve account connection

**Expected:** Wallet address appears, status shows "Connected!"

### 3. Create Subscription

1. **Enter amount** (e.g., "10.00" for $10/month)
2. **Click "Subscribe for 12 months"**
3. **Wait for ZK proofs** (~7 seconds)
   - Status will show: "Generating ZK proofs..."
   - Console will show progress
4. **Sign permit in MetaMask**
   - MetaMask popup appears
   - Review permit details
   - Click "Sign"

### 4. Watch Auto-Recurring Payments

After signing:

1. **Payment 1/12 completes immediately**
   - Confirmation box appears with transaction hash
2. **Countdown timer starts**
   - Shows: "10s" → counts down
   - Large display in blue box
3. **Automatic payments every 10 seconds**
   - Payment 2/12 at 10 seconds
   - Payment 3/12 at 20 seconds
   - ...
   - Payment 12/12 at 110 seconds
4. **Progress tracking**
   - Progress bar fills up
   - Payment history grows
   - "X / 12 Payments Completed" updates

### 5. Complete Demo

After ~2 minutes:
- **All 12 payments complete!** 🎉
- Status: "🎉 All 12 payments completed! Subscription fulfilled."
- Payment history shows all 12 transactions

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Anvil is running on port 8545
- [ ] Backend is running on port 3001
- [ ] Frontend is running on port 3000
- [ ] Contract is deployed to Anvil
- [ ] `.env.local` has correct contract address
- [ ] MetaMask can connect to Anvil network
- [ ] ZK proofs generate successfully (~7 seconds)
- [ ] EIP-712 permit signing works
- [ ] First payment executes immediately
- [ ] Countdown timer starts
- [ ] Auto-payments trigger every 10 seconds

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
│  (MetaMask + http://localhost:3000)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1. Connect Wallet
                       │ 2. Enter Amount
                       │ 3. Click "Subscribe"
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Frontend (Next.js)                              │
│              http://localhost:3000                           │
│                                                              │
│  - X402SubscriptionsDemo.tsx (UI)                           │
│  - /api/subscription (POST/GET/PUT)                         │
│  - /api/execute (Relayer)                                   │
└──────┬─────────────────────────────────────────┬──────────┘
       │                                           │
       │ 4. Request ZK Proofs                     │ 5. Execute Payment
       │                                           │
┌──────▼──────────────────────┐      ┌───────────▼──────────┐
│     Backend (Express)        │      │    Smart Contract    │
│     http://localhost:3001     │      │    (MockX402Adapter)  │
│                              │      │    On Anvil          │
│  - /api/precomputes          │      │    http://localhost:  │
│  - ZK Proof Generation       │      │    8545              │
│  - Barretenberg Honk         │      └──────────────────────┘
│  - Noir Circuits             │
└──────────────────────────────┘
```

## 📦 Project Structure

```
demo/
├── mock-backend/              # ZK proof generation service
│   ├── src/
│   │   ├── server.ts         # Express server (port 3001)
│   │   ├── api/precomputes.ts # ZK proof endpoint
│   │   └── ...
│   └── package.json
│
├── apps/
│   └── merchant-demo/        # Next.js frontend (port 3000)
│       ├── components/
│       │   └── X402SubscriptionsDemo.tsx  # Main UI
│       ├── pages/
│       │   ├── api/
│       │   │   ├── subscription.ts  # Subscription management
│       │   │   └── execute.ts      # Relayer (gasless tx)
│       │   └── index.tsx
│       ├── contracts/
│       │   └── MockX402Adapter.sol  # Smart contract
│       ├── scripts/
│       │   ├── redeploy-contract.sh # Deployment helper
│       │   └── verify-privacy.sh   # Privacy verification
│       ├── .env.local              # Environment config
│       └── .subscriptions.json     # File-based storage
│
├── lib/
│   └── precompute-circuit/   # Noir ZK circuit
│       ├── src/
│       │   └── main.nr       # Circuit logic
│       └── Nargo.toml
│
└── README.md                 # This file
```

## 🔧 Key Components

### 1. ZK Proof Generation (mock-backend)

- **Technology:** Noir circuits + Barretenberg Honk prover
- **Location:** `mock-backend/src/`
- **Endpoint:** `POST /api/precomputes`
- **Performance:** 17 proofs in 5-7 seconds (parallel generation)

### 2. Frontend (merchant-demo)

- **Technology:** Next.js 14 + React
- **Location:** `apps/merchant-demo/`
- **Features:**
  - Wallet connection (MetaMask)
  - EIP-712 permit signing
  - Auto-recurring payments
  - Countdown timer
  - Progress tracking
  - Payment history

### 3. Smart Contract

- **Technology:** Solidity 0.8.20
- **Location:** `apps/merchant-demo/contracts/MockX402Adapter.sol`
- **Functions:**
  - `take()` - Pull payment from shielded note
  - `redeemToPublic()` - Redeem to public address
- **Events:**
  - `Take` - Payment executed
  - `TakeShielded` - Shielded-to-shielded payment

### 4. Relayer (execute API)

- **Technology:** Ethers.js + Anvil
- **Location:** `apps/merchant-demo/pages/api/execute.ts`
- **Function:** Executes transactions on behalf of users
- **Gas:** Paid by relayer (users pay $0)

## 🐛 Troubleshooting

### Issue: "No precomputes available"

**Solution:**
1. Ensure backend is running: `cd mock-backend && npm start`
2. Check backend logs for errors
3. Verify Noir circuit compiled: `cd lib/precompute-circuit && nargo compile`
4. Verify Barretenberg installed: `bb --version`

### Issue: "gas estimate failed"

**Solution:**
1. Ensure Anvil is running: `anvil --chain-id 31337`
2. Verify contract is deployed
3. Check `.env.local` has correct `NEXT_PUBLIC_X402_ADAPTER` address
4. Redeploy contract: `bash scripts/redeploy-contract.sh`

### Issue: "subscription not found"

**Solution:**
1. Check `.subscriptions.json` file exists
2. Verify subscription was created successfully
3. Restart frontend server
4. Check browser console for errors

### Issue: MetaMask won't connect

**Solution:**
1. Ensure MetaMask extension is installed
2. Try refreshing page (Cmd+Shift+R)
3. Check MetaMask logs (Settings → Advanced → Developer Mode)
4. Try disconnecting and reconnecting

### Issue: ZK proofs take too long

**Solution:**
1. Check backend logs for errors
2. Verify Barretenberg is installed correctly: `bb --version`
3. Check system resources (CPU/RAM)
4. Normal time: 5-7 seconds for 17 proofs

### Issue: Auto-payments not triggering

**Solution:**
1. Check browser console for errors
2. Verify countdown timer is running
3. Check subscription is active in `.subscriptions.json`
4. Restart frontend server

## 📚 Additional Documentation

- **[PRIVACY_VERIFICATION_GUIDE.md](PRIVACY_VERIFICATION_GUIDE.md)** - How to verify payments are private
- **[GASLESS_TRANSACTIONS_EXPLAINED.md](GASLESS_TRANSACTIONS_EXPLAINED.md)** - How relayer pattern works
- **[AGENT_SUPPORT_GUIDE.md](AGENT_SUPPORT_GUIDE.md)** - How to add AI agent support
- **[X402_DEMO_DOCUMENTATION.md](X402_DEMO_DOCUMENTATION.md)** - Complete technical documentation

## 🔒 Security Notes

### Environment Variables

**⚠️ Never commit these files:**
- `.env.local` (contains contract addresses and private keys)
- `.subscriptions.json` (contains subscription data)

**They are in `.gitignore` but double-check before pushing!**

### Private Keys

**⚠️ The relayer private key in this demo is for testing only:**
- `RELAYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- This is Anvil's default test account (public)
- **In production:** Use secure key management (HSM, encrypted storage, etc.)

## 🎓 What You'll Learn

By running this demo, you'll see:

1. **Real ZK Proof Generation** - Watch proofs generate in ~7 seconds
2. **EIP-712 Permit Signing** - Off-chain authorization flow
3. **Gasless Transactions** - Relayer pattern in action
4. **Auto-Recurring Payments** - Automated payment execution
5. **Privacy Verification** - How to verify payments are private
6. **On-Chain Execution** - Real blockchain transactions

## 📄 License

See LICENSE file in the repository.

## 🙏 Acknowledgments

Built with:
- [Noir](https://noir-lang.org) - Zero-knowledge circuit language
- [Barretenberg](https://github.com/AztecProtocol/barretenberg) - ZK proof generation
- [Foundry](https://book.getfoundry.sh/) - Ethereum development toolkit
- [Next.js](https://nextjs.org/) - React framework
- [Ethers.js](https://docs.ethers.org/) - Ethereum library

---

**Ready to run?** Follow the [Complete Setup Instructions](#-complete-setup-instructions) above!

**Questions?** Check the [Troubleshooting](#-troubleshooting) section or open an issue on GitHub.
