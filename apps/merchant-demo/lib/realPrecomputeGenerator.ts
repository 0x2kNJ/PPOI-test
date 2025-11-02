/**
 * Real Precompute Generator - using real ZK proofs only
 * NO mock proof fallback - this will fail if real ZK proofs can't be generated
 */

import { CentAmount } from './amountBuckets';
import { 
  generateRealProof, 
  isRealProvingAvailable,
  PrecomputeWitness,
  ZKProof 
} from './realZkProver';

export interface Precompute {
  bucketAmount: CentAmount;
  proofId: string;
  witness: PrecomputeWitness;
  proof: string;
  publicInputs: string[];
  timestamp: number;
  isRealProof: boolean;
}

function encodeProofForSolidity(proof: string): string {
  // Proof is already hex-encoded
  if (!proof.startsWith('0x')) {
    return '0x' + proof;
  }
  return proof;
}

export async function generatePrecompute(
  noteId: string,
  bucketAmount: CentAmount,
  remainingBalance: CentAmount,
  nonce: number,
  merkleRoot?: string
): Promise<Precompute> {
  const proofId = `precompute_${bucketAmount}_${Date.now()}_${nonce}`;
  
  // Generate deterministic private inputs based on noteId and nonce
  // This ensures we use consistent values that can satisfy constraints
  const seed = `${noteId}_${bucketAmount}_${nonce}`;
  const seedHash = require('crypto').createHash('sha256').update(seed).digest();
  
  const private_key = BigInt('0x' + seedHash.slice(0, 16).toString('hex')) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  const blinding = BigInt('0x' + seedHash.slice(16, 32).toString('hex')) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  const token = BigInt('1184589422945421143511828701991100965039074119625'); // USDC token address
  const safe = BigInt('0x' + noteId.slice(2, 42).padStart(64, '0')) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  const note = safe; // Use same value for note
  const amount = BigInt(bucketAmount);
  const public_amount = -amount; // Circuit requires amount + public_amount == 0
  const path_index = BigInt(nonce % 8388608); // Use nonce for path_index (within valid range)
  const path_elements = Array(23).fill(0n); // Use zeros for merkle path (valid for empty tree)
  const ext_data_hash = 0n;

  // Compute valid witness using proper cryptographic operations
  // This matches the circuit's hash computations
  const { generateValidWitness } = await import('./witnessGenerator');
  const witness = await generateValidWitness({
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
  
  const witnessTyped: PrecomputeWitness = {
    root: witness.root,
    public_amount: witness.public_amount,
    ext_data_hash: witness.ext_data_hash,
    nullifier: witness.nullifier,
    safe: witness.safe,
    amount: witness.amount,
    private_key: witness.private_key,
    blinding: witness.blinding,
    token: witness.token,
    note: witness.note,
    path_index: witness.path_index,
    path_elements: witness.path_elements,
  };

  // ONLY real ZK proofs - no fallback
  if (!isRealProvingAvailable()) {
    throw new Error(
      'Real ZK proving not available. Please ensure:\n' +
      '1. Circuit is compiled: cd demo/lib/precompute-circuit && nargo compile\n' +
      '2. Barretenberg is installed: bb --version\n' +
      '3. Circuit JSON exists at: demo/lib/precompute-circuit/circuit.json'
    );
  }

  console.log(`Generating REAL ZK proof for $${(bucketAmount / 100).toFixed(2)}...`);
  const zkProof: ZKProof = await generateRealProof(witnessTyped);
  
  const proof = encodeProofForSolidity(zkProof.proof);
  const publicInputs = zkProof.publicInputs;

  return {
    bucketAmount,
    proofId,
    witness: witnessTyped,
    proof,
    publicInputs,
    timestamp: Date.now(),
    isRealProof: true, // Always true - no mock fallback
  };
}

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

  if (!isRealProvingAvailable()) {
    throw new Error(
      'Real ZK proving not available. Cannot generate precomputes without real ZK proofs.\n' +
      'Please ensure circuit and Barretenberg are properly set up.'
    );
  }

  // PARALLEL GENERATION with real ZK proofs only
  console.log(`\n⚡ Generating ${buckets.length} precomputes in parallel with REAL ZK proofs...`);
  const startTime = Date.now();

  const precomputes: Precompute[] = [];
  const totalBuckets = buckets.length;
  let completed = 0;

  const batches = Math.ceil(totalBuckets / batchSize);

  for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
    const batchStart = batchIdx * batchSize;
    const batchEnd = Math.min((batchIdx + 1) * batchSize, totalBuckets);
    const batchBuckets = buckets.slice(batchStart, batchEnd);

    console.log(`\n📦 Batch ${batchIdx + 1}/${batches}: Generating ${batchBuckets.length} REAL ZK proofs in parallel...`);

    const batchPromises = batchBuckets.map((bucket, idx) => {
      const globalIdx = batchStart + idx;
      const currentBalance = totalBalance;
      return generatePrecompute(noteId, bucket, currentBalance, globalIdx, merkleRoot);
    });

    const batchResults = await Promise.all(batchPromises);
    precomputes.push(...batchResults);

    completed += batchBuckets.length;
    if (onProgress) {
      onProgress(completed, totalBuckets);
    }

    console.log(`✓ Batch ${batchIdx + 1}/${batches} complete (${completed}/${totalBuckets} REAL ZK proofs)`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ All ${totalBuckets} precomputes generated with REAL ZK proofs in ${duration}s (parallel)`);
  console.log(`   Average: ${(parseFloat(duration) / totalBuckets).toFixed(2)}s per proof`);
  console.log(`   ALL proofs are real ZK proofs (no mocks)`);

  return precomputes;
}

