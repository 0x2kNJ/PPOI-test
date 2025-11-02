# HTTP 402 Payment Required - Privacy-Preserving Paywalls

> **Production-ready demonstration of HTTP 402 with private micropayments using zero-knowledge proofs**

[![HTTP 402](https://img.shields.io/badge/HTTP-402%20Payment%20Required-purple)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402)
[![ZK Proofs](https://img.shields.io/badge/ZK-Real%20Proofs-green)](https://noir-lang.org)
[![Barretenberg](https://img.shields.io/badge/Prover-Barretenberg-blue)](https://github.com/AztecProtocol/barretenberg)
[![EIP-712](https://img.shields.io/badge/Permits-EIP--712-orange)](https://eips.ethereum.org/EIPS/eip-712)

## 🎯 What is HTTP 402?

**HTTP 402 Payment Required** is a standard HTTP status code for payment-protected resources. This demo shows how to build **privacy-preserving paywalls** for:

- 🌤️ **Premium API Access** - Weather data, financial data, AI services
- 📰 **Paywalled Content** - Articles, videos, podcasts
- 🔐 **Private Micropayments** - Pay per request without revealing your identity
- 🔄 **Subscription Support** - Recurring access to protected resources
- ⚡ **Instant Verification** - No waiting for blockchain confirmations

## 🚀 HTTP 402 Demo Features

**Main Demo** - Privacy-preserving paywall with:

- ✅ **HTTP 402 status code** - Standard payment required protocol
- ✅ **Pay-per-view content** - Weather data via OpenWeather API
- ✅ **Private micropayments** - ZK proofs hide payment amounts and payers
- ✅ **Real zero-knowledge proofs** - Generated with Noir + Barretenberg
- ✅ **Instant verification** - No blockchain confirmations needed
- ✅ **Subscription support** - Recurring access to paywalled resources
- ✅ **Gasless transactions** - Relayer pays all gas fees

**📖 Complete Setup Guide:** See [HTTP402_DEMO_README.md](HTTP402_DEMO_README.md)

## 🔄 Also Available: x402 Subscriptions Demo

This repository also includes a **private pull-payments** demo for recurring subscriptions:

- ✅ **12-month subscription simulation** - Automatic recurring payments
- ✅ **EIP-712 permits** - Off-chain authorization signatures  
- ✅ **Gasless transactions** - Users pay $0 in gas fees
- ✅ **Privacy verification** - Complete privacy guarantees

**📖 Setup Guide:** See [X402_DEMO_DOCUMENTATION.md](X402_DEMO_DOCUMENTATION.md) or [WHERE_X402_IS_USED.md](WHERE_X402_IS_USED.md)

## 📋 Quick Start

### Option 1: HTTP 402 Paywall Demo (Recommended)

For the **HTTP 402 Payment Required** demo with paywalled content:

**📖 Follow the complete guide:** [HTTP402_DEMO_README.md](HTTP402_DEMO_README.md)

**What you'll need:**
- Node.js >= 18
- MetaMask browser extension
- OpenWeather API key (free tier)
- 10 minutes setup time

**What you'll see:**
- Privacy-preserving paywall for weather data
- Pay-per-request with ZK proofs
- HTTP 402 status codes in action
- Instant payment verification

### Option 2: x402 Subscriptions Demo

For the **x402 Private Pull-Payments** subscription demo:

**📖 Follow the complete guide:** [X402_DEMO_DOCUMENTATION.md](X402_DEMO_DOCUMENTATION.md) or [WHERE_X402_IS_USED.md](WHERE_X402_IS_USED.md)

**What you'll need:**
- Node.js >= 18
- Foundry (Anvil, Forge)
- Noir + Barretenberg (for ZK proofs)
- MetaMask browser extension
- 20 minutes setup time

**What you'll see:**
- 12-month subscription simulation
- Automatic recurring payments
- Real ZK proof generation
- Gasless transactions

---

## 📋 Prerequisites (For Both Demos)

### 1. Node.js

**Required:** Node.js >= 18.0.0

```bash
# Check version
node --version

# Install via nvm (recommended):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. MetaMask

**Required:** Browser extension for wallet connection

- Download from https://metamask.io/
- Install browser extension
- Create or import a wallet

### 3. Additional Requirements (x402 Subscriptions Only)

For the x402 subscriptions demo, you'll also need:
- **Foundry** (Anvil, Forge, Cast)
- **Noir** (nargo) for ZK circuit compilation
- **Barretenberg** (bb) for ZK proof generation

**See the complete setup guides above for installation instructions.**

---

## 🚀 HTTP 402 Demo Setup (Main Focus)

This README provides an overview. For **complete HTTP 402 setup instructions**, see:

### 📖 [HTTP402_DEMO_README.md](HTTP402_DEMO_README.md)

The HTTP 402 demo includes:
- **Weather API Paywall** - Pay-per-request for weather data
- **Privacy-Preserving Payments** - ZK proofs hide payment details
- **HTTP 402 Status Codes** - Standard protocol implementation
- **Subscription Support** - Recurring access to paywalled content

### Quick Overview:

1. **Clone the repository**
2. **Install dependencies** (Node.js, MetaMask)
3. **Get OpenWeather API key** (free tier)
4. **Start backend** (ZK proof generation)
5. **Start frontend** (weather demo UI)
6. **Access paywalled weather data** with private payments

**Estimated setup time:** 10-15 minutes

---

## 🔄 x402 Subscriptions Demo (Alternative)

For the **x402 Private Pull-Payments** subscription demo, see:

### 📖 [WHERE_X402_IS_USED.md](WHERE_X402_IS_USED.md) or [X402_DEMO_DOCUMENTATION.md](X402_DEMO_DOCUMENTATION.md)

The x402 subscriptions demo includes:
- **12-month subscription simulation** - Automatic recurring payments every 10 seconds
- **Real ZK proof generation** - Using Noir + Barretenberg
- **EIP-712 permits** - Off-chain authorization
- **Gasless transactions** - Relayer pays gas fees

**Estimated setup time:** 20-30 minutes (requires Foundry, Noir, Barretenberg)

## 🏗️ Architecture Overview

### HTTP 402 Paywall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
│  (MetaMask + Frontend)                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1. Request Weather Data
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Frontend (Next.js)                              │
│              http://localhost:3000                           │
│                                                              │
│  - Weather Demo UI                                           │
│  - /api/weather (Protected Endpoint)                         │
│  - Returns: HTTP 402 Payment Required                        │
└──────┬─────────────────────────────────────────┬──────────┘
       │                                           │
       │ 2. Generate ZK Proof                     │ 3. Verify Payment
       │                                           │
┌──────▼──────────────────────┐      ┌───────────▼──────────┐
│     Backend (Express)        │      │  Payment Verifier    │
│     http://localhost:3001     │      │                      │
│                              │      │  - Verify ZK Proof   │
│  - /api/precomputes          │      │  - Check Payment     │
│  - ZK Proof Generation       │      │  - Grant Access      │
│  - Barretenberg Prover       │      └──────────────────────┘
│  - Noir Circuits             │                │
└──────────────────────────────┘                │
                                                 │
                                    ┌────────────▼────────────┐
                                    │   OpenWeather API       │
                                    │   (Protected Resource)  │
                                    │                         │
                                    │  Returns: Weather Data  │
                                    └─────────────────────────┘
```

**Key Components:**
1. **Frontend** - User interface for accessing paywalled content
2. **Backend** - ZK proof generation service
3. **Payment Verifier** - Validates payments and grants access
4. **Protected Resource** - Content/APIs that require payment (OpenWeather)

## 📦 Project Structure

```
demo/
├── apps/
│   └── merchant-demo/        # Next.js frontend demos
│       ├── pages/
│       │   ├── weather-demo.tsx         # HTTP 402 Weather Demo (Main)
│       │   ├── http402-full-demo.tsx    # HTTP 402 Complete Demo
│       │   ├── index.tsx                # x402 Subscriptions Demo
│       │   └── api/
│       │       ├── weather.ts           # Protected weather endpoint (402)
│       │       ├── weather-subscription.ts # Subscription payments
│       │       ├── subscription.ts      # Subscription management
│       │       └── execute.ts          # Relayer (gasless tx)
│       ├── components/
│       │   └── X402SubscriptionsDemo.tsx  # Subscriptions UI
│       ├── contracts/
│       │   └── MockX402Adapter.sol      # Smart contract
│       ├── scripts/
│       │   ├── redeploy-contract.sh     # Deployment helper
│       │   └── verify-privacy.sh       # Privacy verification
│       └── .env.local                  # Environment config
│
├── mock-backend/             # ZK proof generation service
│   ├── src/
│   │   ├── server.ts         # Express server (port 3001)
│   │   └── api/precomputes.ts # ZK proof endpoint
│   └── package.json
│
├── lib/
│   ├── precompute-circuit/   # Noir ZK circuit
│   │   ├── src/
│   │   │   └── main.nr       # Circuit logic
│   │   └── Nargo.toml
│   ├── pool/                 # Bermuda pool contracts (submodule)
│   ├── registry/             # Registry contracts (submodule)
│   └── sdk/                  # TypeScript SDK (submodule)
│
├── HTTP402_DEMO_README.md    # HTTP 402 complete setup guide
├── WHERE_X402_IS_USED.md     # x402 subscriptions guide
└── README.md                 # This file
```

## 🔧 Key Components

### 1. HTTP 402 Paywall (`/api/weather`)

- **Technology:** Next.js API Routes
- **Location:** `apps/merchant-demo/pages/api/weather.ts`
- **Features:**
  - Returns HTTP 402 status when payment required
  - Verifies ZK proofs for payment
  - Grants access to OpenWeather API data
  - Supports both one-time and subscription payments

### 2. ZK Proof Generation (mock-backend)

- **Technology:** Noir circuits + Barretenberg prover
- **Location:** `mock-backend/src/`
- **Endpoint:** `POST /api/precomputes`
- **Performance:** 17 proofs in 5-7 seconds (parallel generation)
- **Used by:** Both HTTP 402 and x402 subscriptions demos

### 3. Frontend Demos

- **Technology:** Next.js 14 + React
- **Location:** `apps/merchant-demo/pages/`
- **HTTP 402 Demos:**
  - `weather-demo.tsx` - Main HTTP 402 weather paywall
  - `http402-full-demo.tsx` - Complete HTTP 402 implementation
- **x402 Subscriptions Demo:**
  - `index.tsx` - Recurring payments demo

### 4. Payment Verification

- **Privacy-Preserving:** ZK proofs verify payments without revealing amounts
- **Instant Verification:** No blockchain confirmations needed
- **Gasless for Users:** Relayer pays transaction fees

## 🐛 Troubleshooting

### Common Issues

#### Backend Not Starting

**Problem:** Backend server fails to start or crashes

**Solution:**
1. Check Node.js version: `node --version` (must be >= 18)
2. Reinstall dependencies: `cd mock-backend && npm install`
3. Check for port conflicts (port 3001)
4. View backend logs for specific errors

#### ZK Proof Generation Fails

**Problem:** "No precomputes available" or proof generation errors

**Solution:**
1. Ensure backend is running: `cd mock-backend && npm start`
2. Check backend logs for errors
3. For x402 demo: Verify Noir circuit compiled: `cd lib/precompute-circuit && nargo compile`
4. For x402 demo: Verify Barretenberg installed: `bb --version`

#### HTTP 402 Not Working

**Problem:** Weather endpoint not returning 402 or not granting access

**Solution:**
1. Check `.env.local` has correct `OPENWEATHER_API_KEY`
2. Verify payment proof is valid
3. Check browser console for errors
4. Restart both frontend and backend servers

#### MetaMask Connection Issues

**Problem:** MetaMask won't connect or shows errors

**Solution:**
1. Ensure MetaMask extension is installed
2. Try refreshing page (Cmd+Shift+R / Ctrl+Shift+R)
3. Check MetaMask is unlocked
4. For x402 demo: Ensure Anvil is running and MetaMask is connected to local network

#### Frontend Won't Start

**Problem:** `npm run dev` fails or frontend crashes

**Solution:**
1. Check Node.js version: `node --version` (must be >= 18)
2. Reinstall dependencies: `cd apps/merchant-demo && npm install`
3. Check for port conflicts (port 3000)
4. Verify `.env.local` file exists and is configured correctly

### Getting More Help

**For detailed setup instructions:**
- **HTTP 402 Demo:** [HTTP402_DEMO_README.md](HTTP402_DEMO_README.md)
- **x402 Subscriptions:** [WHERE_X402_IS_USED.md](WHERE_X402_IS_USED.md)

**For detailed troubleshooting:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Complete troubleshooting guide

## 📚 Additional Documentation

### HTTP 402 Demo
- **[HTTP402_DEMO_README.md](HTTP402_DEMO_README.md)** - Complete HTTP 402 setup guide
- **[HTTP_402_DEMO_GUIDE.md](HTTP_402_DEMO_GUIDE.md)** - HTTP 402 usage guide
- **[HTTP402_PRIVACY_EXPLAINED.md](HTTP402_PRIVACY_EXPLAINED.md)** - Privacy guarantees for HTTP 402
- **[SUBSCRIPTION_HTTP_402_GUIDE.md](SUBSCRIPTION_HTTP_402_GUIDE.md)** - Subscription-based paywalls

### x402 Subscriptions Demo
- **[X402_DEMO_DOCUMENTATION.md](X402_DEMO_DOCUMENTATION.md)** - Complete technical documentation
- **[WHERE_X402_IS_USED.md](WHERE_X402_IS_USED.md)** - Detailed x402 implementation guide

### Privacy & Security
- **[PRIVACY_VERIFICATION_GUIDE.md](PRIVACY_VERIFICATION_GUIDE.md)** - How to verify payments are private
- **[GASLESS_TRANSACTIONS_EXPLAINED.md](GASLESS_TRANSACTIONS_EXPLAINED.md)** - How relayer pattern works

### Advanced Features
- **[AGENT_SUPPORT_GUIDE.md](AGENT_SUPPORT_GUIDE.md)** - How to add AI agent support
- **[REAL_ZK_PROOFS_WORKING.md](REAL_ZK_PROOFS_WORKING.md)** - Real ZK proof generation details

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

By running these demos, you'll understand:

### HTTP 402 Demo
1. **HTTP 402 Status Code** - Standard payment required protocol
2. **Privacy-Preserving Paywalls** - Pay without revealing identity
3. **Micropayments** - Pay per request for API access
4. **Real ZK Proof Generation** - Watch proofs generate in ~7 seconds
5. **Instant Verification** - No blockchain confirmation delays

### x402 Subscriptions Demo
1. **EIP-712 Permit Signing** - Off-chain authorization flow
2. **Gasless Transactions** - Relayer pattern in action
3. **Auto-Recurring Payments** - Automated payment execution
4. **Privacy Verification** - How to verify payments are private
5. **On-Chain Execution** - Real blockchain transactions

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

## 🚀 Getting Started

**Ready to try HTTP 402?**  
📖 Start with the [HTTP 402 Demo Setup Guide](HTTP402_DEMO_README.md)

**Want to see x402 subscriptions?**  
📖 See [WHERE_X402_IS_USED.md](WHERE_X402_IS_USED.md) or [X402_DEMO_DOCUMENTATION.md](X402_DEMO_DOCUMENTATION.md)

**Questions?** Check the [Troubleshooting](#-troubleshooting) section or [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Issues?** Open an issue on [GitHub](https://github.com/BermudaBay/x402-Demo/issues)
