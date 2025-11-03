import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";
import { sanitizeForLogging, createSafeLogger } from "../../lib/sanitize";
import { 
  encryptSubscriptionData, 
  decryptSubscriptionData, 
  isEncrypted 
} from "../../lib/subscription-encryption";

const logger = createSafeLogger("SubscriptionAPI");

// File-based storage for subscriptions (persists across hot reloads)
// ✅ PRIVACY IMPROVEMENT: Now encrypted at rest
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
  paymentIndex?: number; // Track payment index for unique noteId generation
  // Delegation fields (optional)
  useDelegation?: boolean;
  leafCommitment?: string;
  delegationRoot?: string;
  delegationMerkleProof?: string[];
  delegationActionHash?: string;
  delegationAttestation?: string;
};

// Load subscriptions from file
// ✅ PRIVACY IMPROVEMENT: Decrypt subscriptions from encrypted storage
async function loadSubscriptions(): Promise<Map<string, Subscription>> {
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    
    // Check if data is encrypted
    if (isEncrypted(data)) {
      // Decrypt the entire file
      const decrypted = decryptSubscriptionData(data);
      const json = JSON.parse(decrypted);
      return new Map(Object.entries(json));
    } else {
      // Legacy: Plain text format (for backwards compatibility)
      console.warn('⚠️  Loading unencrypted subscriptions (will encrypt on next save)');
      const json = JSON.parse(data);
      return new Map(Object.entries(json));
    }
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
// ✅ PRIVACY IMPROVEMENT: Encrypt subscriptions before saving
async function saveSubscriptions(subscriptions: Map<string, Subscription>): Promise<void> {
  try {
    const json = Object.fromEntries(subscriptions);
    const plaintext = JSON.stringify(json, null, 2);
    
    // Encrypt the entire subscription data
    const encrypted = encryptSubscriptionData(plaintext);
    
    await fs.writeFile(STORAGE_FILE, encrypted, "utf-8");
    logger.info('✅ Subscriptions saved (encrypted)');
  } catch (error) {
    console.error("❌ Error saving subscriptions:", error);
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
      // Delegation fields
      useDelegation,
      leafCommitment,
      delegationRoot,
      delegationMerkleProof,
      delegationActionHash,
      delegationAttestation,
    } = req.body || {};

    if (!merchantAddress || !userAddress || !amount || !noteId || !permitSignature) {
      return res.status(400).json({ error: "missing required fields" });
    }
    
    if (!proof || !publicInputs || publicInputs.length !== 4) {
      return res.status(400).json({ error: "proof and publicInputs (4 elements) required" });
    }

    // Check for duplicate active subscription (same user, merchant, amount)
    // PRIVACY NOTE: This check requires decrypting all subscriptions, which is necessary for deduplication
    // In production, consider using a separate deduplication index
    const existingSub = Array.from(subscriptions.entries()).find(([_, sub]) => 
      sub.userAddress.toLowerCase() === userAddress.toLowerCase() &&
      sub.merchantAddress.toLowerCase() === merchantAddress.toLowerCase() &&
      sub.amount === amount &&
      sub.active === true
    );
    
    if (existingSub) {
      logger.log('⚠️ Duplicate subscription detected, cancelling old one', { 
        encryptedSubId: existingSub[0].slice(0, 20) + '...' 
      });
      // Cancel the old subscription
      const oldSub = existingSub[1];
      oldSub.active = false;
      subscriptions.set(existingSub[0], oldSub);
      // Save after cancelling old subscription
      await saveSubscriptions(subscriptions);
    }
    
    // PRIVACY IMPROVEMENT: Generate obfuscated subscription ID
    const { generatePrivateSubscriptionId, encryptSubscriptionId } = await import("../../lib/subscription-id");
    const timestamp = Date.now();
    const subId = generatePrivateSubscriptionId(userAddress, timestamp);
    
    // Encrypt subscription ID for storage (server can't link to user without key)
    const encryptedSubId = encryptSubscriptionId(subId, userAddress);
    
    // For demo: use 10-second intervals to simulate monthly payments
    // In production: interval === "monthly" ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const nextCharge = Date.now() + (10 * 1000); // 10 seconds per payment (simulates 1 month)
    
    // Generate unique noteId per payment for privacy (payment index 0 for first payment)
    // This breaks payment linking - each payment uses a different noteId
    const { generatePrivateNoteId } = await import("../../lib/note-privacy");
    const privateNoteId = generatePrivateNoteId(userAddress, subId, 0);

    logger.log('Creating subscription', { 
      subscriptionId: subId.slice(0, 20) + '...', // Truncate for logging
      encryptedSubId: encryptedSubId.slice(0, 20) + '...',
      merchantAddress: merchantAddress.slice(0, 10) + '...',
      userAddress: userAddress.slice(0, 10) + '...',
      amount 
    });
    
    // Use privacy-enhanced noteId (unique per payment)
    const subscriptionNoteId = privateNoteId || noteId;
    
    // Store with encrypted ID as key for privacy
    subscriptions.set(encryptedSubId, {
      merchantName: merchantName || merchantAddress.slice(0, 10),
      merchantAddress,
      userAddress,
      amount,
      interval: interval || "monthly",
      active: true,
      noteId: subscriptionNoteId,
      paymentIndex: 0, // Track payment index for unique noteId generation
      permitSignature,
      maxAmount,
      expiry,
      nonce,
      proof, // Store proof for use when charging
      publicInputs, // Store public inputs from witness
      nextCharge,
      // Delegation fields (if provided)
      useDelegation: useDelegation || false,
      leafCommitment,
      delegationRoot,
      delegationMerkleProof,
      delegationActionHash,
      delegationAttestation,
    });
    
    if (useDelegation) {
      logger.log('Subscription created with delegation', { 
        subscriptionId: subId.slice(0, 20) + '...',
        hasDelegation: true 
      });
    }

    // Save to file
    await saveSubscriptions(subscriptions);

    return res.status(200).json({ 
      subscriptionId: subId, // Return plain ID to client (client can encrypt for storage)
      encryptedSubscriptionId: encryptedSubId, // Also return encrypted ID for reference
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
    const { subscriptionId, userAddress } = req.body || {};
    
    logger.log('PUT /api/subscription called', { 
      subscriptionId: subscriptionId?.slice(0, 20) + '...',
      hasUserAddress: !!userAddress 
    });
    
    if (!subscriptionId) {
      return res.status(400).json({ error: "subscriptionId required" });
    }

    // PRIVACY IMPROVEMENT: Try to look up by encrypted ID if userAddress provided
    let sub = subscriptions.get(subscriptionId);
    if (!sub && userAddress) {
      const { encryptSubscriptionId } = await import("../../lib/subscription-id");
      const encryptedSubId = encryptSubscriptionId(subscriptionId, userAddress);
      sub = subscriptions.get(encryptedSubId);
    }
    
    logger.log('Looking up subscription', { 
      subscriptionId: subscriptionId.slice(0, 20) + '...',
      found: !!sub 
    });
    
    if (!sub) {
      logger.error('Subscription not found', { 
        subscriptionId: subscriptionId.slice(0, 20) + '...',
        availableCount: subscriptions.size 
      });
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

    // Get merchant's shielded commitment from environment (or use public address)
    const merchantCommitment = process.env.NEXT_PUBLIC_MERCHANT_COMMITMENT || "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    // Build permit struct
    const permit = {
      noteId: sub.noteId,
      merchant: sub.merchantAddress,
      maxAmount: sub.maxAmount,
      expiry: sub.expiry,
      nonce: sub.nonce,
      signature: sub.permitSignature,
      merchantCommitment: merchantCommitment as `0x${string}`, // Shielded address if configured, else public
    };

    // Determine method and arguments based on delegation
    const ADAPTER_ADDR = process.env.NEXT_PUBLIC_X402_ADAPTER || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const executeUrl = `${baseUrl}/api/execute`;
    
    let method: string;
    let args: any[];
    
    if (sub.useDelegation && sub.leafCommitment && sub.delegationRoot && sub.delegationAttestation) {
      // Use delegation-aware method
      method = "takeWithDelegationAnchor";
      
      // For delegation, we need to fetch fresh root and attestation
      try {
        // Fetch latest delegation root
        const rootResp = await fetch(`${baseUrl}/api/delegation-root`);
        if (!rootResp.ok) {
          throw new Error("Failed to fetch delegation root");
        }
        const { root } = await rootResp.json();
        
        // Compute fresh action hash
        const { actionHash, getMerkleProofForDelegation } = await import("../../lib/delegation");
        const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
        const aHash = actionHash({
          method: "takeWithDelegationAnchor",
          recipientOrMid: sub.merchantAddress,
          amount: sub.amount,
          chainId: chainId,
          adapter: ADAPTER_ADDR,
        });
        
        // Get fresh attestation
        const attResp = await fetch(`${baseUrl}/api/nillion/attest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leafCommitment: sub.leafCommitment,
            actionHash: aHash,
            latestRoot: root,
          }),
        });
        
        if (!attResp.ok) {
          throw new Error("Failed to get attestation");
        }
        const { attestation } = await attResp.json();
        
        // Get Merkle proof (use stored or fetch new)
        const merkleProof = sub.delegationMerkleProof || await getMerkleProofForDelegation(sub.leafCommitment as `0x${string}`);
        
        // Generate privacy-preserving nullifier for this payment
        const { generateSubscriptionNullifier } = await import("../../lib/nullifiers");
        const paymentIndex = sub.paymentIndex || 0;
        const nullifier = generateSubscriptionNullifier(
          sub.leafCommitment as `0x${string}`,
          sub.userAddress,
          subscriptionId,
          paymentIndex
        );
        
        // Build DelegationPermit (no maxAmount - verified privately in Nillion attestation)
        const delegationPermit = {
          noteId: sub.noteId,
          merchant: sub.merchantAddress,
          // maxAmount removed - verified in Nillion attestation privately
          expiry: sub.expiry,
          nonce: sub.nonce,
          signature: sub.permitSignature,
          merchantCommitment: "0x0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
        };
        
        // Build args for takeWithDelegationAnchor with DelegationPermit and nullifier
        args = [
          sub.proof,
          sub.publicInputs,
          delegationPermit, // DelegationPermit (no maxAmount)
          sub.merchantAddress, // recipient
          sub.amount,
          root, // latest root
          sub.leafCommitment, // leaf commitment (needed for Merkle proof)
          merkleProof, // Merkle proof
          aHash, // action hash
          attestation, // Nillion attestation
          nullifier, // Privacy-preserving nullifier (unique per payment)
        ];
        
        logger.log('Using delegation-aware method', { method, hasRoot: !!root, hasLeaf: !!sub.leafCommitment });
      } catch (error: any) {
        logger.warn("Delegation setup failed, falling back to regular method", { error: error.message });
        // Fallback to regular method if delegation fails
        method = "take";
        args = [
          sub.proof,
          sub.publicInputs,
          permit,
          sub.merchantAddress,
          sub.amount,
        ];
      }
    } else {
      // Regular method (no delegation)
      method = "take";
      args = [
        sub.proof,
        sub.publicInputs,
        permit,
        sub.merchantAddress, // recipient (merchant receives payment)
        sub.amount,
      ];
    }
    
    logger.log('Calling execute API', { url: executeUrl, adapter: ADAPTER_ADDR, method, argsCount: args.length });
    
    const executeRes = await fetch(executeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adapter: ADAPTER_ADDR,
        method: method,
        args: args,
      }),
    });

    if (!executeRes.ok) {
      const responseText = await executeRes.text();
      logger.error('Execute API error', { status: executeRes.status, errorPreview: responseText.substring(0, 200) });
      
      try {
        const error = JSON.parse(responseText);
        logger.error('Execute API error details', { error: error.message || 'Unknown error' });
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
    
    // Update subscription: increment nonce, payment index, set next charge date, update last charged
    sub.nonce = sub.nonce + 1;
    sub.paymentIndex = (sub.paymentIndex || 0) + 1;
    
    // Generate new unique noteId for next payment (privacy enhancement)
    const { generatePrivateNoteId } = await import("../../lib/note-privacy");
    sub.noteId = generatePrivateNoteId(sub.userAddress, subscriptionId, sub.paymentIndex);
    // For demo: use 10-second intervals to simulate monthly payments
    // In production: sub.interval === "monthly" ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    sub.nextCharge = now + (10 * 1000); // 10 seconds per payment (simulates 1 month)
    sub.lastCharged = now;
    
    // PRIVACY IMPROVEMENT: Store with encrypted ID if using encrypted storage
    const { encryptSubscriptionId } = await import("../../lib/subscription-id");
    const encryptedSubId = encryptSubscriptionId(subscriptionId, sub.userAddress);
    subscriptions.set(encryptedSubId, sub);

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
    const { subscriptionId, userAddress } = req.body || {};
    
    logger.log('DELETE /api/subscription called', { 
      subscriptionId: subscriptionId?.slice(0, 20) + '...',
      hasUserAddress: !!userAddress 
    });
    
    if (!subscriptionId) {
      return res.status(400).json({ error: "subscriptionId required" });
    }

    // PRIVACY IMPROVEMENT: Try to look up by encrypted ID if userAddress provided
    let sub = subscriptions.get(subscriptionId);
    if (!sub && userAddress) {
      const { encryptSubscriptionId } = await import("../../lib/subscription-id");
      const encryptedSubId = encryptSubscriptionId(subscriptionId, userAddress);
      sub = subscriptions.get(encryptedSubId);
    }
    
    if (!sub) {
      return res.status(404).json({ error: "subscription not found" });
    }

    sub.active = false;
    
    // PRIVACY IMPROVEMENT: Store with encrypted ID if using encrypted storage
    const { encryptSubscriptionId } = await import("../../lib/subscription-id");
    const encryptedSubId = encryptSubscriptionId(subscriptionId, sub.userAddress);
    subscriptions.set(encryptedSubId, sub);

    // Save to file
    await saveSubscriptions(subscriptions);

    return res.status(200).json({ message: "subscription cancelled" });
  }

  return res.status(405).json({ error: "method not allowed" });
}

