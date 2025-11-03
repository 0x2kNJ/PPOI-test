/**
 * Agent Delegation Utilities
 * 
 * Helper functions for setting up delegation with agent wallets
 */

import { ethers } from "ethers";
import { AgentWallet } from "./agent-wallet";
import { buildDelegationLeaf, actionHash, getMerkleProofForDelegation } from "./delegation";

export interface AgentDelegationSetup {
  agentAddress: string;
  agentPrivateKey?: string; // Optional - only stored in memory during setup
  policyHash: string;
  salt: string;
  leafCommitment: string;
}

/**
 * Generate a new agent wallet (for demo purposes)
 * WARNING: In production, use secure key management!
 * @deprecated Use generateSubscriptionAgent for better privacy (unique agent per subscription)
 */
export function generateAgentWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Generate unique agent wallet per subscription (PRIVACY ENHANCEMENT)
 * This prevents linking multiple subscriptions via agent address
 * Each subscription gets a different agent, breaking subscription linking
 * 
 * @param userAddress User or agent address (base address for seed)
 * @param subscriptionId Unique subscription ID
 * @param rpcUrl RPC URL for blockchain connection
 * @returns Agent wallet instance
 */
export function generateSubscriptionAgent(
  userAddress: string,
  subscriptionId: string,
  rpcUrl: string
): AgentWallet {
  // Generate unique agent seed per subscription
  // This breaks subscription linking - each subscription gets different agent
  const agentSeed = ethers.solidityPackedKeccak256(
    ["address", "string"],
    [userAddress, subscriptionId]
  );
  
  // Generate private key from seed (deterministic but unique per subscription)
  const agentPrivateKey = ethers.keccak256(
    ethers.toUtf8Bytes(`agent:${agentSeed}:${subscriptionId}`)
  );
  
  return new AgentWallet(agentPrivateKey, rpcUrl);
}

/**
 * Set up delegation for an agent wallet
 * @param agentAddress - Agent wallet address
 * @param policyHash - Hash of delegation policy (stored in Nillion)
 * @param salt - Random salt for privacy
 */
export function setupAgentDelegation(
  agentAddress: string,
  policyHash: string,
  salt: string
): AgentDelegationSetup {
  const leafCommitment = buildDelegationLeaf({
    policyHash: policyHash as `0x${string}`,
    salt: salt as `0x${string}`,
  });

  return {
    agentAddress,
    policyHash,
    salt,
    leafCommitment,
  };
}

/**
 * Get agent's delegation info for subscription creation
 */
export async function getAgentDelegationInfo(
  delegationSetup: AgentDelegationSetup,
  actionParams: {
    method: "takeWithDelegationAnchor";
    recipient: string;
    amount: string;
    chainId: number;
    adapter: string;
  }
): Promise<{
  leafCommitment: string;
  actionHash: string;
  merkleProof: string[];
  root?: string;
  attestation?: string;
}> {
  const aHash = actionHash({
    method: actionParams.method,
    recipientOrMid: actionParams.recipient,
    amount: actionParams.amount,
    chainId: actionParams.chainId,
    adapter: actionParams.adapter,
  });

  const merkleProof = await getMerkleProofForDelegation(
    delegationSetup.leafCommitment as `0x${string}`
  );

  // Fetch root and attestation (will be async when APIs are called)
  return {
    leafCommitment: delegationSetup.leafCommitment,
    actionHash: aHash,
    merkleProof,
  };
}

