/**
 * Real ZK Proof Generator - copied from mock-backend for Next.js API routes
 * This ensures we can generate real ZK proofs without external module dependencies
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

// Worker pool for parallel proving
const WORKER_POOL_SIZE = 10;
let availableWorkers: number[] = Array.from({ length: WORKER_POOL_SIZE }, (_, i) => i);
const workerWaiters: Array<(workerId: number) => void> = [];

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

function releaseWorker(workerId: number): void {
  if (workerWaiters.length > 0) {
    const waiter = workerWaiters.shift()!;
    waiter(workerId);
  } else {
    availableWorkers.push(workerId);
  }
}

// Circuit paths
const CIRCUIT_DIR = join(process.cwd(), "..", "..", "..", "demo", "lib", "precompute-circuit");
const CIRCUIT_JSON = join(CIRCUIT_DIR, "circuit.json");
const TARGET_DIR = join(CIRCUIT_DIR, "target");
const VK_PATH = join(TARGET_DIR, "vk");

export interface PrecomputeWitness {
  root: string;
  public_amount: string;
  ext_data_hash: string;
  nullifier: string;
  safe: string;
  amount: string;
  private_key: string;
  blinding: string;
  token: string;
  note: string;
  path_index: string;
  path_elements: string[];
}

export interface ZKProof {
  proof: string;
  publicInputs: string[];
}

export function isRealProvingAvailable(): boolean {
  try {
    // Check for circuit JSON
    if (!existsSync(CIRCUIT_JSON)) {
      return false;
    }
    
    // Check for nargo
    const nargoPath = existsSync('/Users/0xblockbird/.nargo/bin/nargo')
      ? '/Users/0xblockbird/.nargo/bin/nargo'
      : 'nargo';
    
    try {
      require('child_process').execSync(`${nargoPath} --version`, { encoding: 'utf8', stdio: 'ignore' });
    } catch {
      return false;
    }
    
    // Check for bb (Barretenberg)
    const bbPath = existsSync('/Users/0xblockbird/.bb/bb')
      ? '/Users/0xblockbird/.bb/bb'
      : 'bb';
    
    try {
      require('child_process').execSync(`${bbPath} --version`, { encoding: 'utf8', stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

function generateProverToml(witness: PrecomputeWitness): string {
  const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  
  const hexToField = (value: string): string => {
    // Handle both hex strings (0x...) and decimal strings (including negative)
    let fieldValue: bigint;
    
    if (value.startsWith('0x')) {
      // Hex string
      fieldValue = BigInt(value);
    } else {
      // Decimal string (can be negative)
      fieldValue = BigInt(value);
    }
    
    // Convert to field modulus representation
    fieldValue = fieldValue % FIELD_MODULUS;
    if (fieldValue < 0n) {
      fieldValue = fieldValue + FIELD_MODULUS;
    }
    
    return fieldValue.toString();
  };

  const formatArray = (arr: string[]): string => {
    return '[' + arr.map(v => `"${hexToField(v)}"`).join(', ') + ']';
  };

  return `# Noir Prover.toml for precompute circuit
root = "${hexToField(witness.root)}"
public_amount = "${hexToField(witness.public_amount)}"
ext_data_hash = "${hexToField(witness.ext_data_hash)}"
nullifier = "${hexToField(witness.nullifier)}"

safe = "${hexToField(witness.safe)}"
amount = "${hexToField(witness.amount)}"
private_key = "${hexToField(witness.private_key)}"
blinding = "${hexToField(witness.blinding)}"
token = "${hexToField(witness.token)}"
note = "${hexToField(witness.note)}"
path_index = "${witness.path_index}"
path_elements = ${formatArray(witness.path_elements)}
`;
}

export async function generateRealProof(witness: PrecomputeWitness): Promise<ZKProof> {
  if (!isRealProvingAvailable()) {
    throw new Error(
      'Real ZK proving not available. Circuit or Barretenberg not found.'
    );
  }

  const workerId = await acquireWorker();

  try {
    const workerTmpDir = join(tmpdir(), `zk-worker-${workerId}-${randomBytes(4).toString('hex')}`);
    if (!existsSync(workerTmpDir)) {
      mkdirSync(workerTmpDir, { recursive: true });
    }

    // Step 1: Write Prover.toml in the circuit directory with a unique name
    // nargo execute expects the prover file in the circuit directory, not the temp dir
    const proverName = `Prover_worker_${workerId}_${randomBytes(4).toString('hex')}`;
    const proverTomlPath = join(CIRCUIT_DIR, `${proverName}.toml`);
    const proverToml = generateProverToml(witness);
    writeFileSync(proverTomlPath, proverToml);

    const nargoPath = existsSync('/Users/0xblockbird/.nargo/bin/nargo')
      ? '/Users/0xblockbird/.nargo/bin/nargo'
      : 'nargo';
    
    // Witness will be generated in the circuit's target directory
    const witnessName = `precompute_circuit_${workerId}_${randomBytes(4).toString('hex')}`;
    const witnessPath = join(CIRCUIT_DIR, 'target', `${witnessName}.gz`);
    
    // Ensure target directory exists
    const targetDir = join(CIRCUIT_DIR, 'target');
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    
    // Compile first, then execute
    // nargo execute looks for Prover.toml in the circuit directory
    // Use --prover-name to specify the toml file name (without .toml extension)
    const { stdout: nargoOut, stderr: nargoErr } = await execAsync(
      `${nargoPath} compile && ${nargoPath} execute --silence-warnings --prover-name ${proverName} ${witnessName}`,
      { cwd: CIRCUIT_DIR }
    );
    
    if (nargoErr && !nargoErr.includes('warning')) {
      console.warn(`[Worker ${workerId}] Nargo warning:`, nargoErr);
    }
    
    if (!existsSync(witnessPath)) {
      throw new Error(`Witness file not generated at ${witnessPath}`);
    }

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

    if (!existsSync(proofPath)) {
      throw new Error(`Proof file not generated at ${proofPath}`);
    }
    
    const proofBytes = readFileSync(proofPath);
    const proof = '0x' + proofBytes.toString('hex');

    const publicInputs = [
      witness.root,
      witness.public_amount,
      witness.ext_data_hash,
      witness.nullifier,
    ];

    // Cleanup: remove Prover.toml and witness file
    try {
      if (existsSync(proverTomlPath)) {
        require('child_process').execSync(`rm -f ${proverTomlPath}`, { encoding: 'utf8' });
      }
      if (existsSync(witnessPath)) {
        require('child_process').execSync(`rm -f ${witnessPath}`, { encoding: 'utf8' });
      }
      if (existsSync(workerTmpDir)) {
        require('child_process').execSync(`rm -rf ${workerTmpDir}`, { encoding: 'utf8' });
      }
    } catch {
      // Ignore cleanup errors
    }

    return { proof, publicInputs };
  } catch (error: any) {
    console.error(`❌ [Worker ${workerId}] ZK proof generation failed:`, error.message);
    throw error;
  } finally {
    releaseWorker(workerId);
  }
}

export function generateMockProof(): ZKProof {
  throw new Error("Mock proofs are disabled. Only real ZK proofs are allowed.");
}

