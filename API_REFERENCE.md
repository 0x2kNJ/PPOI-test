# X402 API Reference

Complete API documentation for the X402 Private Pull-Payments system.

---

## Table of Contents

1. [Backend API (Port 3001)](#backend-api-port-3001)
2. [Frontend API (Port 3000)](#frontend-api-port-3000)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Examples](#examples)

---

## Backend API (Port 3001)

Base URL: `http://localhost:3001`

### GET /health

Health check endpoint to verify backend service status.

**Request**:
```bash
GET /health
```

**Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": 1730476800000,
  "zkProofGenerator": "enabled",
  "sdk": "installed",
  "version": "1.0.0"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Service status (`ok`, `degraded`, `error`) |
| `timestamp` | number | Current server timestamp (ms) |
| `zkProofGenerator` | string | ZK proof generation status |
| `sdk` | string | Bermuda SDK installation status |
| `version` | string | API version |

**Example**:
```bash
curl http://localhost:3001/health | jq
```

---

### POST /api/precomputes

Generate real ZK proofs for payment amounts using Noir and Barretenberg.

**Request**:
```bash
POST /api/precomputes
Content-Type: application/json
```

**Request Body**:
```json
{
  "noteId": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "maxAmountUsd": "120.00"
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `noteId` | string | Yes | User's shielded note identifier (bytes32 hex) |
| `maxAmountUsd` | string | Yes | Maximum amount in USD (e.g., "120.00") |

**Response**: `200 OK`
```json
{
  "precomputes": [
    {
      "bucketAmount": 1,
      "proof": "0x12cb26ea5d0b2a0874d6e2c78b1663d461e45a57e629c528c3c6d4dc0e959bf130644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000...",
      "publicInputs": [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      ]
    },
    {
      "bucketAmount": 2,
      "proof": "0x...",
      "publicInputs": ["0x...", "0x...", "0x...", "0x..."]
    }
  ],
  "stats": {
    "total": 17,
    "realProofs": 17,
    "mockProofs": 0,
    "generationTime": "7.2s",
    "avgProofSize": 4546
  }
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `precomputes` | array | Array of precomputed ZK proofs |
| `precomputes[].bucketAmount` | number | Payment amount in cents |
| `precomputes[].proof` | string | Barretenberg proof (hex, ~4.5KB) |
| `precomputes[].publicInputs` | array | Public circuit inputs (4 fields) |
| `stats.total` | number | Total proofs generated |
| `stats.realProofs` | number | Count of real ZK proofs |
| `stats.mockProofs` | number | Count of mock proofs (should be 0) |
| `stats.generationTime` | string | Total generation time |
| `stats.avgProofSize` | number | Average proof size in bytes |

**Public Inputs** (4 fields):
1. `merkle_root` - Merkle tree root (bytes32)
2. `public_amount` - Negative amount in field representation (bytes32)
3. `ext_data_hash` - Hash of external data (recipient, relayer, fee) (bytes32)
4. `nullifier` - Note nullifier for double-spend prevention (bytes32)

**Bucket Amounts** (Truncated Ladder for $1,000 max):
```
[0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00, 2.00, 
 5.00, 10.00, 20.00, 50.00, 100.00, 200.00, 500.00, 1000.00]
```

**Error Response**: `400 Bad Request` or `500 Internal Server Error`
```json
{
  "error": "Failed to generate proofs",
  "details": "Circuit constraint not satisfied: nullifier_hash == nullifier",
  "timestamp": 1730476800000
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/precomputes \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "maxAmountUsd": "10.00"
  }' | jq
```

**Performance**:
- First request (cold start): ~7-10 seconds
- Subsequent requests (warm): ~5-7 seconds
- Proof generation is CPU-intensive (parallelized with 10 workers)

---

## Frontend API (Port 3000)

Base URL: `http://localhost:3000`

### POST /api/precomputes

Proxy to backend precompute generation with additional logging and error handling.

**Request**:
```bash
POST /api/precomputes
Content-Type: application/json
```

**Request Body**:
```json
{
  "noteId": "0xaaaa...",
  "maxAmountUsd": "120.00"
}
```

**Response**: Same as [Backend POST /api/precomputes](#post-apiprecomputes)

**Example**:
```bash
curl -X POST http://localhost:3000/api/precomputes \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "0xaaaa000...",
    "maxAmountUsd": "10.00"
  }' | jq
```

---

### POST /api/subscription

Create a new subscription with precomputed ZK proofs.

**Request**:
```bash
POST /api/subscription
Content-Type: application/json
```

**Request Body**:
```json
{
  "merchantName": "Subscription Service",
  "merchantAddress": "0x1234567890123456789012345678901234567890",
  "userAddress": "0x0987654321098765432109876543210987654321",
  "amount": "10000000",
  "interval": "monthly",
  "noteId": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "permitSignature": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1234567890abcdef1234567890abcdef1b",
  "maxAmount": "120000000",
  "expiry": 1735689600,
  "nonce": 1234567890,
  "proof": "0x12cb26ea5d0b2a...",
  "publicInputs": [
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  ]
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `merchantName` | string | Yes | Merchant display name |
| `merchantAddress` | address | Yes | Merchant's Ethereum address |
| `userAddress` | address | Yes | User's Ethereum address |
| `amount` | string | Yes | Payment amount (wei, 6 decimals for USDC) |
| `interval` | string | Yes | Payment interval (`monthly`, `weekly`, `yearly`) |
| `noteId` | bytes32 | Yes | User's shielded note identifier |
| `permitSignature` | string | Yes | EIP-712 permit signature (65 bytes hex) |
| `maxAmount` | string | Yes | Maximum allowed amount (wei) |
| `expiry` | number | Yes | Permit expiry timestamp (Unix seconds) |
| `nonce` | number | Yes | Unique nonce for replay protection |
| `proof` | string | Yes | ZK proof (hex, ~4.5KB) |
| `publicInputs` | array | Yes | 4 public circuit inputs |

**Response**: `200 OK`
```json
{
  "success": true,
  "subscriptionId": "sub_1234567890_0x09876...",
  "nextChargeDate": "2025-12-01T00:00:00.000Z",
  "subscription": {
    "id": "sub_1234567890_0x09876...",
    "merchantName": "Subscription Service",
    "merchantAddress": "0x1234567890123456789012345678901234567890",
    "userAddress": "0x0987654321098765432109876543210987654321",
    "amount": "10000000",
    "interval": "monthly",
    "status": "active",
    "createdAt": "2024-11-01T00:00:00.000Z",
    "nextChargeDate": "2025-12-01T00:00:00.000Z",
    "lastChargedDate": null
  }
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether subscription was created |
| `subscriptionId` | string | Unique subscription identifier |
| `nextChargeDate` | string | Next scheduled charge date (ISO 8601) |
| `subscription` | object | Full subscription details |

**Error Response**: `400 Bad Request`
```json
{
  "error": "Invalid merchant address",
  "timestamp": 1730476800000
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/subscription \
  -H "Content-Type: application/json" \
  -d '{
    "merchantName": "Subscription Service",
    "merchantAddress": "0x1234567890123456789012345678901234567890",
    "userAddress": "0x0987654321098765432109876543210987654321",
    "amount": "10000000",
    "interval": "monthly",
    "noteId": "0xaaaa...",
    "permitSignature": "0xbbbb...",
    "maxAmount": "120000000",
    "expiry": 1735689600,
    "nonce": 1234567890,
    "proof": "0x12cb...",
    "publicInputs": ["0x...", "0x...", "0x...", "0x..."]
  }' | jq
```

---

### GET /api/subscription

Get subscriptions for a user address.

**Request**:
```bash
GET /api/subscription?userAddress=0x0987654321098765432109876543210987654321
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAddress` | address | Yes | User's Ethereum address |

**Response**: `200 OK`
```json
{
  "subscriptions": [
    {
      "id": "sub_1234567890_0x09876...",
      "merchantName": "Subscription Service",
      "merchantAddress": "0x1234567890123456789012345678901234567890",
      "userAddress": "0x0987654321098765432109876543210987654321",
      "amount": "10000000",
      "interval": "monthly",
      "status": "active",
      "createdAt": "2024-11-01T00:00:00.000Z",
      "nextChargeDate": "2025-12-01T00:00:00.000Z",
      "lastChargedDate": "2024-11-01T00:00:00.000Z"
    }
  ]
}
```

**Example**:
```bash
curl "http://localhost:3000/api/subscription?userAddress=0x0987654321098765432109876543210987654321" | jq
```

---

### PUT /api/subscription

Charge an existing subscription (trigger payment).

**Request**:
```bash
PUT /api/subscription
Content-Type: application/json
```

**Request Body**:
```json
{
  "subscriptionId": "sub_1234567890_0x09876..."
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subscriptionId` | string | Yes | Subscription ID to charge |

**Response**: `200 OK`
```json
{
  "success": true,
  "txHash": "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  "message": "Payment processed successfully",
  "amountCharged": "10000000",
  "nextChargeDate": "2025-01-01T00:00:00.000Z"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether payment was processed |
| `txHash` | string | Blockchain transaction hash |
| `message` | string | Human-readable message |
| `amountCharged` | string | Amount charged (wei) |
| `nextChargeDate` | string | Next scheduled charge (ISO 8601) |

**Error Response**: `404 Not Found`
```json
{
  "error": "Subscription not found",
  "subscriptionId": "sub_invalid"
}
```

**Error Response**: `400 Bad Request`
```json
{
  "error": "Transaction failed",
  "details": "Insufficient balance",
  "txHash": "0x..."
}
```

**Example**:
```bash
curl -X PUT http://localhost:3000/api/subscription \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "sub_1234567890_0x09876..."
  }' | jq
```

---

### POST /api/execute

Execute blockchain transaction via relayer (meta-transaction).

**Request**:
```bash
POST /api/execute
Content-Type: application/json
```

**Request Body**:
```json
{
  "method": "take",
  "args": [
    "0x12cb26ea5d0b2a0874d6e2c78b1663d461e45a57...",
    {
      "noteId": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "merchant": "0x1234567890123456789012345678901234567890",
      "maxAmount": "120000000",
      "expiry": 1735689600,
      "nonce": 1234567890,
      "signature": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb..."
    },
    "0x1234567890123456789012345678901234567890",
    "10000000"
  ]
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | string | Yes | Contract method (`take` or `redeemToPublic`) |
| `args` | array | Yes | Method arguments |
| `args[0]` | string | Yes | ZK proof (hex) |
| `args[1]` | object | Yes | Permit structure |
| `args[2]` | address | Yes | Recipient address |
| `args[3]` | string | Yes | Amount to charge (wei) |

**Permit Structure**:
| Field | Type | Description |
|-------|------|-------------|
| `noteId` | bytes32 | User's shielded note identifier |
| `merchant` | address | Merchant's Ethereum address |
| `maxAmount` | string | Maximum allowed amount (wei) |
| `expiry` | number | Permit expiry timestamp (Unix seconds) |
| `nonce` | number | Unique nonce |
| `signature` | string | EIP-712 signature (65 bytes hex) |

**Response**: `200 OK`
```json
{
  "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "status": "success",
  "blockNumber": 12345678,
  "gasUsed": "355000"
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `txHash` | string | Transaction hash (bytes32) |
| `status` | string | Transaction status (`success`, `failed`) |
| `blockNumber` | number | Block number (optional) |
| `gasUsed` | string | Gas consumed (optional) |

**Error Response**: `500 Internal Server Error`
```json
{
  "error": "Transaction failed",
  "details": "execution reverted: permit expired",
  "timestamp": 1730476800000
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "method": "take",
    "args": [
      "0x12cb26ea...",
      {
        "noteId": "0xaaaa...",
        "merchant": "0x1234...",
        "maxAmount": "120000000",
        "expiry": 1735689600,
        "nonce": 1234567890,
        "signature": "0xbbbb..."
      },
      "0x1234567890123456789012345678901234567890",
      "10000000"
    ]
  }' | jq
```

---

## Authentication

**Current**: No authentication required (demo mode)

**Production**: Implement one of:
- **API Keys**: For server-to-server communication
- **JWT Tokens**: For user-authenticated requests
- **Signature-based**: Sign requests with Ethereum wallet

**Example (API Key)**:
```bash
curl -X POST http://localhost:3001/api/precomputes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{"noteId":"0x...","maxAmountUsd":"10.00"}'
```

**Example (JWT)**:
```bash
curl -X POST http://localhost:3001/api/precomputes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"noteId":"0x...","maxAmountUsd":"10.00"}'
```

---

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error message",
  "details": "Detailed error information (optional)",
  "code": "ERROR_CODE",
  "timestamp": 1730476800000
}
```

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (circuit failure, etc.) |
| 503 | Service Unavailable | Backend service down |

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_NOTE_ID` | Invalid noteId format | Ensure noteId is bytes32 hex string |
| `INVALID_AMOUNT` | Invalid amount value | Check amount is positive number |
| `CIRCUIT_ERROR` | ZK circuit constraint failed | Check witness generation logic |
| `PROOF_GENERATION_FAILED` | Barretenberg proving failed | Check Noir compilation and witness |
| `INVALID_SIGNATURE` | EIP-712 signature invalid | Re-sign permit with correct domain |
| `EXPIRED_PERMIT` | Permit has expired | Create new permit with future expiry |
| `SUBSCRIPTION_NOT_FOUND` | Subscription doesn't exist | Check subscription ID |
| `TRANSACTION_FAILED` | Blockchain transaction reverted | Check contract state and balances |

---

## Rate Limiting

### Current Limits (Demo)

**No rate limits** - For development and testing

### Production Limits (Recommended)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/precomputes` | 10 requests | per hour per IP |
| `POST /api/subscription` | 100 requests | per hour per user |
| `PUT /api/subscription` | 50 requests | per hour per user |
| `POST /api/execute` | 50 requests | per hour per IP |
| `GET /health` | Unlimited | - |

### Rate Limit Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1730480400
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded",
  "limit": 10,
  "window": "1 hour",
  "resetAt": "2024-11-01T12:00:00Z"
}
```

---

## Examples

### Complete Subscription Flow

#### 1. Generate Precomputes

```bash
curl -X POST http://localhost:3001/api/precomputes \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "maxAmountUsd": "120.00"
  }' > precomputes.json

# Extract first proof
PROOF=$(jq -r '.precomputes[0].proof' precomputes.json)
PUBLIC_INPUTS=$(jq -c '.precomputes[0].publicInputs' precomputes.json)
```

#### 2. Sign EIP-712 Permit (MetaMask)

```javascript
const domain = {
  name: "Bermuda X402",
  version: "1",
  chainId: 31337,
  verifyingContract: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
};

const types = {
  Permit: [
    { name: "noteId", type: "bytes32" },
    { name: "merchant", type: "address" },
    { name: "maxAmount", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ]
};

const message = {
  noteId: "0xaaaa...",
  merchant: "0x1234...",
  maxAmount: "120000000",
  expiry: 1735689600,
  nonce: 1234567890
};

const signature = await signer.signTypedData(domain, types, message);
```

#### 3. Create Subscription

```bash
curl -X POST http://localhost:3000/api/subscription \
  -H "Content-Type: application/json" \
  -d '{
    "merchantName": "Subscription Service",
    "merchantAddress": "0x1234567890123456789012345678901234567890",
    "userAddress": "0x0987654321098765432109876543210987654321",
    "amount": "10000000",
    "interval": "monthly",
    "noteId": "0xaaaa...",
    "permitSignature": "'$SIGNATURE'",
    "maxAmount": "120000000",
    "expiry": 1735689600,
    "nonce": 1234567890,
    "proof": "'$PROOF'",
    "publicInputs": '$PUBLIC_INPUTS'
  }' > subscription.json

# Extract subscription ID
SUB_ID=$(jq -r '.subscriptionId' subscription.json)
```

#### 4. Charge Subscription

```bash
curl -X PUT http://localhost:3000/api/subscription \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "'$SUB_ID'"
  }' | jq
```

### Testing Script

```bash
#!/bin/bash

# Complete end-to-end test
set -e

NOTE_ID="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
USER_ADDR="0x0987654321098765432109876543210987654321"
MERCHANT_ADDR="0x1234567890123456789012345678901234567890"

echo "1. Generating precomputes..."
curl -s -X POST http://localhost:3001/api/precomputes \
  -H "Content-Type: application/json" \
  -d "{\"noteId\":\"$NOTE_ID\",\"maxAmountUsd\":\"10.00\"}" \
  | jq -r 'if .error then error(.error) else "✅ Generated " + (.stats.total | tostring) + " proofs" end'

echo -e "\n2. Health check..."
curl -s http://localhost:3001/health \
  | jq -r 'if .status == "ok" then "✅ Backend healthy" else error("Backend unhealthy") end'

echo -e "\n✅ All tests passed!"
```

---

## WebSocket API (Future)

**Planned for v2.0**:

### Subscribe to Subscription Events

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    subscriptionId: 'sub_1234567890_0x09876...'
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  switch (event.type) {
    case 'charged':
      console.log('Payment charged:', event.txHash);
      break;
    case 'failed':
      console.log('Payment failed:', event.error);
      break;
    case 'upcoming':
      console.log('Payment upcoming:', event.date);
      break;
  }
});
```

---

## SDKs (Future)

### JavaScript/TypeScript SDK

```typescript
import { X402Client } from '@bermudabay/x402-sdk';

const client = new X402Client({
  backendUrl: 'http://localhost:3001',
  adapterAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
});

// Generate precomputes
const precomputes = await client.generatePrecomputes({
  noteId: '0xaaaa...',
  maxAmountUsd: '120.00'
});

// Create subscription
const subscription = await client.createSubscription({
  merchant: '0x1234...',
  amount: '10000000',
  interval: 'monthly',
  precomputes: precomputes[0]
});

// Charge subscription
const tx = await client.chargeSubscription(subscription.id);
```

---

## Versioning

API follows [Semantic Versioning](https://semver.org/):
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

**Current Version**: `1.0.0`

**Version Header**:
```
X-API-Version: 1.0.0
```

---

## Support

For API questions or issues:
- **GitHub Issues**: [github.com/BermudaBay/baanx/issues](https://github.com/BermudaBay/baanx/issues)
- **Discord**: [discord.gg/bermudabay](https://discord.gg/bermudabay)
- **Email**: api-support@bermudabay.io

---

**Last Updated**: November 1, 2024

