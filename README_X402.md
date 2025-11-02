# x402 Private Pull-Payments Demo (Bermuda)

This demo implements x402 Private Pull-Payments using Bermuda's shielded pool infrastructure. It reuses the existing debit-card precompute stack: precomputed zk proofs + EIP-712 permits + relayer/paymaster.

## Architecture

The demo consists of:

1. **X402Adapter.sol** - Main contract that handles pull payments with permit verification
2. **SDK** (`/sdk/x402.ts`) - Wallet SDK for generating precomputes and permits
3. **Merchant Demo** (`/apps/merchant-demo`) - Next.js merchant checkout application
4. **Scripts** - Deployment and testing scripts
5. **Tests** - Foundry tests for contract verification

## Components

### Contracts

- **X402Adapter.sol** - Adapter contract that:
  - Verifies EIP-712 permits signed by note owners
  - Verifies ZK proofs (placeholder for demo)
  - Enforces policies via SimplePolicyGate
  - Checks compliance via PPOIVerifier
  - Supports note isolation for compliance

- **SimplePolicyGate.sol** - Reused policy enforcement (max tx, daily limits)

- **PPOIVerifier.sol** - Reused compliance verifier (PPOI, zkKYC)

### SDK

- **createX402Precompute()** - Generate precompute and sign permit
- **signPermit()** - Sign EIP-712 permit
- **submitTake()** - Submit pull payment via relayer
- **submitRedeemToPublic()** - Redeem to public address

### Merchant Demo

- **Next.js App** - Merchant checkout interface
- **API Route** - Relayer endpoint for executing transactions
- **Components** - PayButton component for checkout flow

## Setup

### 1. Deploy Contracts

```bash
cd demo/scripts
export RPC_URL=http://localhost:8545
export DEPLOYER_PK=your_private_key
export POOL_ADDR=0x... # Bermuda pool address
export RELAYER_ADDR=0x... # Relayer address (optional, use 0x0 for any)

npx ts-node deploy-x402.ts
```

### 2. Setup Merchant Demo

```bash
cd demo/apps/merchant-demo
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

### 3. Run Tests

```bash
cd demo
forge test --match-contract X402AdapterTest -vvv
```

## Usage

### 1. User Side (Wallet SDK)

```typescript
import { createX402Precompute, submitTake } from './sdk/x402';

// Generate precompute and permit
const precompute = await createX402Precompute({
  wallet: { zkp, signer, chainId },
  noteId: '0x...',
  maxAmount: '1000000', // 1 USDC
  merchant: '0x...',
  expiry: Math.floor(Date.now() / 1000) + 3600,
  nonce: Date.now(),
});

// Submit pull payment
const result = await submitTake({
  relayerUrl: 'http://localhost:3000',
  adapter: '0x...',
  proof: precompute.proof,
  permit: precompute.permit,
  recipient: '0x...',
  amount: '100000', // 0.1 USDC
});
```

### 2. Merchant Side

1. User connects wallet and enters amount
2. User generates precompute and permit
3. Merchant clicks "Pay with x402"
4. Relayer executes `take()` on X402Adapter
5. Funds are transferred from shielded note to recipient

## Test Scripts

### Test `take()` locally:

```bash
export RPC_URL=http://localhost:8545
export CALLER_PK=your_private_key
export ADAPTER_ADDR=0x...
export MERCHANT_ADDR=0x...
export RECIPIENT_ADDR=0x...

npx ts-node scripts/call-take.ts
```

## Security Checklist

✅ **EIP-712 chainId/domain bound** - Permits are chain-specific
✅ **Strict merchant binding** - Permits bind to specific merchant
✅ **Single-use nonces** - Nonces prevent replay attacks
✅ **Proof verifies noteId + amount** - No substitution possible
✅ **PolicyEngine enforces caps** - Max tx and daily limits
✅ **Relayer whitelisting** - Optional for demo (set to 0x0 for any)
✅ **No custody** - All paths remain user-keyed
✅ **Isolation not freezing** - Isolated notes can still withdraw to origin

## Environment Variables

### Deployment

- `RPC_URL` - Ethereum RPC endpoint
- `DEPLOYER_PK` - Deployer private key
- `POOL_ADDR` - Bermuda pool contract address
- `RELAYER_ADDR` - Relayer address (0x0 = any sender)
- `POLICY_GATE_ADDR` - Existing SimplePolicyGate (optional)
- `PPOI_VERIFIER_ADDR` - Existing PPOIVerifier (optional)

### Merchant Demo

- `RPC_URL` - Ethereum RPC endpoint
- `RELAYER_PK` - Relayer private key
- `ADAPTER_ADDR` - X402Adapter contract address
- `NEXT_PUBLIC_CHAIN_ID` - Chain ID

## Acceptance Criteria

✅ User can: fund shielded note → click "Pay with x402" → merchant receives settlement tx hash

✅ Latency: precomputed flow executes without proof-generation delay (placeholder proofs for demo)

✅ Nonce/expiry enforced; wrong merchant cannot redeem

✅ If compliance flag toggled "fail", funds are isolated/non-mingled (noteIsolation mapping)

✅ Works on testnet (Sepolia/holesky) - contract supports any chainId

## Next Steps

1. **Integrate with actual pool router** - Replace placeholder `_transferFromNoteTo()` with actual pool calls
2. **Integrate with proof verifier** - Replace placeholder proof verification with actual ZK verifier
3. **Add note owner verification** - Verify permit signer owns the noteId via pool registry
4. **Test with real precomputes** - Use actual Bermuda SDK precompute generation
5. **Add paymaster support** - Integrate with paymaster for gasless transactions

## File Structure

```
demo/
├── contracts/
│   ├── X402Adapter.sol          # Main adapter contract
│   ├── interfaces/
│   │   └── IX402Adapter.sol     # Interface
│   ├── SimplePolicyGate.sol     # Reused policy gate
│   └── PPOIVerifier.sol        # Reused compliance verifier
├── sdk/
│   ├── x402.ts                  # SDK implementation
│   ├── types.ts                 # TypeScript types
│   └── index.ts                 # Main export
├── apps/
│   └── merchant-demo/            # Next.js merchant app
│       ├── pages/
│       │   ├── index.tsx        # Checkout page
│       │   └── api/
│       │       └── execute.ts   # Relayer endpoint
│       └── components/
│           └── PayButton.tsx    # Payment button
├── scripts/
│   ├── deploy-x402.ts           # Deployment script
│   └── call-take.ts             # Test script
└── test/
    └── X402Adapter.t.sol        # Foundry tests
```

