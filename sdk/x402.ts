import { ethers } from 'ethers';

/**
 * EIP-712 domain for x402 permits
 */
export function getDomain(chainId: number) {
  return {
    name: "Bermuda X402",
    version: "1",
    chainId,
  };
}

/**
 * EIP-712 types for Permit
 */
export const PERMIT_TYPES = {
  Permit: [
    { name: "noteId", type: "bytes32" },
    { name: "merchant", type: "address" },
    { name: "maxAmount", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

/**
 * Permit structure
 */
export interface Permit {
  noteId: string;
  merchant: string;
  maxAmount: string;
  expiry: number;
  nonce: number;
  signature?: string;
}

/**
 * Precompute result structure
 */
export interface X402Precompute {
  proof: string; // Serialized proof bytes
  permit: Permit;
  noteId: string;
  maxAmount: string;
}

/**
 * Create x402 precompute with permit signature
 * @param params Precompute parameters
 * @returns Precompute with proof and signed permit
 */
export async function createX402Precompute(params: {
  wallet: {
    zkp: any; // Bermuda ZKP interface
    signer: ethers.Signer;
    chainId: () => Promise<number>;
  };
  noteId: string;
  maxAmount: string;
  merchant: string;
  expiry: number;
  nonce: number;
}): Promise<X402Precompute> {
  const { wallet, noteId, maxAmount, merchant, expiry, nonce } = params;

  // 1) Build witness for zk precompute (reuse debit-card flow)
  // In production, this would call wallet.zkp.precompute with noteId and maxAmount
  // For demo, we'll use placeholder proof bytes
  const proof = await generatePlaceholderProof(noteId, maxAmount);

  // 2) Sign permit
  const permit: Permit = {
    noteId,
    merchant,
    maxAmount,
    expiry,
    nonce,
  };

  const signature = await signPermit(wallet.signer, permit, await wallet.chainId());
  permit.signature = signature;

  return {
    proof,
    permit,
    noteId,
    maxAmount,
  };
}

/**
 * Sign EIP-712 permit
 * @param signer Ethers signer
 * @param permit Permit data
 * @param chainId Chain ID
 * @returns Signature string
 */
export async function signPermit(
  signer: ethers.Signer,
  permit: Permit,
  chainId: number
): Promise<string> {
  const domain = getDomain(chainId);
  
  // Convert string values to proper types for signing
  const message = {
    noteId: permit.noteId,
    merchant: permit.merchant,
    maxAmount: BigInt(permit.maxAmount),
    expiry: BigInt(permit.expiry),
    nonce: BigInt(permit.nonce),
  };

  const signature = await signer.signTypedData(domain, PERMIT_TYPES, message);
  return signature;
}

/**
 * Submit take request to relayer
 * @param params Take request parameters
 * @returns Transaction hash
 */
export async function submitTake(params: {
  relayerUrl: string;
  adapter: string;
  proof: string;
  permit: Permit;
  recipient: string;
  amount: string;
}): Promise<{ txHash: string }> {
  const { relayerUrl, adapter, proof, permit, recipient, amount } = params;

  const response = await fetch(`${relayerUrl}/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      adapter,
      method: "take",
      args: [
        proof,
        {
          noteId: permit.noteId,
          merchant: permit.merchant,
          maxAmount: permit.maxAmount,
          expiry: permit.expiry,
          nonce: permit.nonce,
          signature: permit.signature,
        },
        recipient,
        amount,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Relayer error: ${response.statusText}`);
  }

  const result = await response.json();
  return { txHash: result.txHash || result.hash };
}

/**
 * Submit redeemToPublic request to relayer
 * @param params Redeem request parameters
 * @returns Transaction hash
 */
export async function submitRedeemToPublic(params: {
  relayerUrl: string;
  adapter: string;
  proof: string;
  permit: Permit;
  publicRecipient: string;
  amount: string;
}): Promise<{ txHash: string }> {
  const { relayerUrl, adapter, proof, permit, publicRecipient, amount } = params;

  const response = await fetch(`${relayerUrl}/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      adapter,
      method: "redeemToPublic",
      args: [
        proof,
        {
          noteId: permit.noteId,
          merchant: permit.merchant,
          maxAmount: permit.maxAmount,
          expiry: permit.expiry,
          nonce: permit.nonce,
          signature: permit.signature,
        },
        publicRecipient,
        amount,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Relayer error: ${response.statusText}`);
  }

  const result = await response.json();
  return { txHash: result.txHash || result.hash };
}

/**
 * Placeholder proof generator for demo
 * In production, this would call the actual ZKP precompute generator
 */
async function generatePlaceholderProof(noteId: string, maxAmount: string): Promise<string> {
  // TODO: Replace with actual proof generation from Bermuda SDK
  // This is a placeholder that returns mock proof bytes
  const mockProof = ethers.solidityPackedKeccak256(
    ["bytes32", "uint256"],
    [noteId, maxAmount]
  );
  return `0x${mockProof.slice(2)}`; // Return as hex string
}

/**
 * Verify permit signature (for testing)
 * @param permit Permit with signature
 * @param chainId Chain ID
 * @returns Signer address
 */
export function recoverPermitSigner(permit: Permit, chainId: number): string {
  const domain = getDomain(chainId);
  const message = {
    noteId: permit.noteId,
    merchant: permit.merchant,
    maxAmount: BigInt(permit.maxAmount),
    expiry: BigInt(permit.expiry),
    nonce: BigInt(permit.nonce),
  };

  const hash = ethers.TypedDataEncoder.hash(domain, PERMIT_TYPES, message);
  return ethers.verifyMessage(hash, permit.signature || "");
}

