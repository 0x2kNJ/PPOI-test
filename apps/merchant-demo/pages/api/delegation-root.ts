import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";
import AnchorAbi from "../../abis/DelegationAnchor.json";
import { createSafeLogger } from "../../lib/sanitize";

const logger = createSafeLogger("DelegationRoot");

const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const ANCHOR_ADDR = process.env.NEXT_PUBLIC_DELEGATION_ANCHOR;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!ANCHOR_ADDR) {
    logger.error("NEXT_PUBLIC_DELEGATION_ANCHOR not set in environment");
    return res.status(500).json({ 
      error: "DelegationAnchor contract address not configured",
      hint: "Set NEXT_PUBLIC_DELEGATION_ANCHOR in .env.local"
    });
  }

  try {
    logger.log("Fetching delegation root", { anchor: ANCHOR_ADDR });
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const anchor = new ethers.Contract(ANCHOR_ADDR, AnchorAbi, provider);
    const root = await anchor.latestRoot();
    
    logger.log("Fetched delegation root", { root: root.slice(0, 10) + '...' });
    return res.status(200).json({ 
      root,
      anchor: ANCHOR_ADDR 
    });
  } catch (e: any) {
    logger.error("Failed to fetch delegation root", { error: e?.message || 'Unknown error' });
    return res.status(500).json({ 
      error: e?.message || "failed to fetch root",
      details: e?.reason || "Unknown error"
    });
  }
}

