# PPOI Compliance Architecture: Self Protocol + Blockaid Integration

## Executive Summary

This document describes the **Privacy-Preserving Origin Inspection (PPOI)** compliance system that combines **Self Protocol** (identity verification) and **Blockaid** (address screening) to enable compliant privacy-preserving deposits while maintaining regulatory compliance.

**Key Innovation:** Funds are cryptographically bound to compliance verification results, enabling segregated liquidity pools based on compliance status without compromising user privacy.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Compliance Flow](#compliance-flow)
4. [Segregated Pool Model](#segregated-pool-model)
5. [Technical Implementation](#technical-implementation)
6. [Configuration Options](#configuration-options)
7. [Business Rules](#business-rules)
8. [API Reference](#api-reference)
9. [Security Considerations](#security-considerations)

---

## Overview

### What is PPOI?

**Privacy-Preserving Origin Inspection (PPOI)** is a compliance framework that:

- ✅ **Verifies user identity** using Self Protocol (ZK proofs from government IDs)
- ✅ **Screens addresses** using Blockaid (OFAC, sanctions, malicious activity)
- ✅ **Cryptographically binds** compliance data to UTXO commitments
- ✅ **Segregates funds** based on compliance status (Main Pool vs Quarantine Pool)
- ✅ **Preserves privacy** using zero-knowledge proofs

### Why Two Compliance Layers?

1. **Self Protocol (Identity Layer)**
   - **What:** Proves user identity attributes (humanity, age, nationality)
   - **How:** ZK-SNARKs generated from government-issued IDs
   - **Purpose:** Sybil resistance, age gating, geographic compliance
   - **Privacy:** User never reveals full identity, only proves attributes

2. **Blockaid (Address Layer)**
   - **What:** Scans blockchain addresses for compliance risks
   - **How:** Real-time API calls checking OFAC, sanctions lists, malicious activity
   - **Purpose:** Prevents interaction with sanctioned/bad actors
   - **Privacy:** Address screening happens before deposit

### The Innovation: Segregated Liquidity Pools

**Traditional Approach:**
- ❌ All funds in one pool (compliant + non-compliant mixed)
- ❌ Regulatory risk
- ❌ No way to segregate risky deposits

**PPOI Approach:**
- ✅ **Main Pool:** Fully compliant deposits (can be mixed)
- ✅ **Quarantine Pool:** Non-compliant deposits (isolated, withdrawal restrictions)
- ✅ **Cryptographic Proof:** Pool eligibility encoded in UTXO commitment

---

## Architecture Components

### 1. Self Protocol Integration

**Purpose:** Identity verification using zero-knowledge proofs

**Capabilities:**
- **Humanity Proof:** Proves user is human (Sybil resistance)
- **Age Verification:** Proves user is 18+ (age gating)
- **Nationality Check:** Proves geographic compliance (OFAC exclusions)

**Technical Details:**
- **SDK:** `@selfxyz/core` (backend verification)
- **QR Code:** `@selfxyz/qrcode` (desktop-to-mobile handoff)
- **Proof Format:** ZK-SNARKs from government-issued IDs
- **Mobile App:** Self Protocol mobile app generates proofs

**Flow:**
1. User scans QR code on desktop
2. Mobile app generates ZK proof from ID
3. Proof sent to backend callback URL
4. Backend verifies proof using Self Protocol SDK
5. Verification result sent to frontend via WebSocket

**Configuration:**
- **Single Selection Only:** Mobile app limitation (one proof type at a time)
- **Options:** Humanity, Age (18+), Nationality
- **Location:** Advanced Configuration panel (radio buttons)

### 2. Blockaid Integration

**Purpose:** Address-based compliance screening

**Capabilities:**
- **OFAC Sanctions Check:** Verifies address not on sanctions list
- **Malicious Activity Check:** Detects known bad actors
- **Token Safety Check:** Validates token security
- **Phishing/Scam Check:** Identifies phishing attempts
- **Trust Level Check:** Validates address trustworthiness
- **Contract Verification Check:** Ensures contracts are verified
- **Address Age Check:** Validates address history (1-12 months threshold)
- **Verification Status:** Checks address verification status

**Technical Details:**
- **API:** `https://api.blockaid.io/v0/evm/address/scan`
- **Authentication:** API Key (`X-API-Key` header)
- **Response:** Risk score (0-100), risk level (LOW/MEDIUM/HIGH/CRITICAL), detailed checks

**Configuration:**
- **8 Parameters:** All toggleable in Advanced Configuration
- **Address Age Threshold:** Slider (1-12 months)
- **Customizable:** Enable/disable individual checks

### 3. PPOI Note Encoding

**Purpose:** Cryptographically bind compliance data to UTXO

**Technical Details:**
- **Format:** JSON string encoded into UTXO note field
- **Structure:**
  ```json
  {
    "timestamp": 1699999999999,
    "address": "0x...",
    "poolEligibility": "main" | "quarantine",
    "verifications": [
      {
        "type": "blockaid",
        "passed": true | false,
        "riskScore": 0-100,
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "poolEligibility": "main" | "quarantine",
        "checks": [...]
      },
      {
        "type": "self",
        "verificationType": "humanity" | "age" | "nationality",
        "checks": [...]
      }
    ]
  }
  ```
- **Commitment:** UTXO commitment regenerated with PPOI note included
- **Privacy:** Note data not visible on-chain (only commitment hash)

### 4. Zero-Knowledge Proof Generation

**Purpose:** Prove UTXO validity without revealing compliance data

**Technical Details:**
- **Circuit:** Barretenberg in-browser ZK proof generation
- **SDK:** `bermuda-bay-sdk` (git submodule)
- **Inputs:** UTXO commitment, nullifier, public key
- **Output:** ZK proof + public inputs
- **Performance:** ~2-5 seconds in browser

---

## Compliance Flow

### Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Connect Wallet                                          │
│ • MetaMask wallet connection                                    │
│ • User address extraction                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Create Deposit                                          │
│ • Generate shielded address (UTXO)                              │
│ • Create deposit commitment                                     │
│ • Store deposit data                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3a: Blockaid Verification (Optional)                       │
│ • Scan address: https://api.blockaid.io/v0/evm/address/scan   │
│ • Filter checks based on configuration                          │
│ • Determine pool eligibility:                                   │
│   - ALL PASS (no warnings, no failures) → MAIN POOL ✅         │
│   - ANY WARNING or FAILURE → QUARANTINE POOL ⚠️                │
│ • Store compliance data                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3b: Self Protocol Verification (Optional)                  │
│ • Generate QR code (desktop-to-mobile handoff)                  │
│ • User scans with Self Protocol mobile app                      │
│ • Mobile app generates ZK proof from government ID              │
│ • Proof sent to backend callback URL                            │
│ • Backend verifies proof using @selfxyz/core                    │
│ • Result sent to frontend via WebSocket                         │
│ • Store verification data                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3c: Attach PPOI Note                                       │
│ • Encode compliance data into UTXO note field                    │
│ • Format: JSON with poolEligibility, verifications              │
│ • Regenerate UTXO commitment with PPOI note                    │
│ • Store updated deposit data                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Generate ZK Proof                                       │
│ • Use Barretenberg circuit in browser                           │
│ • Prove UTXO commitment validity                                 │
│ • Include PPOI note in commitment                               │
│ • Generate proof + public inputs                                │
│ • Store proof data                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Submit Transaction                                      │
│ • Submit ZK proof to smart contract                             │
│ • Deposit funds into appropriate pool:                          │
│   - MAIN POOL: Mixed with compliant funds ✅                    │
│   - QUARANTINE POOL: Segregated, withdrawal restrictions ⚠️     │
│ • Transaction confirmed on-chain                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Segregated Pool Model

### Pool Eligibility Rules

| Compliance Status | Main Pool | Quarantine Pool | Withdrawal Restrictions |
|------------------|-----------|-----------------|------------------------|
| **All Checks PASS** (no warnings) | ✅ YES | ❌ NO | None |
| **Any WARNING** (e.g., new address) | ❌ NO | ✅ YES | Original address only |
| **Any FAILURE** (e.g., OFAC banned) | ❌ NO | ✅ YES | Original address only |

### Pool Eligibility Logic

**Main Pool (Green):**
- ✅ **Condition:** `complianceData.passed === true`
  - All Blockaid checks: `PASS` status
  - Zero `WARNING` statuses
  - Zero `FAIL` statuses
- ✅ **Benefits:**
  - Funds can be mixed with other compliant deposits
  - No withdrawal restrictions
  - Full liquidity access

**Quarantine Pool (Orange):**
- ⚠️ **Condition:** `complianceData.passed === false`
  - Any Blockaid check: `WARNING` or `FAIL` status
- ⚠️ **Restrictions:**
  - Funds segregated from compliant deposits
  - **Withdrawal:** Only to original deposit address
  - Cannot be mingled with Main Pool funds

### Risk Score Calculation

**Blockaid Risk Levels:**

| Risk Score | Risk Level | Pool Eligibility |
|------------|-----------|------------------|
| 0-19 | LOW | Main Pool (if no warnings) |
| 20-49 | LOW | Quarantine Pool (warnings present) |
| 50-79 | MEDIUM | Quarantine Pool |
| 80-99 | HIGH | Quarantine Pool |
| 100 | CRITICAL | Quarantine Pool |

**Example Scenarios:**

1. **Fresh Address (No History):**
   - Trust Level Check: ⚠️ WARNING
   - Address Age Check: ⚠️ WARNING
   - Risk Score: 50 (MEDIUM)
   - **Result:** Quarantine Pool ⚠️

2. **OFAC Sanctioned Address:**
   - OFAC Sanctions Check: ❌ FAIL
   - Risk Score: 100 (CRITICAL)
   - **Result:** Quarantine Pool ❌

3. **Established, Verified Address:**
   - All 8 checks: ✅ PASS
   - Risk Score: 0 (LOW)
   - **Result:** Main Pool ✅

---

## Technical Implementation

### Frontend Architecture

**Tech Stack:**
- **Framework:** React + TypeScript
- **Build Tool:** Vite
- **ZK Proofs:** Barretenberg (in-browser)
- **WebSocket:** Real-time verification updates

**Key Files:**
- `PPOIFlowDemo.tsx` - Main component orchestrating flow
- `services/blockaid.ts` - Blockaid API integration
- `services/self.ts` - Self Protocol integration

### Backend Architecture

**Tech Stack:**
- **Runtime:** Node.js + Express
- **WebSocket:** `ws` package for real-time updates
- **SDK:** `@selfxyz/core` for proof verification

**Key Files:**
- `backend/mock-server.js` - Self Protocol callback handler
- Endpoints:
  - `POST /api/self-callback` - Receives proofs from mobile app
  - `GET /health` - Health check
  - `WebSocket ws://localhost:3001` - Real-time updates

### Configuration System

**Environment Variables:**
```bash
# Blockaid API Key (Required)
VITE_BLOCKAID_API_KEY=your-api-key-here

# Self Protocol Callback URL (Required for mobile verification)
VITE_SELF_CALLBACK_URL=https://your-tunnel-url.com/api/self-callback
```

**Advanced Configuration Panel:**
- **Blockaid:** 8 toggleable checks + address age threshold slider
- **Self Protocol:** 3 radio button options (single selection)

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User Action: Verify Address (Blockaid)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend: handleVerifyBlockaid()                            │
│ • Call blockaidService.checkCompliance(address)            │
│ • Filter checks based on blockaidConfig                     │
│ • Calculate pool eligibility                                │
│ • Store complianceData                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ User Action: Verify Identity (Self Protocol)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend: handleVerifySelf()                                │
│ • Generate QR code with deep link                           │
│ • User scans with mobile app                                │
│ • Mobile app generates proof                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: POST /api/self-callback                            │
│ • Receive proof from mobile app                             │
│ • Verify proof using @selfxyz/core                          │
│ • Send result to frontend via WebSocket                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend: handleAttachPPOINote()                            │
│ • Combine Blockaid + Self data                              │
│ • Encode into UTXO note field                               │
│ • Regenerate commitment                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration Options

### Blockaid Configuration (8 Parameters)

All checks are toggleable in the Advanced Configuration panel:

1. **OFAC Sanctions Check** ✅
   - Critical security check
   - Checks against OFAC sanctions list

2. **Malicious Activity Check** ✅
   - Detects known bad actors
   - Flags addresses with recorded malicious activity

3. **Token Safety Check** ✅
   - Validates token security
   - Flags malicious tokens

4. **Phishing/Scam Check** ✅
   - Identifies phishing attempts
   - Detects address poisoning

5. **Trust Level Check** ✅
   - Validates address trustworthiness
   - Checks for untrusted EOA/contracts

6. **Contract Verification Check** ✅
   - Ensures contracts are verified
   - Flags unverified contracts

7. **Address Age Check** ✅
   - Validates address history
   - **Threshold:** 1-12 months (slider)
   - Flags addresses younger than threshold

8. **Verification Status** ✅
   - Checks address verification status
   - Validates trusted/verified addresses

### Self Protocol Configuration (3 Options)

**Single Selection Only** (radio buttons):

1. **Humanity Proof** 👤
   - Proves user is human
   - Sybil resistance

2. **Age Verification** 📅
   - Proves user is 18+
   - Age gating compliance

3. **Nationality Check** 🌍
   - Proves geographic compliance
   - OFAC exclusions (KP, IR, SY)

**Note:** Mobile app limitation - only one proof type can be generated at a time.

---

## Business Rules

### Rule 1: Always Attach Compliance Data

**Rule:** Compliance verification results are **ALWAYS** attached to the PPOI note, regardless of pass/fail status.

**Rationale:**
- Transparency for auditors
- Cryptographic proof of compliance screening
- Enables segregated pool logic

**Implementation:**
- Even if Blockaid checks fail → PPOI note still attached
- Pool eligibility determines fund segregation, not deposit blocking

### Rule 2: Strict Pool Eligibility

**Rule:** Only **fully clean addresses** (zero warnings, zero failures) go to Main Pool.

**Rationale:**
- Maximum protection for compliant users
- Clear separation of compliant vs. non-compliant funds
- Regulatory compliance

**Implementation:**
```typescript
const isFullyClean = failCount === 0 && warningCount === 0
passed = isFullyClean  // Only true if ZERO warnings AND ZERO failures
```

### Rule 3: Quarantine Pool Withdrawal Restrictions

**Rule:** Funds in Quarantine Pool can **only be withdrawn to the original deposit address**.

**Rationale:**
- Prevents mixing of non-compliant funds
- Maintains audit trail
- Regulatory compliance

**Implementation:**
- Pool eligibility encoded in PPOI note
- Smart contract enforces withdrawal restrictions
- Original address stored in UTXO commitment

### Rule 4: Optional Compliance Layers

**Rule:** Both Blockaid and Self Protocol are **optional** but at least one is recommended.

**Rationale:**
- Flexibility for different use cases
- Blockaid-only for address screening
- Self Protocol-only for identity verification
- Both for maximum compliance

**Implementation:**
- Toggle switches in Compliance Configuration panel
- Warning if both disabled
- Flow adapts based on enabled options

---

## API Reference

### Blockaid API

**Endpoint:** `POST https://api.blockaid.io/v0/evm/address/scan`

**Headers:**
```
X-API-Key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "metadata": {
    "source": "web",
    "origin": "https://your-app.com",
    "account": "0x...",
    "connection": {
      "type": "wallet",
      "name": "your-app",
      "user_agent": "..."
    },
    "domain": "your-app.com"
  },
  "chain": "ethereum",
  "address": "0x..."
}
```

**Response:**
```json
{
  "result_type": "Benign" | "Warning" | "Malicious",
  "address": "0x...",
  "chain": "ethereum",
  "features": [
    {
      "type": "Malicious" | "Warning" | "Benign" | "Info",
      "feature_id": "OFAC_BANNED_ADDRESS",
      "description": "..."
    }
  ]
}
```

### Self Protocol API

**Callback Endpoint:** `POST {VITE_SELF_CALLBACK_URL}/api/self-callback`

**Request Body (from mobile app):**
```json
{
  "attestationId": "...",
  "proof": "...",
  "publicSignals": "...",
  "userContextData": "..."  // Contains sessionId (UUID)
}
```

**Response:**
```json
{
  "status": "success",
  "result": true,
  "verificationType": "humanity" | "age" | "nationality",
  "checks": [
    {
      "name": "Identity Verification",
      "status": "PASS",
      "description": "✅ Real ZK proof verified successfully"
    }
  ],
  "recommendations": ["✅ Identity verification passed"]
}
```

---

## Security Considerations

### Privacy Preservation

1. **UTXO Commitment:** Compliance data encoded in note, not visible on-chain
2. **ZK Proofs:** Prove validity without revealing compliance details
3. **Self Protocol:** Identity attributes proven, not revealed
4. **No Data Leakage:** Only commitment hashes visible on-chain

### Compliance Enforcement

1. **Cryptographic Binding:** Compliance data bound to UTXO commitment
2. **Immutable:** Cannot be altered after deposit
3. **Auditable:** Compliance data recoverable from note
4. **Enforced:** Smart contract enforces pool segregation

### Risk Mitigation

1. **Segregation:** Non-compliant funds isolated in Quarantine Pool
2. **Withdrawal Restrictions:** Quarantine Pool funds can only return to original address
3. **Real-time Screening:** Blockaid checks happen before deposit
4. **Identity Verification:** Self Protocol prevents Sybil attacks

### API Security

1. **API Keys:** Blockaid API key stored in environment variables
2. **Callback URLs:** Self Protocol callback requires public URL (tunnel)
3. **WebSocket:** Local WebSocket for real-time updates (no public exposure)
4. **HTTPS:** All API calls over HTTPS

---

## Summary

### Key Takeaways

1. **Two Compliance Layers:**
   - **Self Protocol:** Identity verification (humanity, age, nationality)
   - **Blockaid:** Address screening (OFAC, sanctions, malicious activity)

2. **Segregated Pools:**
   - **Main Pool:** Fully compliant deposits (can be mixed)
   - **Quarantine Pool:** Non-compliant deposits (isolated, withdrawal restrictions)

3. **Privacy-Preserving:**
   - Compliance data encoded in UTXO note (not visible on-chain)
   - ZK proofs prove validity without revealing details

4. **Configurable:**
   - 8 Blockaid parameters (toggleable)
   - 3 Self Protocol options (single selection)
   - Address age threshold (1-12 months)

5. **Complete Flow:**
   - Connect Wallet → Create Deposit → Verify (Blockaid + Self) → Attach Note → Generate Proof → Submit Transaction

### For Engineers

- **Tech Stack:** React + TypeScript, Node.js, Barretenberg, Self Protocol SDK, Blockaid API
- **Key Files:** `PPOIFlowDemo.tsx`, `services/blockaid.ts`, `services/self.ts`, `backend/mock-server.js`
- **Dependencies:** `@selfxyz/core`, `@selfxyz/qrcode`, `bermuda-bay-sdk` (submodule)
- **Environment:** `VITE_BLOCKAID_API_KEY`, `VITE_SELF_CALLBACK_URL`

### For Product Managers

- **Business Value:** Regulatory compliance + privacy preservation
- **User Experience:** Simple toggle-based configuration, clear pool eligibility messaging
- **Risk Mitigation:** Segregated funds, withdrawal restrictions for non-compliant deposits
- **Scalability:** Real-time API calls, in-browser ZK proof generation

---

## Appendix

### Glossary

- **PPOI:** Privacy-Preserving Origin Inspection
- **UTXO:** Unspent Transaction Output
- **ZK-SNARK:** Zero-Knowledge Succinct Non-Interactive Argument of Knowledge
- **OFAC:** Office of Foreign Assets Control
- **EOA:** Externally Owned Account
- **Main Pool:** Compliant deposit pool (can be mixed)
- **Quarantine Pool:** Non-compliant deposit pool (isolated)

### Resources

- **Self Protocol:** https://self.xyz
- **Blockaid:** https://blockaid.io
- **PPOI Demo:** https://github.com/0x2kNJ/PPOI-test
- **ZK Proofs:** Barretenberg documentation

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** PPOI Team

