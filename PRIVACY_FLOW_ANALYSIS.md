# End-to-End Privacy Flow Analysis

## 🔒 Current Privacy Flow

### Overview

The x402 Private Delegations implementation aims to keep delegation policies **off-chain** (in Nillion) while allowing on-chain verification. Here's how privacy is currently maintained and where it can be improved.

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER/AGENT                                  │
│  • Policy (private)                                                 │
│  • Policy Hash + Salt (input)                                       │
│  • Agent Private Key (if using agent)                               │
└──────────────────┬─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE (Browser)                            │
│                                                                     │
│  ✅ PRIVATE:                                                        │
│    • Policy Hash (only if entered)                                 │
│    • Salt (only if entered)                                        │
│    • Agent Private Key (if using agent) ⚠️ DISPLAYED IN UI          │
│                                                                     │
│  ✅ COMPUTED PRIVATELY:                                             │
│    • Delegation Leaf = keccak256(policyHash || salt)               │
│                                                                     │
└──────────────────┬─────────────────────────────────────────────────┘
                    │
                    │ HTTP Request
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   NEXT.JS API (Server)                              │
│                                                                     │
│  ⚠️ PARTIALLY PRIVATE:                                              │
│    • Policy Hash → N/A (never sent to server) ✅                     │
│    • Salt → N/A (never sent to server) ✅                           │
│    • Delegation Leaf → Stored in subscription ⚠️                    │
│    • Action Hash → Computed, stored ⚠️                              │
│    • Attestation → Stored ⚠️                                        │
│                                                                     │
│  📝 STORED IN .subscriptions.json:                                  │
│    • userAddress (public address) ⚠️                               │
│    • merchantAddress (public address) ⚠️                           │
│    • amount (on-chain anyway) ✅                                    │
│    • noteId ⚠️ (could link payments)                                │
│    • leafCommitment ⚠️ (could link to policy)                       │
│    • delegationRoot ⚠️ (reveals Merkle tree state)                  │
│    • attestation ⚠️ (ECDSA signature)                               │
└──────────────────┬─────────────────────────────────────────────────┘
                    │
                    │ On-Chain Transaction
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN (Public)                               │
│                                                                     │
│  ❌ PUBLICLY VISIBLE:                                                │
│    • userAddress (from permit)                                      │
│    • merchantAddress (from permit)                                 │
│    • amount (in transaction)                                       │
│    • noteId (in permit) ⚠️                                          │
│    • delegationRoot (from DelegationAnchor contract)               │
│    • leafCommitment (in event/tx) ⚠️                                │
│    • actionHash (in tx calldata) ⚠️                                 │
│    • attestation (in tx calldata) ⚠️                                │
│    • merkleProof (in tx calldata) ⚠️                               │
│                                                                     │
│  ✅ PRIVATE (not on-chain):                                         │
│    • Policy (stored in Nillion TEE) ✅                              │
│    • Policy Hash (only client-side) ✅                              │
│    • Salt (only client-side) ✅                                      │
└──────────────────┬─────────────────────────────────────────────────┘
                    │
                    │ Nillion nilCC (Off-Chain)
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NILLION TEE (Private)                             │
│                                                                     │
│  ✅ FULLY PRIVATE:                                                  │
│    • Policy (stored encrypted) ✅                                   │
│    • Policy evaluation (in TEE) ✅                                  │
│    • Attestation generation (in TEE) ⚠️ DEMO: ECDSA, NOT TEE        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Privacy Analysis by Component

### 1. **On-Chain Data (Blockchain)** ❌ Public

**Currently Exposed:**
- ✅ `userAddress` - Payer identity (needed for permit)
- ✅ `merchantAddress` - Recipient identity (needed for payment)
- ✅ `amount` - Payment amount (needed for transaction)
- ❌ `noteId` - **Privacy leak**: Links multiple payments to same user
- ❌ `leafCommitment` - **Privacy leak**: Can link to policy if policy hash is known
- ❌ `delegationRoot` - Reveals Merkle tree state (acceptable for Merkle anchor pattern)
- ❌ `actionHash` - **Privacy leak**: Contains method, recipient, amount (all public anyway)
- ❌ `attestation` - ECDSA signature (currently mock, not TEE)
- ❌ `merkleProof` - Reveals tree structure (acceptable for Merkle inclusion)

**Improvements Needed:**
1. **NoteId Privacy**: Use different noteId per payment OR use shielded addresses
2. **Leaf Commitment Privacy**: Use nullifier scheme to prevent linking
3. **Action Hash Privacy**: Already contains public data, but could be improved with nullifiers
4. **Attestation Privacy**: Replace ECDSA with TEE attestation (planned)

### 2. **Server-Side Storage** ⚠️ Semi-Private

**Currently Stored (.subscriptions.json):**
- ❌ `userAddress` - Links all subscriptions to user
- ❌ `merchantAddress` - Links all payments to merchant
- ❌ `leafCommitment` - Links subscription to delegation policy
- ❌ `noteId` - Links payments across time
- ✅ `amount` - Needed for payments
- ✅ `proof`, `publicInputs` - Needed for payments

**Privacy Concerns:**
- File-based storage is unencrypted
- All subscription data in one file
- No access controls
- Logged to console

**Improvements Needed:**
1. **Encrypted Storage**: Encrypt subscription data at rest
2. **Database Access Controls**: Per-user encryption keys
3. **Logging Reduction**: Remove sensitive data from logs
4. **Data Minimization**: Don't store unnecessary delegation fields

### 3. **Client-Side (Browser)** ⚠️ Privacy Leaks

**Currently Visible:**
- ❌ **Agent Private Key** - **CRITICAL**: Displayed in UI ⚠️⚠️⚠️
- ⚠️ Policy Hash - Only if user enters (demo defaults)
- ⚠️ Salt - Only if user enters (demo defaults)
- ✅ Delegation Leaf - Computed locally (good)

**Privacy Concerns:**
- Agent private key in component state
- Agent private key visible in UI (for demo)
- Policy hash/salt in component state
- All data in browser localStorage/memory

**Improvements Needed:**
1. **Remove Private Key Display**: Never show private keys in production
2. **Secure Key Storage**: Use WebCrypto API or secure vault
3. **Clear on Unmount**: Clear sensitive state when component unmounts
4. **No localStorage**: Don't persist private keys

### 4. **HTTP API Endpoints** ⚠️ Privacy Leaks

**Currently Logged:**
- `/api/delegation-root` - Logs root (OK, public data)
- `/api/nillion/attest` - Logs leaf, action, root ⚠️
- `/api/subscription` - Logs all subscription data ⚠️
- `/api/execute` - Logs transaction data ⚠️

**Privacy Concerns:**
- Console logs contain sensitive data
- No request logging controls
- No PII sanitization

**Improvements Needed:**
1. **Sanitized Logging**: Hash sensitive fields before logging
2. **Structured Logging**: Separate logs by sensitivity level
3. **Log Retention**: Don't retain sensitive logs
4. **Request Logging**: Log only request IDs, not full data

---

## 🎯 Privacy Improvements by Priority

### 🔴 **Critical (High Priority)**

#### 1. **Agent Private Key Display** ⚠️⚠️⚠️
**Problem**: Private keys visible in UI  
**Impact**: Complete wallet compromise  
**Solution**:
```typescript
// Remove private key display entirely
{agentPrivateKey && (
  <div style={{ color: "#888888", fontSize: "0.75rem" }}>
    ⚠️ Private key configured (not shown for security)
  </div>
)}
```

#### 2. **Subscription Storage Encryption**
**Problem**: Unencrypted subscription data  
**Impact**: Server compromise exposes all subscriptions  
**Solution**:
- Encrypt `.subscriptions.json` at rest
- Use per-user encryption keys
- Store encryption keys separately

#### 3. **NoteId Linkability**
**Problem**: Same noteId links multiple payments  
**Impact**: Payment history analysis  
**Solution**:
- Use unique noteId per payment OR
- Use shielded addresses for notes

#### 4. **Server-Side Logging**
**Problem**: Sensitive data in console logs  
**Impact**: Logs expose private information  
**Solution**:
```typescript
// Sanitize logs
const sanitizeForLogging = (data: any) => {
  return {
    ...data,
    leafCommitment: data.leafCommitment?.slice(0, 10) + "...",
    attestation: data.attestation?.slice(0, 10) + "...",
    // Don't log private keys at all
  };
};
```

### 🟡 **Important (Medium Priority)**

#### 5. **Leaf Commitment Linkability**
**Problem**: Leaf commitment can link to policy if policy hash known  
**Impact**: Policy de-anonymization  
**Solution**:
- Use nullifier scheme
- Add randomness per subscription
- Use different leaf per payment

#### 6. **Action Hash Privacy**
**Problem**: Contains method, recipient, amount  
**Impact**: Transaction analysis  
**Solution**:
- Already contains public data
- Could use nullifiers for recipient privacy

#### 7. **Merkle Proof Privacy**
**Problem**: Reveals tree structure  
**Impact**: Tree analysis  
**Solution**:
- Acceptable for Merkle anchor pattern
- Could use ZK proofs of inclusion instead

### 🟢 **Nice to Have (Low Priority)**

#### 8. **Browser State Privacy**
**Problem**: Sensitive data in component state  
**Impact**: Memory dumps, XSS attacks  
**Solution**:
- Use secure storage (WebCrypto API)
- Clear state on unmount
- Don't persist sensitive data

#### 9. **API Request Privacy**
**Problem**: Full request data visible  
**Impact**: Network analysis  
**Solution**:
- Use HTTPS (already required)
- Minimize request payload
- Use request IDs for logging

---

## 🔐 Recommended Privacy Enhancements

### 1. **Implement Secure Key Storage**

```typescript
// lib/secure-storage.ts
import { encrypt, decrypt } from '@noble/ciphers/aes';

export class SecureKeyStorage {
  private static async getEncryptionKey(): Promise<Uint8Array> {
    // Use WebCrypto API to generate/derive key
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    return await crypto.subtle.exportKey("raw", key);
  }

  static async storePrivateKey(keyId: string, privateKey: string): Promise<void> {
    const encKey = await this.getEncryptionKey();
    const encrypted = await encrypt(privateKey, encKey);
    // Store encrypted key (not in localStorage!)
    // Use secure HTTP-only cookie or secure vault API
  }

  static async retrievePrivateKey(keyId: string): Promise<string | null> {
    // Retrieve and decrypt key
    // Never expose to UI
  }
}
```

### 2. **Implement Data Sanitization**

```typescript
// lib/sanitize.ts
export function sanitizeForLogging(data: any): any {
  const sensitive = ['privateKey', 'agentPrivateKey', 'salt', 'policyHash'];
  const hashFields = ['leafCommitment', 'attestation', 'noteId'];
  
  const sanitized = { ...data };
  
  // Remove sensitive fields
  sensitive.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });
  
  // Hash long fields
  hashFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitized[field].slice(0, 10) + "...";
    }
  });
  
  return sanitized;
}
```

### 3. **Implement NoteId Privacy**

```typescript
// lib/note-privacy.ts
export function generatePrivateNoteId(
  userAddress: string,
  subscriptionId: string,
  paymentIndex: number
): string {
  // Use subscription-specific noteId instead of user-specific
  // This prevents linking payments across subscriptions
  return ethers.solidityPackedKeccak256(
    ["address", "string", "uint256"],
    [userAddress, subscriptionId, paymentIndex]
  );
}
```

### 4. **Implement Subscription Encryption**

```typescript
// lib/subscription-encryption.ts
import { encrypt, decrypt } from '@noble/ciphers/aes';

export async function encryptSubscription(
  subscription: Subscription,
  userPublicKey: string
): Promise<EncryptedSubscription> {
  // Encrypt sensitive fields only
  const sensitive = {
    leafCommitment: subscription.leafCommitment,
    attestation: subscription.delegationAttestation,
    // ... other sensitive fields
  };
  
  const encrypted = await encrypt(
    JSON.stringify(sensitive),
    userPublicKey
  );
  
  return {
    ...subscription,
    encryptedData: encrypted,
    leafCommitment: undefined, // Remove from plaintext
    delegationAttestation: undefined,
  };
}
```

### 5. **Implement Nullifier Scheme**

```typescript
// lib/nullifiers.ts
export function generateNullifier(
  leafCommitment: string,
  paymentIndex: number,
  secret: string
): string {
  // Generate unique nullifier per payment
  // Prevents linking payments via leafCommitment
  return ethers.solidityPackedKeccak256(
    ["bytes32", "uint256", "bytes32"],
    [leafCommitment, paymentIndex, secret]
  );
}
```

---

## 📋 Privacy Checklist

### ✅ **Currently Private**
- [x] Policy (stored in Nillion TEE)
- [x] Policy Hash (only client-side)
- [x] Salt (only client-side)
- [x] Policy evaluation (in TEE)

### ⚠️ **Partially Private (Needs Improvement)**
- [ ] Agent Private Key (visible in UI) → **Fix: Remove display**
- [ ] Subscription Storage (unencrypted) → **Fix: Encrypt at rest**
- [ ] Server Logs (contain sensitive data) → **Fix: Sanitize logs**
- [ ] NoteId (links payments) → **Fix: Use unique noteId per payment**
- [ ] Leaf Commitment (links to policy) → **Fix: Use nullifier scheme**

### ❌ **Public (By Design)**
- [x] User Address (needed for permit)
- [x] Merchant Address (needed for payment)
- [x] Amount (needed for transaction)
- [x] Delegation Root (needed for Merkle anchor)
- [x] Merkle Proof (needed for inclusion)

---

## 🎯 Privacy Goals

### **Minimum Viable Privacy** (Current + Fixes)
1. ✅ Policy stays in Nillion TEE
2. ✅ Policy hash/salt never leave client
3. 🔴 Fix: Remove private key display
4. 🔴 Fix: Encrypt subscription storage
5. 🔴 Fix: Sanitize server logs

### **Enhanced Privacy** (Recommended)
1. ✅ All of above
2. ✅ Unique noteId per payment
3. ✅ Nullifier scheme for leaf commitments
4. ✅ Encrypted subscription storage
5. ✅ Secure key storage (no UI display)

### **Maximum Privacy** (Future)
1. ✅ All of above
2. ✅ Shielded addresses for notes
3. ✅ ZK proofs for Merkle inclusion
4. ✅ Fully private payment amounts
5. ✅ TEE-based attestation (not ECDSA)

---

## 📝 Implementation Priority

### **Phase 1: Critical Fixes** (Do Now)
1. Remove private key display from UI
2. Sanitize server-side logs
3. Encrypt subscription storage

### **Phase 2: Enhanced Privacy** (Next Sprint)
1. Implement unique noteId per payment
2. Add nullifier scheme for leaf commitments
3. Implement secure key storage

### **Phase 3: Maximum Privacy** (Future)
1. Integrate shielded addresses
2. Implement ZK Merkle proofs
3. Replace ECDSA with TEE attestation

---

## 🔗 Related Documentation

- **Specification**: `X402_PRIVATE_DELEGATIONS_OPTION_A.md`
- **Integration Guide**: `AGENT_DELEGATION_INTEGRATION_COMPLETE.md`
- **Deployment Guide**: `DEPLOYMENT_COMPLETE.md`
- **Nillion Integration**: `NILLION_NILCC_OVERVIEW.md`

---

*Last Updated: 2025-11-02*

