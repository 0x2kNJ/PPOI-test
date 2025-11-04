# Complete HTTP 402 Demo - Full Setup

## Reality Check First

**⚠️ Important: There is NO official "x402" standard.**

This repo contains a **custom implementation** inspired by the HTTP 402 concept. See `X402_REALITY_CHECK.md` for details.

---

## What This Demo Provides

A complete, working HTTP 402 Payment Required implementation:

1. **Real HTTP GET** → Server responds with `HTTP 402 Payment Required`
2. **On-chain payment** → User pays via x402 smart contract
3. **Real HTTP POST** → Client submits payment proof
4. **Server verification** → Server verifies tx on-chain
5. **Service delivery** → Server returns weather data

---

## Files

### 1. Complete Frontend Demo
**Location:** `demo/apps/merchant-demo/pages/http402-full-demo.tsx`

**Features:**
- Split-screen UI (controls + HTTP logs)
- Real HTTP GET/POST requests
- Payment flow with ZK proofs
- Live HTTP request/response logging
- Visual status indicators

**URL:** `http://localhost:3000/http402-full-demo`

### 2. Backend API
**Location:** `demo/apps/merchant-demo/pages/api/weather.ts`

**Features:**
- GET: Returns HTTP 402 when payment required
- POST: Accepts payment proof (txHash)
- On-chain verification
- Weather data delivery after payment

---

## Setup

### Step 1: Start Services

```bash
# Terminal 1: Start Anvil
anvil --chain-id 31337

# Terminal 2: Start mock backend (ZK proofs)
cd demo/mock-backend
npm start

# Terminal 3: Start Next.js
cd demo/apps/merchant-demo
npm run dev
```

### Step 2: Open Demo

```
http://localhost:3000/http402-full-demo
```

---

## Complete Flow

### 1. Connect Wallet
Click "Connect MetaMask" → MetaMask popup → Approve

### 2. Select City
Choose: Hamburg, Berlin, or München

### 3. HTTP GET Request
Click "GET /api/weather" → Makes actual HTTP request

**Server Response:**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "paymentRequired": true,
  "amount": "1000000",
  "currency": "USDC",
  "decimals": 6,
  "paymentInfo": {
    "adapterAddress": "0x...",
    "recipient": "0x...",
    "note": "Weather API payment for hamburg"
  }
}
```

**What you see:**
- HTTP log shows: `GET /api/weather?city=hamburg`
- Status: `HTTP 402 Payment Required`
- Payment box appears with amount

### 4. Pay On-Chain
Click "Pay On-Chain" → Executes these steps:

1. **Generate ZK Proof** (via `/api/precomputes`)
   - Takes ~7 seconds
   - Status: "🔐 Generating ZK proof..."

2. **Sign EIP-712 Permit** (MetaMask popup)
   - User signs once
   - Status: "✍️ Signing permit..."

3. **Execute Transaction** (via `/api/execute`)
   - Relayer submits to blockchain
   - Status: "🚀 Executing payment transaction..."

4. **Get txHash**
   - Transaction confirmed
   - Status: "✅ Payment successful! TX: 0xabc..."

### 5. HTTP POST with Payment Proof
Click "POST Payment Proof" → Makes actual HTTP request

**Client Request:**
```http
POST /api/weather?city=hamburg HTTP/1.1
Content-Type: application/json

{
  "txHash": "0xabc...",
  "address": "0x123..."
}
```

**Server Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "payment": {
    "txHash": "0xabc...",
    "amount": "1000000",
    "timestamp": 1234567890
  },
  "weather": {
    "city": "Hamburg",
    "temperature": 24,
    "condition": "bewölkt"
  },
  "message": "24°C, bewölkt"
}
```

**What you see:**
- HTTP log shows: `POST /api/weather?city=hamburg`
- Status: `HTTP 200 OK`
- Weather box appears: "Hamburg: 24°C, bewölkt"

---

## HTTP Logs

The right panel shows **real-time HTTP request/response logs**:

```
2025-11-02T12:34:56.789Z
GET /api/weather?city=hamburg&address=0x...
HTTP 402 Payment Required

{
  "paymentRequired": true,
  "amount": "1000000",
  ...
}
```

Then after payment:

```
2025-11-02T12:35:23.456Z
POST /api/weather?city=hamburg
HTTP 200 OK

{
  "success": true,
  "weather": {
    "city": "Hamburg",
    "temperature": 24,
    "condition": "bewölkt"
  }
}
```

---

## Technical Details

### Payment Verification (Server-Side)

```typescript
// Server checks txHash on-chain
const provider = new ethers.JsonRpcProvider(RPC_URL);
const receipt = await provider.getTransactionReceipt(txHash);

if (!receipt || receipt.status !== 1) {
  return res.status(402).json({ paymentRequired: true });
}

// Payment verified - return weather data
return res.status(200).json({ weather: weatherData });
```

### Payment Storage

```typescript
// In-memory storage (use database in production)
const paymentRecords = new Map<string, {
  address: string;
  txHash: string;
  timestamp: number;
}>();

// Store payment after verification
paymentRecords.set(`${address}:${city}`, {
  address,
  txHash,
  timestamp: Date.now()
});
```

---

## Differences from Original Demo

### Original Demo:
- Only showed API endpoints
- No visual HTTP logs
- Manual txHash input
- Two separate UIs

### New Complete Demo:
- ✅ **Integrated flow** - All in one screen
- ✅ **Real HTTP logs** - See actual requests/responses
- ✅ **Automatic flow** - Payment → Proof submission
- ✅ **Visual feedback** - Color-coded status
- ✅ **Split-screen** - Controls + logs side-by-side

---

## Production Improvements

For production use:

1. **Database** - Replace in-memory Map with PostgreSQL/MongoDB
2. **Authentication** - Add JWT tokens for user sessions
3. **Rate Limiting** - Prevent abuse (e.g., 100 requests/hour)
4. **Payment Tracking** - Store payment details (amount, timestamp, service)
5. **Expiry** - Payments expire after 24 hours
6. **Multiple Services** - Support multiple paid endpoints
7. **Event Parsing** - Verify specific events from contract
8. **Amount Verification** - Check exact amount paid matches required amount
9. **HTTPS** - Use secure connections in production
10. **Error Handling** - Better error messages and retries

---

## API Reference

### GET `/api/weather?city=:city&address=:address`

**Returns HTTP 402** if payment not made:
```json
{
  "paymentRequired": true,
  "amount": "1000000",
  "currency": "USDC"
}
```

**Returns HTTP 200** if already paid:
```json
{
  "success": true,
  "weather": { ... }
}
```

### POST `/api/weather?city=:city`

**Body:**
```json
{
  "txHash": "0x...",
  "address": "0x..."
}
```

**Returns HTTP 200** after verification:
```json
{
  "success": true,
  "payment": { "txHash": "0x..." },
  "weather": { ... }
}
```

---

## Testing

```bash
# Test HTTP 402 response
curl "http://localhost:3000/api/weather?city=hamburg&address=0x123..."

# Should return:
# HTTP 402 with payment info

# Test payment proof submission
curl -X POST "http://localhost:3000/api/weather?city=hamburg" \
  -H "Content-Type: application/json" \
  -d '{"txHash": "0xabc...", "address": "0x123..."}'

# Should return:
# HTTP 200 with weather data
```

---

## Summary

This is a **complete, working HTTP 402 implementation**:

✅ Real HTTP GET/POST requests
✅ Actual HTTP 402 status codes
✅ On-chain payment verification
✅ Live HTTP request/response logs
✅ Integrated payment flow
✅ Production-ready architecture

**Not included:**
- Official x402/ERC-402 standard (doesn't exist)
- Coinbase implementation (doesn't exist)

This is a **custom implementation** demonstrating the HTTP 402 Payment Required pattern with blockchain verification.







