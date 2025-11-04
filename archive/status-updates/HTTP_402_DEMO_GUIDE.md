# HTTP 402 Payment Required Demo - Guide

## Overview

This demonstrates the **HTTP 402 Payment Required** pattern you described:

1. Client requests service → Server responds with **HTTP 402** + payment info
2. Client pays on-chain (via x402)
3. Client sends payment proof (txHash) → Server verifies
4. Server returns service data

---

## Files Created

### 1. API Endpoint: `/api/weather.example.ts`

**Location:** `demo/apps/merchant-demo/pages/api/weather.example.ts`

**What it does:**
- `GET /api/weather/:city` → Returns HTTP 402 if payment not made
- `POST /api/weather/:city` → Accepts payment proof (txHash) and returns weather

**Features:**
- ✅ HTTP 402 status code when payment required
- ✅ Payment verification on-chain (checks txHash exists and succeeded)
- ✅ Returns weather data after payment verified
- ✅ Stores payment records (in-memory for demo)

---

### 2. Frontend Demo: `weather-demo.tsx`

**Location:** `demo/apps/merchant-demo/pages/weather-demo.tsx`

**What it does:**
- UI for requesting weather data
- Shows HTTP 402 payment required message
- Accepts txHash from user
- Displays weather data after payment

---

## How to Use

### Step 1: Enable the Demo

**Option A: Rename API file** (to make it active)
```bash
cd demo/apps/merchant-demo/pages/api
mv weather.example.ts weather.ts
```

**Option B: Access via route** (if Next.js supports it)
- The file is named `.example.ts` so it won't interfere with existing routes
- To activate: rename to `weather.ts`

---

### Step 2: Run the Demo

1. **Start Next.js dev server:**
```bash
cd demo/apps/merchant-demo
npm run dev
```

2. **Open weather demo page:**
```
http://localhost:3000/weather-demo
```

---

### Step 3: Test Flow

1. **Connect Wallet** → MetaMask connects

2. **Select City** → Choose Hamburg, Berlin, or Munich

3. **Click "Request Weather Data"**
   - Server responds with **HTTP 402 Payment Required**
   - Shows payment amount (1 USDC)
   - Shows adapter address

4. **Pay On-Chain:**
   - Go to subscription demo (`/`)
   - Create payment for 1 USDC
   - Get `txHash` from payment response

5. **Submit Payment Proof:**
   - Click "Submit Payment Proof"
   - Enter the `txHash`
   - Server verifies payment on-chain
   - Returns weather data: "24°C, bewölkt"

---

## HTTP 402 Response Format

When payment is required, server returns:

```json
{
  "paymentRequired": true,
  "amount": "1000000",
  "currency": "USDC",
  "decimals": 6,
  "description": "Weather data for hamburg",
  "paymentInfo": {
    "adapterAddress": "0x...",
    "recipient": "0x...",
    "note": "Weather API payment for hamburg"
  },
  "instructions": {
    "step1": "Call /api/subscription (POST) or execute payment via /api/execute",
    "step2": "Get txHash from payment response",
    "step3": "POST to this endpoint with txHash in body"
  }
}
```

---

## Payment Verification

The server verifies payment by:

1. **Checking txHash exists** on-chain
2. **Verifying transaction succeeded** (status = 1)
3. **Storing payment record** in memory (use database in production)

```typescript
const receipt = await provider.getTransactionReceipt(txHash);
if (!receipt || receipt.status !== 1) {
  return res.status(402).json({ paymentRequired: true });
}
```

---

## Integration with X402

The HTTP 402 demo integrates with the existing x402 payment system:

1. **User pays via x402** (subscription demo)
2. **Gets txHash** from x402 payment
3. **Sends txHash** to HTTP 402 API
4. **Server verifies** on-chain
5. **Returns service data**

---

## Production Improvements

For production, you'd want:

1. **Database storage** instead of in-memory Map
2. **Payment tracking** by user + service ID
3. **Expiring payments** (time-limited)
4. **Multiple payment methods** (not just x402)
5. **Rate limiting** on API
6. **Authentication** (JWT tokens)
7. **Event parsing** (verify specific events from contract)
8. **Amount verification** (check exact amount paid)

---

## API Endpoints

### GET `/api/weather/:city?address=0x...`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/weather/hamburg?address=0x..." \
  -H "x-user-address: 0x..."
```

**Response (402):**
```json
{
  "paymentRequired": true,
  "amount": "1000000",
  "currency": "USDC",
  ...
}
```

**Response (200):**
```json
{
  "success": true,
  "payment": { "txHash": "0x...", "amount": "1000000" },
  "weather": {
    "city": "Hamburg",
    "temperature": 24,
    "condition": "bewölkt"
  },
  "message": "24°C, bewölkt"
}
```

---

### POST `/api/weather/:city`

**Request:**
```bash
curl -X POST "http://localhost:3000/api/weather/hamburg" \
  -H "Content-Type: application/json" \
  -H "x-user-address: 0x..." \
  -d '{
    "txHash": "0x...",
    "address": "0x..."
  }'
```

**Response (200):**
```json
{
  "success": true,
  "payment": { "txHash": "0x...", "amount": "1000000" },
  "weather": { ... },
  "message": "24°C, bewölkt"
}
```

---

## Testing

1. **Test HTTP 402 Response:**
   ```bash
   curl http://localhost:3000/api/weather.example?city=hamburg&address=0x...
   # Should return HTTP 402
   ```

2. **Test Payment Submission:**
   ```bash
   curl -X POST http://localhost:3000/api/weather.example?city=hamburg \
     -H "Content-Type: application/json" \
     -d '{"txHash": "0x...", "address": "0x..."}'
   # Should return weather data
   ```

---

## Summary

✅ **HTTP 402 Pattern Implemented:**
- Server returns HTTP 402 when payment required
- Client pays on-chain (via x402)
- Client submits payment proof (txHash)
- Server verifies on-chain
- Server returns service data

✅ **Integration with Existing Demo:**
- Uses same x402 payment system
- Uses same RPC provider
- Uses same adapter address

This is the **HTTP 402 Payment Required pattern** you described! 🎉







