/**
 * Generate valid witness values for precompute circuit
 * Uses SDK's Utxo class to compute commitments and nullifiers correctly
 * This matches the circuit's hash operations exactly
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

// Lazy load SDK classes
let KeyPair: any;
let Utxo: any;
let poseidon2_compression: any;
let computeMerkleRoot: any;
let bigint2bytes: any;

async function initSDK() {
  if (KeyPair) return; // Already initialized
  
  try {
    // Use relative path from merchant-demo to SDK build directory
    // This works in Next.js API routes which run in Node.js context
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Use relative path that webpack can resolve
    // Path from merchant-demo/lib/ to SDK build: ../../../ui/lib/sdk/build/src
    // Webpack will resolve this via next.config.js module resolution
    const keypairModule = await import('../../../ui/lib/sdk/build/src/keypair.js');
    const utxoModule = await import('../../../ui/lib/sdk/build/src/utxo.js');
    const utilsModule = await import('../../../ui/lib/sdk/build/src/utils.js');
    
    KeyPair = keypairModule.default;
    Utxo = utxoModule.default;
    poseidon2_compression = utilsModule.poseidon2_compression;
    bigint2bytes = utilsModule.bigint2bytes;
    
    // Implement computeMerkleRoot using SDK's poseidon2_compression
    // This matches the circuit's merkle proof computation
    computeMerkleRoot = (levels: number, leaf: bigint, path: bigint[], index: bigint): bigint => {
      let node = leaf;
      for (let i = 0; i < levels; i++) {
        const bit = (index >> BigInt(i)) & 1n;
        const sibling = path[i] || 0n;
        if (bit === 0n) {
          node = poseidon2_compression(node, sibling); // hash_2
        } else {
          node = poseidon2_compression(sibling, node); // hash_2
        }
      }
      return node;
    };
    
    console.log('✅ Using SDK classes for witness generation');
  } catch (error: any) {
    console.error('❌ Failed to import SDK:', error.message);
    throw new Error(
      'SDK is required for real ZK proof generation.\n' +
      'Please ensure SDK is built: cd demo/ui/lib/sdk && npm install && npm run build\n' +
      'Error: ' + error.message
    );
  }
}

/**
 * Generate valid witness that satisfies circuit constraints
 * This computes nullifier and root from private inputs correctly
 */
export async function generateValidWitness(params: {
  private_key: bigint;
  amount: bigint;
  blinding: bigint;
  token: bigint;
  safe: bigint;
  note: bigint;
  path_index: bigint;
  path_elements: bigint[];
  public_amount: bigint; // Must equal -amount
  ext_data_hash: bigint;
}): Promise<{
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
}> {
  // Initialize SDK classes (loads Utxo, KeyPair, etc.)
  await initSDK();
  
  const { private_key, amount, blinding, token, safe, note, path_index, path_elements, public_amount, ext_data_hash } = params;

  // Use SDK's Utxo class to compute commitment and nullifier correctly
  // This matches the circuit's hash operations exactly
  
  // 1. Create KeyPair from private key
  const keypair = KeyPair.fromScalar(private_key.toString());
  
  // 2. Convert token, safe, note to bytes (matching SDK's format)
  const tokenBytes = bigint2bytes(token, new Uint8Array(20));
  const safeBytes = bigint2bytes(safe, new Uint8Array(20));
  const noteBytes = bigint2bytes(note, new Uint8Array(1));
  
  // 3. Create Utxo (this computes commitment and nullifier using correct Poseidon2 hashing)
  const utxo = new Utxo({
    amount,
    blinding,
    keypair,
    token: tokenBytes,
    safe: safeBytes,
    note: noteBytes,
    index: path_index
  });
  
  // 4. Get commitment and nullifier from Utxo (uses SDK's correct computation)
  const commitment_hash = utxo.getCommitment();
  const nullifier_hash = utxo.getNullifier();
  
  // 5. Compute merkle root (matching SDK's computeMerkleRoot)
  const LEVELS = path_elements.length || 23;
  let merkle_root = computeMerkleRoot(LEVELS, commitment_hash, path_elements, path_index);

  // Convert to hex strings for witness (handle negative values in field)
  const toHex = (value: bigint): string => {
    // Handle negative values by converting to field modulus representation
    let fieldValue = value % FIELD_MODULUS;
    if (fieldValue < 0n) {
      fieldValue = fieldValue + FIELD_MODULUS;
    }
    return '0x' + fieldValue.toString(16).padStart(64, '0');
  };

  // Convert public_amount to field representation (handle negative)
  let public_amount_field = public_amount % FIELD_MODULUS;
  if (public_amount_field < 0n) {
    public_amount_field = public_amount_field + FIELD_MODULUS;
  }

  return {
    root: toHex(merkle_root),
    public_amount: public_amount_field.toString(), // Use field representation
    ext_data_hash: toHex(ext_data_hash),
    nullifier: toHex(nullifier_hash),
    safe: toHex(safe),
    amount: amount.toString(), // Amount is positive, just string
    private_key: toHex(private_key),
    blinding: toHex(blinding),
    token: toHex(token),
    note: toHex(note),
    path_index: path_index.toString(),
    path_elements: path_elements.map(toHex),
  };
}

