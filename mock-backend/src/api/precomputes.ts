/**
 * Mock Backend API - Precomputes Generation
 * This service has the SDK fully installed and working
 */

import { Request, Response } from 'express';
import { generateAllPrecomputes } from '../precomputeGenerator.js';
import { CENT_BUCKETS } from '../amountBuckets.js';

export async function handlePrecomputes(req: Request, res: Response) {
  try {
    const { noteId, maxAmountUsd } = req.body || {};

    if (!noteId || !maxAmountUsd) {
      return res.status(400).json({ error: "noteId and maxAmountUsd required" });
    }

    // Validate noteId is a valid hex string (64 chars = 32 bytes)
    if (typeof noteId !== 'string' || !noteId.startsWith('0x') || noteId.length !== 66) {
      return res.status(400).json({ 
        error: "noteId must be a valid hex string (0x followed by 64 hex characters = 32 bytes)",
        received: noteId
      });
    }

    // Convert maxAmount (USDC) to cents
    const maxAmountCents = Math.round(parseFloat(maxAmountUsd) * 100);
    const buckets = CENT_BUCKETS; // 17 buckets for $1,000 limit
    
    console.log(`\n🔧 Mock-backend: Generating REAL ZK precomputes for noteId: ${noteId}`);
    console.log(`   Max amount: ${maxAmountUsd} USDC (${maxAmountCents} cents)`);
    console.log(`   Buckets: ${buckets.length} buckets (truncated ladder)`);
    console.log(`   REAL ZK PROOFS ONLY`);

    // Generate all precomputes with REAL ZK proofs
    let lastProgress = 0;
    const precomputes = await generateAllPrecomputes(
      noteId,
      maxAmountCents,
      buckets,
      undefined,
      {
        parallel: true,
        batchSize: 10,
        onProgress: (completed: number, total: number) => {
          const progress = Math.round((completed / total) * 100);
          if (progress !== lastProgress) {
            console.log(`📊 Progress: ${completed}/${total} (${progress}%)`);
            lastProgress = progress;
          }
        }
      }
    );
    
    const realProofCount = precomputes.filter((p: any) => p.isRealProof).length;
    const totalProofs = precomputes.length;
    
    console.log(`\n✅ Mock-backend: Generation complete!`);
    console.log(`   Real ZK proofs: ${realProofCount}/${totalProofs}`);
    console.log(`   Total: ${totalProofs}`);

    return res.status(200).json({
      success: true,
      precomputes: precomputes.map((p) => ({
        bucketAmount: p.bucketAmount,
        bucketAmountUsd: (p.bucketAmount / 100).toFixed(2),
        proofId: p.proofId,
        proof: p.proof,
        publicInputs: p.publicInputs,
        isRealProof: p.isRealProof,
        timestamp: p.timestamp,
      })),
      stats: {
        total: precomputes.length,
        realProofs: realProofCount,
        mockProofs: totalProofs - realProofCount,
      }
    });
  } catch (error: any) {
    console.error("❌ Mock-backend: Real ZK precompute generation error:", error);
    
    return res.status(500).json({ 
      error: error.message || "Real ZK precompute generation failed",
      details: error.stack,
    });
  }
}

