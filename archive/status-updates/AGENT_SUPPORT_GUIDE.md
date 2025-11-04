# Agent Support Guide: How to Add AI Agent Capabilities

## 🎯 Overview

This guide explains how to modify the x402 demo to support **AI agents** that can autonomously:
- Generate ZK proofs
- Sign permits (without MetaMask)
- Execute payments automatically
- Manage subscriptions autonomously
- Perform agent-to-agent payments

## 🤖 What is an Agent?

An **agent** is an automated wallet that can:
- Execute transactions without user interaction
- Sign permits programmatically (no MetaMask)
- Make decisions autonomously
- Manage multiple subscriptions
- Perform batch operations

## 🔧 Architecture Changes

### Current Flow (User-Initiated)

```
User Wallet (MetaMask)
    ↓
User signs EIP-712 permit
    ↓
Frontend → API → Relayer → Contract
```

### Agent Flow (Automated)

```
Agent Wallet (Private Key)
    ↓
Agent signs EIP-712 permit (programmatic)
    ↓
Agent API → Relayer → Contract
```

## 📝 Implementation Steps

### Step 1: Agent Wallet Setup

Create an agent wallet system:

```typescript
// apps/merchant-demo/lib/agent-wallet.ts

import { ethers } from "ethers";
import { Wallet } from "ethers";

export class AgentWallet {
  private wallet: Wallet;
  private provider: ethers.Provider;
  
  constructor(
    privateKey: string,
    rpcUrl: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
  }
  
  getAddress(): string {
    return this.wallet.address;
  }
  
  async signPermit(permit: {
    noteId: string;
    merchant: string;
    maxAmount: string;
    expiry: number;
    nonce: number;
    merchantCommitment: string;
  }, chainId: number): Promise<string> {
    const domain = {
      name: "Bermuda X402",
      version: "1",
      chainId: chainId,
      verifyingContract: process.env.NEXT_PUBLIC_X402_ADAPTER!,
    };
    
    const types = {
      Permit: [
        { name: "noteId", type: "bytes32" },
        { name: "merchant", type: "address" },
        { name: "maxAmount", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "merchantCommitment", type: "bytes32" },
      ],
    };
    
    // Agent signs programmatically (no MetaMask!)
    return await this.wallet.signTypedData(domain, types, permit);
  }
  
  async executeTransaction(
    contractAddress: string,
    abi: any[],
    method: string,
    args: any[]
  ): Promise<string> {
    const contract = new ethers.Contract(contractAddress, abi, this.wallet);
    const tx = await contract[method](...args);
    const receipt = await tx.wait();
    return receipt.hash;
  }
}
```

### Step 2: Agent API Endpoints

Create agent-specific API endpoints:

```typescript
// apps/merchant-demo/pages/api/agent/subscribe.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { AgentWallet } from "@/lib/agent-wallet";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  
  const {
    agentPrivateKey,
    amount,
    merchantAddress,
    maxAmount,
    expiry,
    nonce,
  } = req.body;
  
  // Validate agent private key
  if (!agentPrivateKey || !agentPrivateKey.startsWith("0x")) {
    return res.status(400).json({ error: "Invalid agent private key" });
  }
  
  // Create agent wallet
  const agent = new AgentWallet(
    agentPrivateKey,
    process.env.RPC_URL!
  );
  
  // Generate noteId (for demo, use agent address + nonce)
  const noteId = ethers.keccak256(
    ethers.solidityPacked(
      ["address", "uint256"],
      [agent.getAddress(), nonce]
    )
  );
  
  // Sign permit programmatically (no MetaMask!)
  const permit = {
    noteId,
    merchant: merchantAddress,
    maxAmount,
    expiry,
    nonce,
    merchantCommitment: "0x0000000000000000000000000000000000000000000000000000000000000000",
  };
  
  const signature = await agent.signPermit(
    permit,
    parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337")
  );
  
  // Generate ZK proof
  const precomputeRes = await fetch(
    `${process.env.NEXT_PUBLIC_PRECOMPUTE_API_URL}/api/precomputes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteId,
        maxAmountUsd: ethers.formatUnits(maxAmount, 6),
      }),
    }
  );
  
  const { precomputes } = await precomputeRes.json();
  const matchingPrecompute = precomputes[0];
  
  // Create subscription
  const subRes = await fetch(`${req.headers.origin}/api/subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantName: "Agent Subscription",
      merchantAddress,
      userAddress: agent.getAddress(),
      amount: maxAmount,
      interval: "monthly",
      noteId,
      permitSignature: signature,
      maxAmount,
      expiry,
      nonce,
      proof: matchingPrecompute.proof,
      publicInputs: matchingPrecompute.publicInputs,
    }),
  });
  
  const { subscriptionId } = await subRes.json();
  
  return res.status(200).json({
    subscriptionId,
    agentAddress: agent.getAddress(),
    permitSignature: signature,
  });
}
```

### Step 3: Agent Payment Execution

```typescript
// apps/merchant-demo/pages/api/agent/pay.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { AgentWallet } from "@/lib/agent-wallet";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  
  const {
    agentPrivateKey,
    subscriptionId,
  } = req.body;
  
  // Create agent wallet
  const agent = new AgentWallet(
    agentPrivateKey,
    process.env.RPC_URL!
  );
  
  // Charge subscription (same as user flow)
  const chargeRes = await fetch(`${req.headers.origin}/api/subscription`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  
  const { txHash } = await chargeRes.json();
  
  return res.status(200).json({
    success: true,
    txHash,
    agentAddress: agent.getAddress(),
  });
}
```

### Step 4: Agent-to-Agent Payments

```typescript
// apps/merchant-demo/pages/api/agent/pay-agent.ts

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    senderPrivateKey,
    recipientAddress,
    amount,
  } = req.body;
  
  // Create sender agent
  const senderAgent = new AgentWallet(
    senderPrivateKey,
    process.env.RPC_URL!
  );
  
  // Generate permit for recipient agent
  const permit = {
    noteId: generateNoteId(senderAgent.getAddress()),
    merchant: recipientAddress, // Recipient agent address
    maxAmount: amount,
    expiry: Math.floor(Date.now() / 1000) + 3600,
    nonce: 1,
    merchantCommitment: "0x0000000000000000000000000000000000000000000000000000000000000000",
  };
  
  // Sign permit
  const signature = await senderAgent.signPermit(
    permit,
    parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337")
  );
  
  // Execute payment via relayer
  const executeRes = await fetch(`${req.headers.origin}/api/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adapter: process.env.NEXT_PUBLIC_X402_ADAPTER!,
      method: "take",
      args: [
        proof, // Generated ZK proof
        publicInputs,
        { ...permit, signature },
        recipientAddress,
        amount,
      ],
    }),
  });
  
  const { txHash } = await executeRes.json();
  
  return res.status(200).json({
    success: true,
    txHash,
    sender: senderAgent.getAddress(),
    recipient: recipientAddress,
    amount,
  });
}
```

### Step 5: Agent Auto-Management

```typescript
// apps/merchant-demo/pages/api/agent/manage.ts

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    agentPrivateKey,
    action, // "subscribe" | "charge" | "cancel" | "list"
    subscriptionId,
    amount,
    merchantAddress,
  } = req.body;
  
  const agent = new AgentWallet(
    agentPrivateKey,
    process.env.RPC_URL!
  );
  
  switch (action) {
    case "subscribe":
      // Create subscription automatically
      return await handleSubscribe(agent, amount, merchantAddress);
      
    case "charge":
      // Charge existing subscription
      return await handleCharge(subscriptionId);
      
    case "cancel":
      // Cancel subscription
      return await handleCancel(subscriptionId);
      
    case "list":
      // List agent's subscriptions
      return await handleList(agent.getAddress());
      
    default:
      return res.status(400).json({ error: "Invalid action" });
  }
}
```

## 🔐 Security Considerations

### Private Key Management

**⚠️ IMPORTANT**: Agent private keys must be secured!

```typescript
// Option 1: Environment variables (development only)
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY!;

// Option 2: Encrypted storage (production)
import { encrypt, decrypt } from "@/lib/encryption";

const encryptedKey = encrypt(privateKey, masterKey);
const decryptedKey = decrypt(encryptedKey, masterKey);

// Option 3: Hardware security module (HSM)
import { HSMClient } from "@/lib/hsm";

const hsm = new HSMClient();
const signature = await hsm.sign(permit, keyId);
```

### Rate Limiting

```typescript
// Limit agent actions per hour
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(agentAddress: string): boolean {
  const limit = rateLimiter.get(agentAddress);
  const now = Date.now();
  
  if (!limit || now > limit.resetAt) {
    rateLimiter.set(agentAddress, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  
  if (limit.count >= 100) { // 100 actions per hour
    return false;
  }
  
  limit.count++;
  return true;
}
```

### Permit Limits

```typescript
// Enforce strict permit limits for agents
const permit = {
  maxAmount: min(amount * 12, maxMonthlyLimit), // Cap at 12 months
  expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
  nonce: getNextNonce(agentAddress), // Track nonces
};
```

## 📊 Agent Use Cases

### Use Case 1: Automated Subscription Manager

```typescript
// Agent manages multiple subscriptions automatically
class SubscriptionAgent {
  async manageSubscriptions() {
    // Check all subscriptions
    const subs = await getSubscriptions(this.agentAddress);
    
    for (const sub of subs) {
      if (shouldCharge(sub)) {
        await this.chargeSubscription(sub.id);
      }
    }
  }
  
  private shouldCharge(sub: Subscription): boolean {
    return Date.now() >= sub.nextCharge;
  }
}
```

### Use Case 2: Payment Router Agent

```typescript
// Agent routes payments to multiple recipients
class PaymentRouterAgent {
  async routePayment(
    amount: number,
    recipients: { address: string; percentage: number }[]
  ) {
    for (const recipient of recipients) {
      const recipientAmount = amount * recipient.percentage;
      await this.payTo(recipient.address, recipientAmount);
    }
  }
}
```

### Use Case 3: Autonomous Merchant Agent

```typescript
// Agent acts as autonomous merchant
class MerchantAgent {
  async processPaymentRequest(request: PaymentRequest) {
    // Validate request
    if (!this.isValidRequest(request)) {
      return { error: "Invalid request" };
    }
    
    // Generate permit for customer
    const permit = await this.generatePermit(request);
    
    // Execute payment
    return await this.executePayment(permit);
  }
}
```

## 🚀 Quick Start

### 1. Create Agent Wallet

```bash
# Generate agent private key (keep secure!)
cast wallet new > agent.key
```

### 2. Fund Agent Wallet (Anvil)

```bash
# Anvil automatically funds all accounts
# Or manually:
cast send --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --value 1ether \
  $(cat agent.key | cast wallet address)
```

### 3. Test Agent Subscription

```bash
curl -X POST http://localhost:3000/api/agent/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "0x...",
    "amount": "10000000",
    "merchantAddress": "0x...",
    "maxAmount": "120000000",
    "expiry": 1234567890,
    "nonce": 1
  }'
```

### 4. Test Agent Payment

```bash
curl -X POST http://localhost:3000/api/agent/pay \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "0x...",
    "subscriptionId": "sub_..."
  }'
```

## 📚 API Reference

### Agent Subscription API

**POST** `/api/agent/subscribe`

```json
{
  "agentPrivateKey": "0x...",
  "amount": "10000000",
  "merchantAddress": "0x...",
  "maxAmount": "120000000",
  "expiry": 1234567890,
  "nonce": 1
}
```

**Response:**
```json
{
  "subscriptionId": "sub_...",
  "agentAddress": "0x...",
  "permitSignature": "0x..."
}
```

### Agent Payment API

**POST** `/api/agent/pay`

```json
{
  "agentPrivateKey": "0x...",
  "subscriptionId": "sub_..."
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "agentAddress": "0x..."
}
```

### Agent-to-Agent Payment API

**POST** `/api/agent/pay-agent`

```json
{
  "senderPrivateKey": "0x...",
  "recipientAddress": "0x...",
  "amount": "10000000"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "sender": "0x...",
  "recipient": "0x...",
  "amount": "10000000"
}
```

## ✅ Summary

**Key Changes:**
1. ✅ Agent wallet system (programmatic signing)
2. ✅ Agent API endpoints
3. ✅ Automated permit signing (no MetaMask)
4. ✅ Agent-to-agent payments
5. ✅ Autonomous subscription management

**Benefits:**
- 🤖 Fully automated payments
- ⚡ No user interaction needed
- 🔄 Autonomous subscription management
- 🤝 Agent-to-agent payments
- 📊 Batch operations support

**Security:**
- 🔐 Secure private key management
- 🛡️ Rate limiting
- ✅ Permit limits enforcement
- 🔒 HSM support (production)

Ready to support AI agents! 🚀



