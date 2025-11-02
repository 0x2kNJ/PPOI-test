/**
 * Precompute Generator with Real ZK Proofs
 * 
 * Generates precomputes using real ZK proofs when circuit is available,
 * falls back to mock proofs otherwise.
 */

import { CentAmount } from './amountBuckets.js';
import { 
  generateRealProof, 
  isRealProvingAvailable,
  PrecomputeWitness,
  ZKProof 
} from './zkProver.js';

export interface Precompute {
  bucketAmount: CentAmount;
  proofId: string;
  witness: PrecomputeWitness;
  proof: string;  // Hex-encoded proof
  publicInputs: string[];
  timestamp: number;
  isRealProof: boolean;  // Track if this is a real ZK proof
}

/**
 * Generate a precompute (with real ZK proof using valid witness)
 */
export async function generatePrecompute(
  noteId: string,
  bucketAmount: CentAmount,
  remainingBalance: CentAmount,
  nonce: number,
  merkleRoot?: string
): Promise<Precompute> {
  const proofId = `precompute_${bucketAmount}_${Date.now()}_${nonce}`;
  
  // Generate deterministic private inputs based on noteId and nonce
  const crypto = await import('crypto');
  const seed = `${noteId}_${bucketAmount}_${nonce}`;
  const seedHash = crypto.createHash('sha256').update(seed).digest();
  
  const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  const private_key = BigInt('0x' + seedHash.slice(0, 16).toString('hex')) % FIELD_MODULUS;
  const blinding = BigInt('0x' + seedHash.slice(16, 32).toString('hex')) % FIELD_MODULUS;
  const token = BigInt('1184589422945421143511828701991100965039074119625'); // USDC token
  const safe = BigInt('0x' + noteId.slice(2, 42).padStart(64, '0')) % FIELD_MODULUS;
  const note = safe;
  const amount = BigInt(bucketAmount);
  const public_amount = -amount; // Circuit requires amount + public_amount == 0
  const path_index = BigInt(nonce % 8388608);
  const path_elements = Array(23).fill(0n);
  const ext_data_hash = 0n;

  // Compute valid witness using SDK's cryptographic operations
  const { generateValidWitness } = await import('./witnessGenerator.js');
  const witnessData = await generateValidWitness({
    private_key,
    amount,
    blinding,
    token,
    safe,
    note,
    path_index,
    path_elements,
    public_amount,
    ext_data_hash,
  });
  
  // Convert to PrecomputeWitness format
  const witness: PrecomputeWitness = {
    root: witnessData.root,
    public_amount: witnessData.public_amount,
    ext_data_hash: witnessData.ext_data_hash,
    nullifier: witnessData.nullifier,
    safe: witnessData.safe,
    amount: witnessData.amount,
    private_key: witnessData.private_key,
    blinding: witnessData.blinding,
    token: witnessData.token,
    note: witnessData.note,
    path_index: witnessData.path_index,
    path_elements: witnessData.path_elements,
  };

  // Generate REAL ZK proof only - no fallback
  if (!isRealProvingAvailable()) {
    throw new Error(
      'Real ZK proving not available. Circuit or Barretenberg not found. ' +
      'Please ensure:\n' +
      '1. Circuit is built: cd demo/lib/precompute-circuit && nargo compile\n' +
      '2. Verifier key exists: demo/lib/precompute-circuit/target/vk\n' +
      '3. Barretenberg is installed: bb --version\n' +
      '4. Nargo is installed: nargo --version'
    );
  }
  
  console.log(`Generating REAL ZK proof for $${(bucketAmount / 100).toFixed(2)}...`);
  const zkProof: ZKProof = await generateRealProof(witness);
  
  // Use proof directly (already hex-encoded)
  const proof = zkProof.proof;
  const publicInputs = zkProof.publicInputs;
  
  console.log(`✅ Real ZK proof generated (${proof.length} bytes)`);

  return {
    bucketAmount,
    proofId,
    witness,
    proof,
    publicInputs,
    timestamp: Date.now(),
    isRealProof: true, // Always true now
  };
}

/**
 * Generate precomputes for all buckets in PARALLEL
 * Based on baanx demo optimization with worker pool pattern
 */
export async function generateAllPrecomputes(
  noteId: string,
  totalBalance: CentAmount,
  buckets: CentAmount[],
  merkleRoot?: string,
  options?: {
    parallel?: boolean;
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<Precompute[]> {
  const { 
    parallel = true, 
    batchSize = 10, 
    onProgress 
  } = options || {};

  // Verify real proving is available before starting
  if (!isRealProvingAvailable()) {
    throw new Error(
      'Real ZK proving not available. Circuit or Barretenberg not found. ' +
      'Mock proofs are no longer supported.'
    );
  }

  if (!parallel) {
    // Sequential generation if parallel disabled
    return generateAllPrecomputesSequential(noteId, totalBalance, buckets, merkleRoot, onProgress);
  }

  // PARALLEL GENERATION (10-20x faster for real ZK proofs)
  console.log(`\n⚡ Generating ${buckets.length} precomputes in parallel...`);
  const startTime = Date.now();

  const precomputes: Precompute[] = [];
  const totalBuckets = buckets.length;
  let completed = 0;

  // Process in batches to avoid overwhelming CPU/memory
  const batches = Math.ceil(totalBuckets / batchSize);

  for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
    const batchStart = batchIdx * batchSize;
    const batchEnd = Math.min((batchIdx + 1) * batchSize, totalBuckets);
    const batchBuckets = buckets.slice(batchStart, batchEnd);

    console.log(`\n📦 Batch ${batchIdx + 1}/${batches}: Generating ${batchBuckets.length} proofs in parallel...`);

    // Generate batch in parallel using Promise.all()
    const batchPromises = batchBuckets.map((bucket, idx) => {
      const globalIdx = batchStart + idx;
      const currentBalance = totalBalance; // All proofs use same initial balance
      return generatePrecompute(noteId, bucket, currentBalance, globalIdx, merkleRoot);
    });

    // Wait for entire batch to complete
    const batchResults = await Promise.all(batchPromises);
    precomputes.push(...batchResults);

    completed += batchBuckets.length;
    if (onProgress) {
      onProgress(completed, totalBuckets);
    }

    console.log(`✓ Batch ${batchIdx + 1}/${batches} complete (${completed}/${totalBuckets} proofs)`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ All ${totalBuckets} precomputes generated in ${duration}s (parallel)`);
  console.log(`   Average: ${(parseFloat(duration) / totalBuckets).toFixed(2)}s per proof`);

  return precomputes;
}

/**
 * Sequential generation (fallback for mock proofs)
 */
async function generateAllPrecomputesSequential(
  noteId: string,
  totalBalance: CentAmount,
  buckets: CentAmount[],
  merkleRoot?: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Precompute[]> {
  const precomputes: Precompute[] = [];
  let currentBalance = totalBalance;

  console.log(`\n🔄 Generating ${buckets.length} precomputes sequentially...`);

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    const precompute = await generatePrecompute(
      noteId,
      bucket,
      currentBalance,
      i,
      merkleRoot
    );
    
    precomputes.push(precompute);
    currentBalance -= bucket;

    if (onProgress) {
      onProgress(i + 1, buckets.length);
    }
  }

  return precomputes;
}

