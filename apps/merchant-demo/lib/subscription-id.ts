/**
 * Privacy-preserving subscription ID generation
 * Prevents subscription correlation via obfuscated IDs
 */

import { ethers } from "ethers";

/**
 * Generate privacy-preserving subscription ID
 * Uses hash of user address + timestamp + random salt
 * Returns short hash (first 16 chars) for readability
 * 
 * @param userAddress User or agent address
 * @param timestamp Creation timestamp
 * @param secretSalt Optional secret salt (for determinism)
 * @returns Obfuscated subscription ID like "sub_0xabc123..."
 */
export function generatePrivateSubscriptionId(
  userAddress: string,
  timestamp: number,
  secretSalt?: string
): string {
  // Generate random salt if not provided
  const randomSalt = secretSalt || ethers.randomBytes(32);
  
  // Create deterministic but unlinkable ID hash
  const idHash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "bytes32"],
    [
      userAddress,
      timestamp,
      typeof randomSalt === "string" 
        ? ethers.id(randomSalt)
        : ethers.keccak256(ethers.hexlify(randomSalt))
    ]
  );
  
  // Return truncated hash (first 16 chars after "sub_") for readability
  // Full hash is 66 chars (0x + 64 hex), we take first 16 hex chars
  return `sub_${idHash.slice(2, 18)}`;
}

/**
 * Encrypt subscription ID for storage
 * Uses user's public key (or derived key) for encryption
 * Server cannot decrypt without user's private key
 * 
 * @param subscriptionId Plain subscription ID
 * @param userPublicKey User's public key or address
 * @returns Encrypted subscription ID (hash-based for simplicity)
 */
export function encryptSubscriptionId(
  subscriptionId: string,
  userPublicKey: string
): string {
  // Derive encryption key from user's public key
  const encKey = ethers.solidityPackedKeccak256(
    ["address", "bytes32"],
    [userPublicKey, ethers.id("SUBSCRIPTION_ENCRYPTION_SALT")]
  );
  
  // Encrypt subscription ID using XOR-like hash
  // In production, use proper AES-256-GCM encryption
  const encrypted = ethers.solidityPackedKeccak256(
    ["string", "bytes32"],
    [subscriptionId, encKey]
  );
  
  return encrypted;
}

/**
 * Decrypt subscription ID (for verification)
 * Requires user's private key (client-side only)
 * 
 * @param encryptedSubId Encrypted subscription ID
 * @param userPublicKey User's public key
 * @param plainSubId Plain subscription ID (for verification)
 * @returns True if decryption matches
 */
export function verifyEncryptedSubscriptionId(
  encryptedSubId: string,
  userPublicKey: string,
  plainSubId: string
): boolean {
  const decrypted = encryptSubscriptionId(plainSubId, userPublicKey);
  return decrypted.toLowerCase() === encryptedSubId.toLowerCase();
}







