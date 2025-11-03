/**
 * Note privacy utilities
 * Prevents payment linking by using unique noteIds per payment
 */

import { ethers } from "ethers";

/**
 * Generate a unique noteId per payment
 * This prevents linking multiple payments to the same user/agent
 * 
 * @param userAddress - User or agent address
 * @param subscriptionId - Unique subscription ID
 * @param paymentIndex - Payment number (0 = first payment)
 * @returns Unique noteId for this specific payment
 */
export function generatePrivateNoteId(
  userAddress: string,
  subscriptionId: string,
  paymentIndex: number
): string {
  // Use subscription-specific noteId instead of user-specific
  // This prevents linking payments across subscriptions
  return ethers.solidityPackedKeccak256(
    ["address", "string", "uint256"],
    [userAddress, subscriptionId, paymentIndex]
  );
}

/**
 * Generate a noteId for initial subscription (payment index 0)
 */
export function generateSubscriptionNoteId(
  userAddress: string,
  subscriptionId: string
): string {
  return generatePrivateNoteId(userAddress, subscriptionId, 0);
}
