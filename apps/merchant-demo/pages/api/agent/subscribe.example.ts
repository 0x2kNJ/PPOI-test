/**
 * Agent Subscription API - Example Implementation
 * 
 * This is an EXAMPLE file showing how to implement agent subscriptions.
 * Copy this to pages/api/agent/subscribe.ts and customize as needed.
 * 
 * SECURITY WARNING: In production, never accept private keys via API!
 * Use secure key management (HSM, encrypted storage, etc.)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { AgentWallet } from "@/lib/agent-wallet";
import { ethers } from "ethers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  
  try {
    const {
      agentPrivateKey,
      amount, // Amount in USDC (6 decimals)
      merchantAddress,
      maxAmount, // Maximum amount for permit
      expiry, // Unix timestamp
      nonce, // Nonce for permit
    } = req.body;
    
    // Validate inputs
    if (!agentPrivateKey || !agentPrivateKey.startsWith("0x")) {
      return res.status(400).json({ error: "Invalid agent private key" });
    }
    
    if (!amount || !merchantAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // ⚠️ SECURITY: In production, don't accept private keys!
    // Use secure key management instead
    
    // Create agent wallet
    const agent = new AgentWallet(
      agentPrivateKey,
      process.env.RPC_URL || "http://localhost:8545"
    );
    
    const agentAddress = agent.getAddress();
    console.log(`Agent address: ${agentAddress}`);
    
    // Check agent balance (optional)
    const balance = await agent.getBalance();
    console.log(`Agent balance: ${ethers.formatEther(balance)} ETH`);
    
    // Generate noteId
    const noteId = AgentWallet.generateNoteId(agentAddress, nonce || 1);
    console.log(`NoteId: ${noteId}`);
    
    // Get merchant's shielded commitment from environment (or use public address)
    const merchantCommitment = process.env.NEXT_PUBLIC_MERCHANT_COMMITMENT || "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    // Prepare permit
    const permitData = {
      noteId,
      merchant: merchantAddress,
      maxAmount: maxAmount || amount,
      expiry: expiry || Math.floor(Date.now() / 1000) + 3600, // Default 1 hour
      nonce: nonce || 1,
      merchantCommitment: merchantCommitment as `0x${string}`, // Shielded address if configured, else public
    };
    
    // Sign permit programmatically (no MetaMask!)
    const signature = await agent.signPermit(
      permitData,
      parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337")
    );
    
    console.log(`Permit signed: ${signature.slice(0, 20)}...`);
    
    // Generate ZK proof
    const precomputeUrl = process.env.NEXT_PUBLIC_PRECOMPUTE_API_URL || "http://localhost:3001";
    const maxAmountUsd = ethers.formatUnits(maxAmount || amount, 6);
    
    console.log(`Generating ZK proof for maxAmount: $${maxAmountUsd}...`);
    
    const precomputeRes = await fetch(`${precomputeUrl}/api/precomputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteId,
        maxAmountUsd,
      }),
    });
    
    if (!precomputeRes.ok) {
      const error = await precomputeRes.json();
      return res.status(500).json({ 
        error: "Failed to generate ZK proof",
        details: error 
      });
    }
    
    const { precomputes } = await precomputeRes.json();
    
    if (!precomputes || precomputes.length === 0) {
      return res.status(500).json({ error: "No precomputes generated" });
    }
    
    const matchingPrecompute = precomputes.find(
      (p: any) => p.bucketAmount >= parseFloat(maxAmountUsd) * 100
    ) || precomputes[0];
    
    console.log(`Using precompute: bucketAmount=${matchingPrecompute.bucketAmount}`);
    
    // Create subscription
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   `http://localhost:${process.env.PORT || 3000}`;
    
    const subRes = await fetch(`${baseUrl}/api/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantName: "Agent Subscription",
        merchantAddress,
        userAddress: agentAddress,
        amount: amount.toString(),
        interval: "monthly",
        noteId,
        permitSignature: signature,
        maxAmount: (maxAmount || amount).toString(),
        expiry: permitData.expiry,
        nonce: permitData.nonce,
        proof: matchingPrecompute.proof,
        publicInputs: matchingPrecompute.publicInputs,
      }),
    });
    
    if (!subRes.ok) {
      const error = await subRes.json();
      return res.status(500).json({ 
        error: "Failed to create subscription",
        details: error 
      });
    }
    
    const { subscriptionId, nextCharge } = await subRes.json();
    
    console.log(`Subscription created: ${subscriptionId}`);
    
    return res.status(200).json({
      success: true,
      subscriptionId,
      agentAddress,
      permitSignature: signature,
      noteId,
      nextCharge,
    });
    
  } catch (error: any) {
    console.error("Agent subscription error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create agent subscription",
      details: error.stack,
    });
  }
}



