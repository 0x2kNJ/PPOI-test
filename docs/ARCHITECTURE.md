# PPOI Demo Architecture

## System Overview

This demo implements a Privacy-Preserving Origin Inspection (PPOI) system that combines:
- Identity verification (Self Protocol)
- Address screening (Blockaid)
- Zero-knowledge proofs (Barretenberg)

## Component Breakdown

### Frontend (`ui/`)

**Technology:** React 18 + Vite + TypeScript

**Key Files:**
- `PPOIFlowDemo.tsx` - Main orchestration component
- `blockaid.ts` - Blockaid API client
- `self.ts` - Self Protocol integration

**Responsibilities:**
1. Wallet connection (MetaMask/Web3)
2. UTXO creation and commitment generation
3. QR code generation for mobile handoff
4. WebSocket client for real-time updates
5. UI state management for multi-step flow

### Backend (`backend/`)

**Technology:** Express + WebSocket (ws library)

**Key File:**
- `mock-server.js` - Single-file server

**Responsibilities:**
1. HTTP endpoint for Self Protocol callback
2. WebSocket server for real-time frontend updates
3. Session ID mapping (mobile → frontend)
4. Mock verification responses (for demo purposes)

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INITIATES VERIFICATION                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 2. FRONTEND                                                      │
│    - Generates QR code with unique sessionId                     │
│    - Opens WebSocket connection                                  │
│    - Registers sessionId with backend                            │
│    - Displays QR code to user                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 3. MOBILE APP (Self Protocol)                                   │
│    - Scans QR code                                               │
│    - Extracts endpoint + sessionId                               │
│    - Generates zero-knowledge proof from ID                      │
│    - POSTs proof to backend endpoint                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 4. BACKEND                                                       │
│    - Receives HTTP POST with proof                               │
│    - Extracts sessionId from userContextData                     │
│    - (Mock) validates proof                                      │
│    - Looks up WebSocket client by sessionId                      │
│    - Sends result to frontend via WebSocket                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 5. FRONTEND (WebSocket Client)                                  │
│    - Receives verification result                                │
│    - Matches sessionId                                           │
│    - Calls onSuccess callback                                    │
│    - Updates UI                                                  │
│    - Hides QR code, shows success                                │
└─────────────────────────────────────────────────────────────────┘
```

## PPOI Note Structure

### Format
JSON object encoded as UTF-8 bytes, attached to UTXO's `note` field.

### Schema
```typescript
interface PPOINote {
  timestamp: number;
  address: string;
  verifications: Array<{
    type: 'blockaid' | 'self';
    // Blockaid-specific
    riskScore?: number;
    riskLevel?: string;
    // Self Protocol-specific
    verificationType?: string;
    proofReference?: string; // First 32 bytes of proof
    // Common
    checks: Array<{
      name: string;
      status: 'PASS' | 'FAIL' | 'INFO';
    }>;
  }>;
}
```

### Example
```json
{
  "timestamp": 1704067200000,
  "address": "0xeb079a1593d0499a3bcbd56d23eef8102a5d5807",
  "verifications": [
    {
      "type": "blockaid",
      "riskScore": 0,
      "riskLevel": "LOW",
      "checks": [
        {"name": "OFAC Sanctions", "status": "PASS"},
        {"name": "Malicious Activity", "status": "PASS"}
      ]
    },
    {
      "type": "self",
      "verificationType": "humanity",
      "proofReference": "0x1f4e2a...3b5c",
      "checks": [
        {"name": "Humanity Check", "status": "PASS"},
        {"name": "Age Verification", "status": "PASS"}
      ]
    }
  ]
}
```

## Session ID Handling

### Problem
Self Protocol encodes the `userId` (our sessionId) in hex format within `userContextData`.

**Frontend generates:**
```
sessionId: "350bf862-88b6-4d22-a03c-249d033cb80e"
```

**Backend receives:**
```
userContextData: "000000000000000000000000000000000000000000000000000000000000a4ec00000000000000000000000000000000350bf86288b64d22a03c249d033cb80e"
```

### Solution
Extract the last 32 hex characters and reconstruct UUID:

```javascript
const hex = userContextData.replace(/^0+/, '');
const uuidHex = hex.slice(-32);
const sessionId = `${uuidHex.slice(0,8)}-${uuidHex.slice(8,12)}-${uuidHex.slice(12,16)}-${uuidHex.slice(16,20)}-${uuidHex.slice(20,32)}`;
```

## WebSocket Protocol

### Client → Server

**Registration:**
```json
{
  "type": "register",
  "sessionId": "350bf862-88b6-4d22-a03c-249d033cb80e"
}
```

### Server → Client

**Registration Confirmation:**
```json
{
  "type": "status",
  "status": "registered",
  "sessionId": "350bf862-88b6-4d22-a03c-249d033cb80e"
}
```

**Verification Result:**
```json
{
  "type": "verification_result",
  "sessionId": "350bf862-88b6-4d22-a03c-249d033cb80e",
  "status": "success",
  "result": true,
  "verificationType": "humanity",
  "checks": [...],
  "recommendations": [...]
}
```

## Security Model

### Current Implementation (Demo)
- ❌ No authentication
- ❌ No proof validation
- ❌ No rate limiting
- ❌ Mock responses always succeed
- ❌ Logs contain sensitive data

### Production Requirements
1. **Backend Verification**
   - Use Self Protocol's `SelfBackendVerifier`
   - Validate cryptographic proofs
   - Verify proof parameters match request

2. **WebSocket Security**
   - Use `wss://` (secure WebSocket)
   - Implement authentication tokens
   - Add connection timeouts
   - Rate limit connections per IP

3. **Data Protection**
   - Never log proofs or private keys
   - Encrypt sensitive data at rest
   - Use HTTPS for all endpoints
   - Implement CORS properly

4. **Denial of Service Protection**
   - Rate limit all endpoints
   - Implement request validation
   - Add WebSocket connection limits
   - Use load balancing for scale

## Technology Choices

### Why React + Vite?
- Fast dev server with HMR
- TypeScript support out of box
- Modern build tooling
- Small bundle sizes

### Why Express for Backend?
- Minimal, unopinionated
- Easy to integrate WebSocket
- Well-documented
- Production-ready with proper setup

### Why WebSocket vs. Polling?
- Instant updates (no latency)
- Lower server load
- Better user experience
- Bi-directional communication

### Why Cloudflare Tunnel?
- Free, no account needed
- Quick to set up
- Handles HTTPS automatically
- Good for demos/testing
- Note: Doesn't support WebSocket (hence localhost WS)

## Performance Considerations

### Frontend
- QR code generation: ~50ms
- WebSocket connection: ~100ms
- UTXO creation: ~200ms
- UI rendering: <16ms (60fps)

### Backend
- HTTP endpoint response: ~1000ms (artificial delay for demo)
- WebSocket message routing: <10ms
- Session lookup: O(1) via Map

### Network
- QR code image: ~10KB
- WebSocket messages: <1KB
- HTTP callback payload: ~5-10KB (includes proof)

## Scalability

### Current Limits
- Single-threaded Node.js server
- In-memory session storage
- No horizontal scaling

### Production Scaling
1. Use Redis for session storage
2. Deploy multiple backend instances
3. Use WebSocket-aware load balancer
4. Implement sticky sessions
5. Add message queue for proof processing
6. Cache verification results

## Error Handling

### Frontend
- Network failures: Show error, keep QR visible
- WebSocket disconnect: Show manual completion button
- Invalid proof: Display error details
- Timeout: Allow retry

### Backend
- Invalid proof: Return 400 with details
- Session not found: Log warning, return success (degraded mode)
- WebSocket send failure: Log error, continue

## Future Improvements

1. **Multi-Chain Support** - Currently Ethereum-only
2. **Batch Verification** - Verify multiple addresses at once
3. **Caching** - Cache Blockaid results (24h TTL)
4. **Analytics** - Track verification success rates
5. **Testing** - Add unit and integration tests
6. **Mobile UI** - Responsive design for phone browsers
7. **Internationalization** - Multi-language support

