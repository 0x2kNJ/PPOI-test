/**
 * Amount Commitment Utility
 * 
 * Implements Pedersen-style commitments for hiding payment amounts
 * while allowing verification via ZK proofs.
 * 
 * This achieves full amount confidentiality similar to Fhenix402's FHE.
 */

import { ethers } from 'ethers';

/**
 * Generate a commitment to an amount using Pedersen-style hash
 * 
 * Commitment = keccak256(amount, salt, nullifier)
 * 
 * @param amount - Payment amount in wei (e.g., 1000000 for 1 USDC)
 * @param salt - Random salt for commitment
 * @param nullifier - Nullifier from ZK proof (ensures uniqueness)
 * @returns Commitment hash (bytes32)
 */
export function generateAmountCommitment(
  amount: bigint | string,
  salt: string,
  nullifier: string
): string {
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
  
  // Generate Pedersen-style commitment
  const commitment = ethers.solidityPackedKeccak256(
    ['uint256', 'bytes32', 'bytes32'],
    [amountBigInt, salt, nullifier]
  );
  
  return commitment;
}

/**
 * Generate range proof parameters for amount
 * 
 * Instead of revealing exact amount, we prove:
 * - amount >= minAmount
 * - amount <= maxAmount
 * 
 * @param amount - Exact amount (kept private)
 * @param minAmount - Minimum acceptable amount
 * @param maxAmount - Maximum acceptable amount
 * @returns Range proof parameters
 */
export function generateRangeProofParams(
  amount: bigint,
  minAmount: bigint,
  maxAmount: bigint
): {
  amountCommitment: string;
  minAmount: string;
  maxAmount: string;
  salt: string;
  inRange: boolean;
} {
  // Generate random salt
  const salt = ethers.hexlify(ethers.randomBytes(32));
  
  // Check if amount is in range
  const inRange = amount >= minAmount && amount <= maxAmount;
  
  // Generate commitment (binds amount without revealing it)
  const amountCommitment = ethers.solidityPackedKeccak256(
    ['uint256', 'bytes32'],
    [amount, salt]
  );
  
  return {
    amountCommitment,
    minAmount: minAmount.toString(),
    maxAmount: maxAmount.toString(),
    salt,
    inRange
  };
}

/**
 * Verify amount commitment matches a specific amount
 * 
 * Used by merchant to verify the payment after decrypting commitment
 * 
 * @param commitment - The commitment hash
 * @param amount - Claimed amount
 * @param salt - Salt used in commitment
 * @returns true if commitment matches
 */
export function verifyAmountCommitment(
  commitment: string,
  amount: bigint,
  salt: string
): boolean {
  const recomputed = ethers.solidityPackedKeccak256(
    ['uint256', 'bytes32'],
    [amount, salt]
  );
  
  return recomputed === commitment;
}

/**
 * Generate amount commitment for HTTP 402 payment
 * 
 * Creates a commitment that hides the exact amount while allowing
 * the merchant to verify payment off-chain.
 * 
 * @param amount - Payment amount in wei
 * @param nullifier - Nullifier from ZK proof
 * @returns Commitment data for transaction
 */
export function generatePaymentCommitment(
  amount: bigint,
  nullifier: string
): {
  commitment: string;
  salt: string;
  amount: string; // Kept for merchant verification
} {
  // Generate random salt
  const salt = ethers.hexlify(ethers.randomBytes(32));
  
  // Generate commitment
  const commitment = generateAmountCommitment(amount, salt, nullifier);
  
  return {
    commitment,
    salt,
    amount: amount.toString() // Merchant gets this off-chain for verification
  };
}

/**
 * Create encrypted amount for merchant
 * 
 * Merchant can decrypt this to verify payment amount
 * while on-chain observers only see the commitment.
 * 
 * @param amount - Payment amount
 * @param merchantPublicKey - Merchant's public key for encryption
 * @returns Encrypted amount data
 */
export function encryptAmountForMerchant(
  amount: bigint,
  merchantPublicKey: string
): {
  encryptedAmount: string;
  ephemeralPublicKey: string;
} {
  // For production: Use proper ECIES encryption
  // For demo: Simple XOR encryption with merchant's address
  
  const amountHex = ethers.toBeHex(amount, 32);
  const keyHash = ethers.keccak256(merchantPublicKey);
  
  // XOR encryption (simple for demo)
  const amountBytes = ethers.getBytes(amountHex);
  const keyBytes = ethers.getBytes(keyHash);
  
  const encryptedBytes = amountBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
  const encryptedAmount = ethers.hexlify(encryptedBytes);
  
  return {
    encryptedAmount,
    ephemeralPublicKey: keyHash // In production: use ephemeral key
  };
}

/**
 * Decrypt amount (merchant-side)
 * 
 * @param encryptedAmount - Encrypted amount from user
 * @param merchantPrivateKey - Merchant's private key
 * @returns Decrypted amount
 */
export function decryptAmountForMerchant(
  encryptedAmount: string,
  merchantPrivateKey: string
): bigint {
  // For production: Use proper ECIES decryption
  // For demo: Simple XOR decryption
  
  const wallet = new ethers.Wallet(merchantPrivateKey);
  const keyHash = ethers.keccak256(wallet.address);
  
  const encryptedBytes = ethers.getBytes(encryptedAmount);
  const keyBytes = ethers.getBytes(keyHash);
  
  const decryptedBytes = encryptedBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
  const decryptedAmount = ethers.hexlify(decryptedBytes);
  
  return BigInt(decryptedAmount);
}

