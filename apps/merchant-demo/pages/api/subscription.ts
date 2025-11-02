import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";

// File-based storage for subscriptions (persists across hot reloads)
const STORAGE_FILE = path.join(process.cwd(), ".subscriptions.json");

type Subscription = {
  merchantName: string;
  merchantAddress: string;
  userAddress: string;
  amount: string;
  interval: string;
  active: boolean;
  noteId: string;
  permitSignature: string;
  maxAmount: string;
  expiry: number;
  nonce: number;
  proof: string; // ZK proof bytes
  publicInputs: string[]; // Public inputs from witness: [root, public_amount, ext_data_hash, nullifier]
  nextCharge: number;
  lastCharged?: number;
};

// Load subscriptions from file
async function loadSubscriptions(): Promise<Map<string, Subscription>> {
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    const json = JSON.parse(data);
    return new Map(Object.entries(json));
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File doesn't exist yet, return empty Map
      return new Map();
    }
    console.error("Error loading subscriptions:", error);
    return new Map();
  }
}

// Save subscriptions to file
async function saveSubscriptions(subscriptions: Map<string, Subscription>): Promise<void> {
  try {
    const json = Object.fromEntries(subscriptions);
    await fs.writeFile(STORAGE_FILE, JSON.stringify(json, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving subscriptions:", error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Load subscriptions from file
  const subscriptions = await loadSubscriptions();

  if (req.method === "POST") {
    // Create subscription
    const {
      merchantName,
      merchantAddress,
      userAddress,
      amount,
      interval,
      noteId,
      permitSignature,
      maxAmount,
      expiry,
      nonce,
      proof,
      publicInputs,
    } = req.body || {};

    if (!merchantAddress || !userAddress || !amount || !noteId || !permitSignature) {
      return res.status(400).json({ error: "missing required fields" });
    }
    
    if (!proof || !publicInputs || publicInputs.length !== 4) {
      return res.status(400).json({ error: "proof and publicInputs (4 elements) required" });
    }

    // Check for duplicate active subscription (same user, merchant, amount)
    const existingSub = Array.from(subscriptions.entries()).find(([_, sub]) => 
      sub.userAddress.toLowerCase() === userAddress.toLowerCase() &&
      sub.merchantAddress.toLowerCase() === merchantAddress.toLowerCase() &&
      sub.amount === amount &&
      sub.active === true
    );
    
    if (existingSub) {
      console.log('⚠️ Duplicate subscription detected, cancelling old one:', existingSub[0]);
      // Cancel the old subscription
      const oldSub = subscriptions.get(existingSub[0])!;
      oldSub.active = false;
      subscriptions.set(existingSub[0], oldSub);
      // Save after cancelling old subscription
      await saveSubscriptions(subscriptions);
    }
    
    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    // For demo: use 10-second intervals to simulate monthly payments
    // In production: interval === "monthly" ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const nextCharge = Date.now() + (10 * 1000); // 10 seconds per payment (simulates 1 month)

    console.log('✅ Creating subscription:', subId);
    
    subscriptions.set(subId, {
      merchantName: merchantName || merchantAddress.slice(0, 10),
      merchantAddress,
      userAddress,
      amount,
      interval: interval || "monthly",
      active: true,
      noteId,
      permitSignature,
      maxAmount,
      expiry,
      nonce,
      proof, // Store proof for use when charging
      publicInputs, // Store public inputs from witness
      nextCharge,
    });

    // Save to file
    await saveSubscriptions(subscriptions);

    return res.status(200).json({ 
      subscriptionId: subId,
      nextCharge: new Date(nextCharge).toISOString(),
    });
  }

  if (req.method === "GET") {
    // Get user's subscriptions
    const { userAddress } = req.query;
    
    if (!userAddress || typeof userAddress !== "string") {
      return res.status(400).json({ error: "userAddress required" });
    }

    // Filter: user's address + active subscriptions only
    const userSubs = Array.from(subscriptions.entries())
      .filter(([_, sub]) => 
        sub.userAddress.toLowerCase() === userAddress.toLowerCase() &&
        sub.active === true // Only show active subscriptions
      )
      .map(([id, sub]) => ({
        id,
        ...sub,
        nextChargeDate: new Date(sub.nextCharge).toISOString(),
        lastChargedDate: sub.lastCharged ? new Date(sub.lastCharged).toISOString() : null,
      }));
    
    // Sort by creation time (most recent first) and deduplicate by merchant+amount
    const uniqueSubs = userSubs
      .sort((a, b) => b.id.localeCompare(a.id)) // Most recent first
      .filter((sub, index, arr) => {
        // Only keep the first (most recent) subscription per merchant+amount
        const firstMatch = arr.findIndex(s => 
          s.merchantAddress.toLowerCase() === sub.merchantAddress.toLowerCase() &&
          s.amount === sub.amount
        );
        return index === firstMatch;
      });

    return res.status(200).json({ subscriptions: uniqueSubs });
  }

  if (req.method === "PUT") {
    // Charge subscription (execute payment)
    const { subscriptionId } = req.body || {};
    
    console.log('🔍 PUT /api/subscription called with subscriptionId:', subscriptionId);
    console.log('📦 Current subscriptions in Map:', Array.from(subscriptions.keys()));
    
    if (!subscriptionId) {
      return res.status(400).json({ error: "subscriptionId required" });
    }

    const sub = subscriptions.get(subscriptionId);
    console.log('🔍 Looking up subscription:', subscriptionId, 'Found:', !!sub);
    
    if (!sub) {
      console.error('❌ Subscription not found! Available IDs:', Array.from(subscriptions.keys()));
      return res.status(404).json({ error: "subscription not found" });
    }

    if (!sub.active) {
      return res.status(400).json({ error: "subscription is not active" });
    }

    // Check if it's time to charge (allow first charge immediately)
    const now = Date.now();
    const isFirstCharge = !sub.lastCharged;
    if (!isFirstCharge && now < sub.nextCharge) {
      return res.status(400).json({ 
        error: "not yet time to charge",
        nextCharge: new Date(sub.nextCharge).toISOString()
      });
    }

    // Build permit struct
    const permit = {
      noteId: sub.noteId,
      merchant: sub.merchantAddress,
      maxAmount: sub.maxAmount,
      expiry: sub.expiry,
      nonce: sub.nonce,
      signature: sub.permitSignature,
      merchantCommitment: "0x0000000000000000000000000000000000000000000000000000000000000000", // 0x0 = public address
    };

    // Build contract call arguments: [proof, publicInputs, permit, recipient, amount]
    const args = [
      sub.proof,
      sub.publicInputs,
      permit,
      sub.merchantAddress, // recipient (merchant receives payment)
      sub.amount,
    ];

    // Call execute API to charge via relayer
    const ADAPTER_ADDR = process.env.NEXT_PUBLIC_X402_ADAPTER || "";
    
    // Use absolute URL for server-to-server communication within Next.js
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const executeUrl = `${baseUrl}/api/execute`;
    
    console.log('Calling execute API at:', executeUrl);
    console.log('With adapter:', ADAPTER_ADDR);
    console.log('Args length:', args.length);
    
    const executeRes = await fetch(executeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adapter: ADAPTER_ADDR,
        method: "take",
        args: args,
      }),
    });

    if (!executeRes.ok) {
      const responseText = await executeRes.text();
      console.error('Execute API error:', executeRes.status, responseText);
      
      try {
        const error = JSON.parse(responseText);
        console.error('Execute API error details:', error);
        return res.status(500).json({ 
          error: error.error || "failed to execute charge",
          details: error.details || error.message || responseText.substring(0, 200)
        });
      } catch (parseError) {
        return res.status(500).json({ 
          error: "failed to execute charge",
          details: responseText.substring(0, 200)
        });
      }
    }

    const executeData = await executeRes.json();
    
    // Update subscription: increment nonce, set next charge date, update last charged
    sub.nonce = sub.nonce + 1;
    // For demo: use 10-second intervals to simulate monthly payments
    // In production: sub.interval === "monthly" ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    sub.nextCharge = now + (10 * 1000); // 10 seconds per payment (simulates 1 month)
    sub.lastCharged = now;
    subscriptions.set(subscriptionId, sub);

    // Save to file
    await saveSubscriptions(subscriptions);

    return res.status(200).json({
      success: true,
      txHash: executeData.txHash,
      nextChargeDate: new Date(sub.nextCharge).toISOString(),
      lastCharged: new Date(sub.lastCharged).toISOString(),
    });
  }

  if (req.method === "DELETE") {
    // Cancel subscription
    const { subscriptionId } = req.body || {};
    
    if (!subscriptionId) {
      return res.status(400).json({ error: "subscriptionId required" });
    }

    const sub = subscriptions.get(subscriptionId);
    if (!sub) {
      return res.status(404).json({ error: "subscription not found" });
    }

    sub.active = false;
    subscriptions.set(subscriptionId, sub);

    // Save to file
    await saveSubscriptions(subscriptions);

    return res.status(200).json({ message: "subscription cancelled" });
  }

  return res.status(405).json({ error: "method not allowed" });
}

