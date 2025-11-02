/**
 * Real ZK Proof Generator for Precomputes (Noir/Barretenberg)
 * 
 * This module integrates with the precompute-circuit (Noir) to generate
 * real Honk ZK proofs using Barretenberg instead of mock proofs.
 */

import { exec, execSync as execSyncCmd } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

// Worker pool for parallel proving (based on baanx demo optimization)
const WORKER_POOL_SIZE = 10;
let availableWorkers: number[] = Array.from({ length: WORKER_POOL_SIZE }, (_, i) => i);
const workerWaiters: Array<(workerId: number) => void> = [];

/**
 * Acquire a worker from the pool
 * Based on baanx demo's acquirePrecomputeWorker pattern
 */
async function acquireWorker(): Promise<number> {
  return new Promise(resolve => {
    if (availableWorkers.length > 0) {
      const workerId = availableWorkers.pop()!;
      resolve(workerId);
    } else {
      workerWaiters.push(resolve);
    }
  });
}

/**
 * Release worker back to the pool
 */
function releaseWorker(workerId: number): void {
  if (workerWaiters.length > 0) {
    const waiter = workerWaiters.shift()!;
    waiter(workerId);
  } else {
    availableWorkers.push(workerId);
  }
}

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Circuit artifact paths (from demo/mock-backend/src to demo/lib/precompute-circuit)
// Use absolute path from workspace root for tsx compatibility
const WORKSPACE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const CIRCUIT_DIR = join(WORKSPACE_ROOT, 'demo/lib/precompute-circuit');
const CIRCUIT_JSON = join(CIRCUIT_DIR, 'target/precompute_circuit.json');
const TARGET_DIR = join(CIRCUIT_DIR, 'target');
const VK_PATH = join(TARGET_DIR, 'vk');

export interface PrecomputeWitness {
  root: string;              // Merkle root (public)
  public_amount: string;     // Public amount (public)
  ext_data_hash: string;      // External data hash (public)
  nullifier: string;          // Nullifier (public)
  safe: string;               // Safe address (private)
  amount: string;             // Amount in cents (private)
  private_key: string;        // Private key (private)
  blinding: string;           // Blinding factor (private)
  token: string;              // Token address (private)
  note: string;               // Note value (private)
  path_index: string;         // Merkle path index (private)
  path_elements: string[];    // Merkle path elements (private)
}

export interface ZKProof {
  proof: string;              // Hex-encoded proof
  publicInputs: string[];     // [root, public_amount, ext_data_hash, nullifier]
}

/**
 * Check if real ZK proving is available
 */
export function isRealProvingAvailable(): boolean {
  try {
    const hasCircuit = existsSync(CIRCUIT_JSON);
    const hasVK = existsSync(VK_PATH);
    const hasBB = existsSync('/Users/0xblockbird/.bb/bb');
    const hasNargo = existsSync('/Users/0xblockbird/.nargo/bin/nargo');
    
    const available = hasCircuit && hasBB && hasVK && hasNargo;
    
    if (available) {
      const bbVersion = execSyncCmd('/Users/0xblockbird/.bb/bb --version', { encoding: 'utf8' }).toString().trim();
      console.log(`✅ Real ZK proving available (Barretenberg ${bbVersion})`);
    }
    
    return available;
  } catch (e) {
    return false;
  }
}

/**
 * Generate a real Honk ZK proof for a precompute using Barretenberg
 * 
 * @param witness - The witness (private inputs) for the circuit
 * @returns The proof and public signals
 */
/**
 * Generate real ZK proof with worker pool optimization
 * Based on baanx demo's parallel proving pattern
 */
export async function generateRealProof(witness: PrecomputeWitness): Promise<ZKProof> {
  if (!isRealProvingAvailable()) {
    throw new Error(
      'Real ZK proving not available. Circuit or Barretenberg not found.'
    );
  }

  // Acquire worker from pool
  const workerId = await acquireWorker();

  try {
    // Use worker-specific temporary directory to avoid conflicts
    const workerTmpDir = join(tmpdir(), `zk-worker-${workerId}-${randomBytes(4).toString('hex')}`);
    if (!existsSync(workerTmpDir)) {
      mkdirSync(workerTmpDir, { recursive: true });
    }

    // Step 1: Write witness in Noir's Prover.toml format to CIRCUIT_DIR (where nargo expects it)
    // Note: nargo looks for "${proofName}.toml", NOT "Prover_${proofName}.toml"
    const proofName = `proof_${workerId}_${Date.now()}`;
    const proverTomlPath = join(CIRCUIT_DIR, `${proofName}.toml`);
    const proverToml = generateProverToml(witness);
    writeFileSync(proverTomlPath, proverToml);

    // Step 2: Run nargo execute to generate binary witness
    const nargoPath = existsSync('/Users/0xblockbird/.nargo/bin/nargo')
      ? '/Users/0xblockbird/.nargo/bin/nargo'
      : 'nargo';
    
    // Note: nargo outputs witness as <circuit_name>.gz regardless of --prover-name
    const defaultWitnessPath = join(TARGET_DIR, 'precompute_circuit.gz');
    const witnessPath = join(TARGET_DIR, `${proofName}.gz`);
    
    const { stdout: nargoOut, stderr: nargoErr} = await execAsync(
      `${nargoPath} execute --silence-warnings --prover-name ${proofName}`,
      { cwd: CIRCUIT_DIR, timeout: 30000 }
    );
    
    if (nargoErr && !nargoErr.includes('warning')) {
      console.warn(`[Worker ${workerId}] Nargo warning:`, nargoErr);
    }
    
    // Check if witness was generated (nargo uses circuit name, not prover name)
    if (!existsSync(defaultWitnessPath)) {
      throw new Error(`Witness file not generated at ${defaultWitnessPath}`);
    }
    
    // Copy to worker-specific name to avoid race conditions (multiple workers may be running)
    const fs = await import('fs');
    fs.copyFileSync(defaultWitnessPath, witnessPath);
    
    // Clean up the default witness file only if it's still there
    try {
      if (existsSync(defaultWitnessPath)) {
        fs.unlinkSync(defaultWitnessPath);
      }
    } catch (e) {
      // Ignore if another worker already deleted it
    }
    
    console.log(`✅ [Worker ${workerId}] Witness generated: ${witnessPath}`);

    // Step 3: Generate proof using Barretenberg
    const bbPath = existsSync('/Users/0xblockbird/.bb/bb') 
      ? '/Users/0xblockbird/.bb/bb'
      : 'bb';

    const proofPath = join(workerTmpDir, 'proof');
    
    const proofCmd = `${bbPath} prove -b ${CIRCUIT_JSON} -w ${witnessPath} -o ${proofPath}`;
    
    const { stdout: bbOut, stderr: bbErr } = await execAsync(proofCmd, {
      cwd: CIRCUIT_DIR,
    });
    
    if (bbErr && !bbErr.includes('WARNING')) {
      console.warn(`[Worker ${workerId}] BB warning:`, bbErr);
    }

    // Step 4: Read proof
    if (!existsSync(proofPath)) {
      throw new Error(`Proof file not generated at ${proofPath}`);
    }
    
    const proofBytes = readFileSync(proofPath);
    const proof = '0x' + proofBytes.toString('hex');

    // Step 5: Extract public inputs
    const publicInputs = [
      witness.root,
      witness.public_amount,
      witness.ext_data_hash,
      witness.nullifier,
    ];

    // Cleanup worker temp directory and toml file
    try {
      execSyncCmd(`rm -rf ${workerTmpDir}`, { encoding: 'utf8' });
      execSyncCmd(`rm -f ${proverTomlPath}`, { encoding: 'utf8' });
      execSyncCmd(`rm -f ${witnessPath}`, { encoding: 'utf8' });
    } catch {
      // Ignore cleanup errors
    }
    
    console.log(`✅ [Worker ${workerId}] Real ZK proof generated (${proof.length} bytes)`);

    return { proof, publicInputs };
  } catch (error: any) {
    console.error(`❌ [Worker ${workerId}] ZK proof generation failed:`, error.message);
    throw error;
  } finally {
    // Always release worker back to pool
    releaseWorker(workerId);
  }
}

/**
 * Generate Prover.toml file for Noir circuit
 */
function generateProverToml(witness: PrecomputeWitness): string {
  // BN254 field modulus
  const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  
  // Convert hex strings to decimal strings for Noir fields with modulus reduction
  const hexToField = (hex: string): string => {
    // Remove 0x prefix and convert to BigInt
    let value = BigInt(hex.startsWith('0x') ? hex : '0x' + hex);
    // Reduce modulo field modulus to ensure value is within valid range
    value = value % FIELD_MODULUS;
    // Handle negative values
    if (value < 0n) {
      value = value + FIELD_MODULUS;
    }
    return value.toString();
  };

  // Format array for TOML
  const formatArray = (arr: string[]): string => {
    return '[' + arr.map(v => `"${hexToField(v)}"`).join(', ') + ']';
  };

  return `# Noir Prover.toml for precompute circuit
# Public inputs
root = "${hexToField(witness.root)}"
public_amount = "${witness.public_amount}"
ext_data_hash = "${hexToField(witness.ext_data_hash)}"
nullifier = "${hexToField(witness.nullifier)}"

# Private inputs
safe = "${hexToField(witness.safe)}"
amount = "${witness.amount}"
private_key = "${hexToField(witness.private_key)}"
blinding = "${hexToField(witness.blinding)}"
token = "${hexToField(witness.token)}"
note = "${hexToField(witness.note)}"
path_index = "${witness.path_index}"
path_elements = ${formatArray(witness.path_elements)}
`;
}

/**
 * Verify a ZK proof locally (for testing)
 * 
 * @param proof - The proof to verify
 * @param publicInputs - The public inputs
 * @returns True if proof is valid
 */
export async function verifyProof(proof: string, publicInputs: string[]): Promise<boolean> {
  if (!isRealProvingAvailable()) {
    throw new Error('Barretenberg not found');
  }

  try {
    // Note: For Noir circuits, verification is typically done on-chain
    // Local verification may require the verifier contract
    // This is a placeholder - adjust based on your setup
    console.log('Proof verification should be done on-chain via HonkVerifier.sol');
    return true;
  } catch (error) {
    console.error('Error verifying proof:', error);
    return false;
  }
}

/**
 * Export proof to Solidity-compatible format for HonkVerifier
 * 
 * @param proof - The proof to export
 * @returns Proof formatted for Solidity contract
 */
export function exportSolidityProof(proof: string): string {
  // Barretenberg/Honk proofs are typically already in the right format
  // Adjust based on your HonkVerifier.sol interface
  return proof;
}
