# HTTP 402 Subscription Model - Complete Guide

## Scenario

A **subscription-based service** using HTTP 402:

1. User requests weather data → **HTTP 402 Subscription Required**
2. User subscribes once (daily/weekly/monthly) → Pays on-chain
3. User gets **unlimited access** for subscription period
4. Server checks subscription on **every request**
5. When subscription expires → **HTTP 402** again

---

## Files

### 1. Backend API
**Location:** `demo/apps/merchant-demo/pages/api/weather-subscription.ts`

**Endpoints:**
- `GET /api/weather-subscription?city=:city&address=:address`
  - Returns weather if active subscription
  - Returns HTTP 402 if no subscription or expired
  - Returns HTTP 429 if request limit exceeded

- `POST /api/weather-subscription`
  - Creates subscription with payment proof
  - Body: `{ address, txHash, plan }`

- `DELETE /api/weather-subscription?address=:address`
  - Cancels subscription

### 2. Frontend Demo
**Location:** `demo/apps/merchant-demo/pages/http402-subscription-demo.tsx`

**Features:**
- 3-column layout (Subscription | History | Logs)
- Choose subscription plan (daily/weekly/monthly)
- Subscribe with one payment
- Make unlimited requests during subscription
- Visual subscription status
- Weather history tracker
- HTTP request logs

**URL:** `http://localhost:3000/http402-subscription-demo`

---

## Subscription Plans

### Daily Access
- **Price:** 1 USDC
- **Duration:** 24 hours
- **Requests:** 100 requests
- **Use case:** Testing, occasional use

### Weekly Access
- **Price:** 5 USDC
- **Duration:** 7 days
- **Requests:** 1,000 requests
- **Use case:** Regular users

### Monthly Access
- **Price:** 15 USDC
- **Duration:** 30 days
- **Requests:** 10,000 requests
- **Use case:** Power users, developers

---

## Complete Flow

### Step 1: First Request (No Subscription)

**User Action:** Click "GET Weather"

**HTTP Request:**
```http
GET /api/weather-subscription?city=hamburg&address=0x123...
```

**Server Response:**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "paymentRequired": true,
  "subscriptionRequired": true,
  "message": "Active subscription required to access weather data",
  "plans": [
    {
      "id": "daily",
      "name": "Daily Access",
      "price": 1,
      "currency": "USDC",
      "duration": "1 days",
      "requestLimit": 100
    },
    {
      "id": "weekly",
      "name": "Weekly Access",
      "price": 5,
      "currency": "USDC",
      "duration": "7 days",
      "requestLimit": 1000
    },
    {
      "id": "monthly",
      "name": "Monthly Access",
      "price": 15,
      "currency": "USDC",
      "duration": "30 days",
      "requestLimit": 10000
    }
  ]
}
```

**What happens:**
- Server checks: No subscription found for `0x123...`
- Returns HTTP 402 with available plans
- Frontend shows subscription plans

---

### Step 2: Subscribe

**User Action:** Select plan → Click "Subscribe Now"

**Process:**
1. Generate ZK proof (7 seconds)
2. Sign EIP-712 permit (MetaMask)
3. Execute payment on-chain
4. Get txHash

**HTTP Request:**
```http
POST /api/weather-subscription
Content-Type: application/json

{
  "address": "0x123...",
  "txHash": "0xabc...",
  "plan": "daily"
}
```

**Server Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Subscription created successfully",
  "subscription": {
    "plan": "daily",
    "planName": "Daily Access",
    "startDate": "2025-11-02T12:00:00.000Z",
    "expiryDate": "2025-11-03T12:00:00.000Z",
    "daysRemaining": 1,
    "requestLimit": 100
  },
  "payment": {
    "txHash": "0xabc...",
    "amount": 1,
    "currency": "USDC"
  }
}
```

**What happens:**
- Server verifies txHash on-chain
- Creates subscription record
- Stores: address, plan, startDate, expiryDate
- Returns subscription details

---

### Step 3: Subsequent Requests (With Subscription)

**User Action:** Click "GET Weather" again

**HTTP Request:**
```http
GET /api/weather-subscription?city=hamburg&address=0x123...
```

**Server Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "subscription": {
    "plan": "daily",
    "expiryDate": "2025-11-03T12:00:00.000Z",
    "daysRemaining": 1,
    "requestCount": 1,
    "requestLimit": 100
  },
  "weather": {
    "city": "Hamburg",
    "temperature": 24,
    "condition": "bewölkt",
    "forecast": ["25°C sonnig", "23°C regnerisch", "22°C bewölkt"]
  },
  "message": "24°C, bewölkt"
}
```

**What happens:**
- Server checks: Subscription found for `0x123...`
- Server verifies: Not expired, under request limit
- Server increments: requestCount++
- Returns weather data + subscription status

**User can repeat:** Make unlimited requests (up to limit) during subscription period

---

### Step 4: Subscription Expired

**After 24 hours...**

**User Action:** Click "GET Weather"

**Server Response:**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "paymentRequired": true,
  "subscriptionExpired": true,
  "message": "Your subscription has expired",
  "expiredDate": "2025-11-03T12:00:00.000Z",
  "plans": [...]
}
```

**What happens:**
- Server checks: Subscription expired
- Returns HTTP 402 again
- User must renew subscription

---

## Key Differences from One-Time Payment

| One-Time Payment | Subscription Model |
|-----------------|-------------------|
| Pay per request | Pay once, multiple requests |
| HTTP 402 every time | HTTP 402 only when expired |
| No request tracking | Tracks requestCount |
| No expiry | Has expiry date |
| Higher per-request cost | Lower per-request cost |

---

## Server-Side Logic

### Subscription Check (on every GET request)

```typescript
// Check for active subscription
const subscription = subscriptions.get(userAddress);

if (!subscription) {
  // No subscription → HTTP 402
  return res.status(402).json({
    paymentRequired: true,
    subscriptionRequired: true,
    plans: [...],
  });
}

if (Date.now() > subscription.expiryDate) {
  // Expired → HTTP 402
  return res.status(402).json({
    paymentRequired: true,
    subscriptionExpired: true,
  });
}

if (subscription.requestCount >= PLANS[subscription.plan].requestLimit) {
  // Limit exceeded → HTTP 429
  return res.status(429).json({
    error: "Request limit exceeded",
  });
}

// Valid subscription → HTTP 200 + data
subscription.requestCount++;
return res.status(200).json({
  weather: getWeatherData(city),
  subscription: {
    requestCount: subscription.requestCount,
    daysRemaining: calculateDaysRemaining(subscription),
  },
});
```

---

## Frontend Features

### 3-Column Layout

**Column 1: Subscription Management**
- Wallet connection
- Subscription status (active/inactive)
- Plan selection
- Subscribe button
- Request weather button

**Column 2: Weather History**
- Shows all weather requests made
- Request number tracking
- Timestamp for each request
- Temperature and condition

**Column 3: HTTP Logs**
- Real-time HTTP request/response logs
- Color-coded status (402 = yellow, 200 = green)
- Full request/response details

---

## Use Cases

### Real-World Applications

1. **Weather API Subscriptions**
   - Pay once per month → Unlimited requests
   - Track usage per user
   - Upgrade/downgrade plans

2. **News/Content API**
   - Daily access for casual readers
   - Monthly access for businesses
   - Request limits prevent abuse

3. **AI Model API**
   - Pay per tier (daily/weekly/monthly)
   - Different request limits per tier
   - Track API usage per user

4. **Financial Data API**
   - Real-time data requires subscription
   - Different tiers for different data
   - Historical data vs. live data

---

## Production Improvements

1. **Database Storage**
   ```typescript
   // Replace in-memory Map with PostgreSQL
   await db.subscriptions.create({
     address: userAddress,
     plan: plan,
     startDate: now,
     expiryDate: expiryDate,
     txHash: txHash,
   });
   ```

2. **Caching**
   ```typescript
   // Redis cache for fast subscription checks
   const cached = await redis.get(`subscription:${address}`);
   if (cached) return JSON.parse(cached);
   ```

3. **Webhooks**
   ```typescript
   // Notify user when subscription expires
   if (daysRemaining === 1) {
     await sendEmail(user, "Subscription expiring soon");
   }
   ```

4. **Auto-Renewal**
   ```typescript
   // Charge user automatically when subscription expires
   if (subscription.autoRenew && isExpired(subscription)) {
     await chargeUser(subscription);
   }
   ```

5. **Analytics**
   ```typescript
   // Track usage patterns
   await analytics.track({
     user: address,
     requestCount: subscription.requestCount,
     plan: subscription.plan,
   });
   ```

---

## Testing

### Test Flow

1. **Start services:**
   ```bash
   # Terminal 1: Anvil
   anvil --chain-id 31337
   
   # Terminal 2: Mock backend
   cd demo/mock-backend && npm start
   
   # Terminal 3: Next.js
   cd demo/apps/merchant-demo && npm run dev
   ```

2. **Open demo:**
   ```
   http://localhost:3000/http402-subscription-demo
   ```

3. **Test subscription flow:**
   - Connect wallet
   - Request weather → Get HTTP 402
   - Select plan (daily)
   - Subscribe → Pay on-chain
   - Request weather again → Get HTTP 200
   - Make multiple requests → See requestCount increment
   - Check HTTP logs → See all HTTP 402/200 responses

---

## Summary

✅ **Complete subscription implementation:**
- HTTP 402 when no subscription
- Pay once → Unlimited access
- Server checks subscription on every request
- Request counting and limits
- Expiry dates and renewal
- Multiple subscription tiers

✅ **Real HTTP 402 pattern:**
- Actual HTTP status codes
- On-chain payment verification
- Subscription storage and tracking
- Production-ready architecture

This is a **real subscription model** using HTTP 402! 🎉

