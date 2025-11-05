# PPOI Compliance Architecture: Executive Summary

## Overview

**Privacy-Preserving Origin Inspection (PPOI)** is a compliance framework that combines **Self Protocol** (identity verification) and **Blockaid** (address screening) to enable compliant privacy-preserving deposits while maintaining regulatory compliance.

---

## Key Innovation: Segregated Liquidity Pools

### Traditional Approach ❌
- All funds in one pool (compliant + non-compliant mixed)
- Regulatory risk
- No way to segregate risky deposits

### PPOI Approach ✅
- **Main Pool:** Fully compliant deposits (can be mixed)
- **Quarantine Pool:** Non-compliant deposits (isolated, withdrawal restrictions)
- **Cryptographic Proof:** Pool eligibility encoded in UTXO commitment

---

## Two Compliance Layers

### 1. Self Protocol (Identity Verification) 👤
- **What:** Proves user identity attributes (humanity, age, nationality)
- **How:** ZK-SNARKs generated from government-issued IDs
- **Purpose:** Sybil resistance, age gating, geographic compliance
- **Privacy:** User never reveals full identity, only proves attributes

### 2. Blockaid (Address Screening) 🛡️
- **What:** Scans blockchain addresses for compliance risks
- **How:** Real-time API calls checking OFAC, sanctions lists, malicious activity
- **Purpose:** Prevents interaction with sanctioned/bad actors
- **Privacy:** Address screening happens before deposit

---

## Complete Flow

```
1. Connect Wallet
   ↓
2. Create Deposit (UTXO)
   ↓
3a. Blockaid Verification (Optional)
   • Scan address for compliance
   • Determine pool eligibility
   ↓
3b. Self Protocol Verification (Optional)
   • Generate QR code
   • User scans with mobile app
   • Mobile app generates ZK proof
   • Backend verifies proof
   ↓
3c. Attach PPOI Note
   • Encode compliance data into UTXO
   • Regenerate commitment
   ↓
4. Generate ZK Proof
   • Prove UTXO validity
   • Include PPOI note in commitment
   ↓
5. Submit Transaction
   • Deposit into Main Pool or Quarantine Pool
   • Transaction confirmed on-chain
```

---

## Pool Eligibility Rules

| Compliance Status | Main Pool | Quarantine Pool | Withdrawal Restrictions |
|------------------|-----------|-----------------|------------------------|
| **All Checks PASS** (no warnings) | ✅ YES | ❌ NO | None |
| **Any WARNING** (e.g., new address) | ❌ NO | ✅ YES | Original address only |
| **Any FAILURE** (e.g., OFAC banned) | ❌ NO | ✅ YES | Original address only |

**Rule:** Only **fully clean addresses** (zero warnings, zero failures) go to Main Pool.

---

## Configuration Options

### Blockaid (8 Parameters)
All toggleable in Advanced Configuration:
1. OFAC Sanctions Check
2. Malicious Activity Check
3. Token Safety Check
4. Phishing/Scam Check
5. Trust Level Check
6. Contract Verification Check
7. Address Age Check (1-12 months threshold)
8. Verification Status

### Self Protocol (3 Options)
Single selection only (radio buttons):
1. Humanity Proof
2. Age Verification (18+)
3. Nationality Check

---

## Business Rules

### Rule 1: Always Attach Compliance Data
- Compliance results **ALWAYS** attached to PPOI note (pass or fail)
- Pool eligibility determines fund segregation, not deposit blocking

### Rule 2: Strict Pool Eligibility
- Only **fully clean addresses** (zero warnings, zero failures) go to Main Pool
- Any warning or failure = automatic Quarantine Pool

### Rule 3: Quarantine Pool Restrictions
- Funds in Quarantine Pool can **only be withdrawn to original deposit address**
- Prevents mixing of non-compliant funds
- Maintains audit trail

### Rule 4: Optional Compliance Layers
- Both Blockaid and Self Protocol are **optional**
- At least one is recommended
- Flow adapts based on enabled options

---

## Technical Stack

### Frontend
- **Framework:** React + TypeScript
- **Build Tool:** Vite
- **ZK Proofs:** Barretenberg (in-browser)
- **WebSocket:** Real-time verification updates

### Backend
- **Runtime:** Node.js + Express
- **WebSocket:** `ws` package for real-time updates
- **SDK:** `@selfxyz/core` for proof verification

### APIs
- **Blockaid:** `https://api.blockaid.io/v0/evm/address/scan`
- **Self Protocol:** Mobile app callback URL

---

## Security & Privacy

### Privacy Preservation
- ✅ Compliance data encoded in UTXO note (not visible on-chain)
- ✅ ZK proofs prove validity without revealing details
- ✅ Identity attributes proven, not revealed
- ✅ Only commitment hashes visible on-chain

### Compliance Enforcement
- ✅ Cryptographic binding (compliance data bound to UTXO)
- ✅ Immutable (cannot be altered after deposit)
- ✅ Auditable (compliance data recoverable from note)
- ✅ Enforced (smart contract enforces pool segregation)

### Risk Mitigation
- ✅ Segregation (non-compliant funds isolated)
- ✅ Withdrawal restrictions (Quarantine Pool funds can only return to original address)
- ✅ Real-time screening (Blockaid checks happen before deposit)
- ✅ Identity verification (Self Protocol prevents Sybil attacks)

---

## Key Takeaways

1. **Two Compliance Layers:** Self Protocol (identity) + Blockaid (address)
2. **Segregated Pools:** Main Pool (compliant) vs. Quarantine Pool (non-compliant)
3. **Privacy-Preserving:** Compliance data encoded in UTXO note (not visible on-chain)
4. **Configurable:** 8 Blockaid parameters + 3 Self Protocol options
5. **Complete Flow:** Connect → Deposit → Verify → Attach Note → Generate Proof → Submit

---

## For Product Managers

- **Business Value:** Regulatory compliance + privacy preservation
- **User Experience:** Simple toggle-based configuration, clear pool eligibility messaging
- **Risk Mitigation:** Segregated funds, withdrawal restrictions for non-compliant deposits
- **Scalability:** Real-time API calls, in-browser ZK proof generation

## For Engineers

- **Tech Stack:** React + TypeScript, Node.js, Barretenberg, Self Protocol SDK, Blockaid API
- **Key Files:** `PPOIFlowDemo.tsx`, `services/blockaid.ts`, `services/self.ts`, `backend/mock-server.js`
- **Dependencies:** `@selfxyz/core`, `@selfxyz/qrcode`, `bermuda-bay-sdk` (submodule)
- **Environment:** `VITE_BLOCKAID_API_KEY`, `VITE_SELF_CALLBACK_URL`

---

**See Full Documentation:** [COMPLIANCE_ARCHITECTURE.md](./COMPLIANCE_ARCHITECTURE.md)

