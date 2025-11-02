/**
 * x402 SDK Types
 */

export interface X402Config {
  adapterAddress: string;
  relayerUrl: string;
  chainId: number;
  poolAddress?: string;
}

export interface CreatePrecomputeParams {
  noteId: string;
  maxAmount: string;
  merchant: string;
  expiry: number;
  nonce: number;
}

export interface SubmitTakeParams {
  proof: string;
  permit: Permit;
  recipient: string;
  amount: string;
}

export interface SubmitRedeemParams {
  proof: string;
  permit: Permit;
  publicRecipient: string;
  amount: string;
}

export interface Permit {
  noteId: string;
  merchant: string;
  maxAmount: string;
  expiry: number;
  nonce: number;
  signature?: string;
}

export interface X402Precompute {
  proof: string;
  permit: Permit;
  noteId: string;
  maxAmount: string;
}

