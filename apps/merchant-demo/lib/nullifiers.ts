/**
 * Nullifier utilities for delegation privacy
 * Prevents linking payments via leaf commitment by using unique nullifiers
 */

import { ethers } from "ethers";

/**
 * Generate a unique nullifier per payment
 * This prevents linking payments via the same leaf commitment
 * 
 * @param leafCommitment - Delegation leaf commitment
 * @param paymentIndex - Payment number (0 = first payment)
 * @param secret - User-specific secret (not stored, generated from seed)
 * @returns Unique nullifier for this payment
 */
export function generateNullifier(
  leafCommitment: string,
  paymentIndex: number,
  secret: string
): string {
  // Generate unique nullifier per payment
  // Prevents linking payments via leafCommitment
  return ethers.solidityPackedKeccak256(
    ["bytes32", "uint256", "bytes32"],
    [leafCommitment, paymentIndex, secret]
  );
}

/**
 * Generate a secret from user address and subscription ID
 * This is deterministic but unique per subscription
 */
export function generateSubscriptionSecret(
  userAddress: string,
  subscriptionId: string
): string {
  return ethers.solidityPackedKeccak256(
    ["address", "string"],
    [userAddress, subscriptionId]
  );
}

/**
 * Generate nullifier for a subscription payment
 */
export function generateSubscriptionNullifier(
  leafCommitment: string,
  userAddress: string,
  subscriptionId: string,
  paymentIndex: number
): string {
  const secret = generateSubscriptionSecret(userAddress, subscriptionId);
  return generateNullifier(leafCommitment, paymentIndex, secret);
}

