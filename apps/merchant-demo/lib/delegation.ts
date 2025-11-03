import { ethers } from "ethers";

/**
 * Builds a delegation leaf commitment from policy hash and salt
 * @param policyHash - Hash of the off-chain policy stored in Nillion (will be stored in nilCC)
 * @param salt - Random salt for privacy/uniqueness
 * @returns leafCommitment - keccak256(policyHash || salt)
 */
export function buildDelegationLeaf({ 
  policyHash, 
  salt 
}: {
  policyHash: `0x${string}`, 
  salt: `0x${string}`
}): string {
  // leafCommitment = keccak256(policyHash || salt)
  const enc = ethers.concat([policyHash, salt]);
  const leaf = ethers.keccak256(enc);
  console.log("🍃 Built delegation leaf:", leaf);
  return leaf;
}

/**
 * Computes the action hash for Nillion attestation binding
 * This binds the attestation to the specific action being performed
 * @param method - The x402 adapter method being called
 * @param recipientOrMid - Recipient address or merchant ID
 * @param amount - Payment amount
 * @param chainId - Chain ID for replay protection
 * @param adapter - X402Adapter contract address
 * @returns actionHash - keccak256 of encoded parameters
 */
export function actionHash({ 
  method, 
  recipientOrMid, 
  amount, 
  chainId, 
  adapter 
}: {
  method: "take" | "takeShielded" | "takeWithDelegationAnchor",
  recipientOrMid: string,
  amount: string | bigint,
  chainId: number,
  adapter: string
}): string {
  const hash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "address", "uint256", "uint256", "address"],
      [method, recipientOrMid, amount, chainId, adapter]
    )
  );
  console.log("🔗 Computed action hash:", hash);
  return hash;
}

/**
 * Gets Merkle proof for delegation leaf inclusion
 * 
 * DEMO MODE: Returns empty array. In production, this would fetch the proof
 * from the Bermuda pool client proving the leaf is in the Merkle tree.
 * 
 * TODO: Replace with actual pool client integration:
 * ```typescript
 * const poolClient = getPoolClient();
 * const proof = await poolClient.getMerkleProof(leaf);
 * return proof;
 * ```
 * 
 * @param leaf - Delegation leaf commitment
 * @returns merkleProof - Array of sibling hashes (empty in demo)
 */
export async function getMerkleProofForDelegation(
  leaf: `0x${string}`
): Promise<`0x${string}`[]> {
  console.log("🌳 Getting Merkle proof for leaf:", leaf);
  console.log("⚠️  Demo mode: returning empty proof (TODO: integrate with pool client)");
  
  // TODO: In production, replace with:
  // const poolClient = getPoolClient();
  // const proof = await poolClient.getMerkleProof(leaf);
  // return proof;
  
  return []; // Empty proof for demo - contract will need to handle this
}

/**
 * Validates that a delegation leaf commitment format is correct
 * @param leaf - The leaf commitment to validate
 * @returns true if valid bytes32 format
 */
export function isValidLeaf(leaf: string): boolean {
  try {
    if (!leaf.startsWith("0x")) return false;
    if (leaf.length !== 66) return false; // 0x + 64 hex chars
    ethers.getBytes(leaf);
    return true;
  } catch {
    return false;
  }
}

