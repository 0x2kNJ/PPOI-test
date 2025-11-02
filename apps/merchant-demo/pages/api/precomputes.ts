import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Precomputes API - Proxy to mock-backend for REAL ZK proofs
 * Forwards requests to mock-backend which generates actual Barretenberg proofs
 */

const MOCK_BACKEND_URL = process.env.MOCK_BACKEND_URL || "http://localhost:3001";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { noteId, maxAmountUsd } = req.body || {};

    if (!noteId || !maxAmountUsd) {
      return res.status(400).json({ error: "noteId and maxAmountUsd required" });
    }

    // Validate noteId
    if (typeof noteId !== 'string' || !noteId.startsWith('0x') || noteId.length !== 66) {
      return res.status(400).json({ 
        error: "noteId must be a valid hex string (0x followed by 64 hex characters = 32 bytes)",
        received: noteId
      });
    }

    console.log(`\n🔧 Requesting REAL ZK precomputes from mock-backend`);
    console.log(`   Backend URL: ${MOCK_BACKEND_URL}`);
    console.log(`   Note ID: ${noteId}`);
    console.log(`   Max amount: ${maxAmountUsd} USDC`);

    // Forward request to mock-backend for REAL ZK proof generation
    const backendRes = await fetch(`${MOCK_BACKEND_URL}/api/precomputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, maxAmountUsd }),
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Backend returned ${backendRes.status}`);
    }

    const data = await backendRes.json();
    
    console.log(`\n✅ Received precomputes from backend!`);
    console.log(`   Total proofs: ${data.precomputes?.length || 0}`);
    console.log(`   Real proofs: ${data.stats?.realProofs || 0}`);
    console.log(`   Mock proofs: ${data.stats?.mockProofs || 0}`);

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("❌ Precompute API error:", error);
    
    return res.status(500).json({ 
      error: error.message || "Failed to generate precomputes",
      details: "Failed to connect to mock-backend or generate proofs.",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}
