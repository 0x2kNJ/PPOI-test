/**
 * Agent Wallet Library
 * 
 * Enables autonomous agents to sign permits and execute transactions
 * without requiring MetaMask or user interaction.
 */

import { ethers, Wallet } from "ethers";

export interface PermitData {
  noteId: string;
  merchant: string;
  maxAmount: string;
  expiry: number;
  nonce: number;
  merchantCommitment?: string;
}

export class AgentWallet {
  private wallet: Wallet;
  private provider: ethers.JsonRpcProvider;
  
  /**
   * Create an agent wallet from a private key
   * 
   * @param privateKey - Agent's private key (keep secure!)
   * @param rpcUrl - RPC URL for blockchain connection
   */
  constructor(
    privateKey: string,
    rpcUrl: string
  ) {
    if (!privateKey || !privateKey.startsWith("0x")) {
      throw new Error("Invalid private key format");
    }
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
  }
  
  /**
   * Get the agent's wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }
  
  /**
   * Sign an EIP-712 permit programmatically (no MetaMask needed!)
   * 
   * @param permit - Permit data to sign
   * @param chainId - Chain ID for domain separation
   * @param contractAddress - Contract address for domain separation
   * @returns EIP-712 signature
   */
  async signPermit(
    permit: PermitData,
    chainId: number,
    contractAddress?: string
  ): Promise<string> {
    const adapterAddr = contractAddress || process.env.NEXT_PUBLIC_X402_ADAPTER || "";
    
    if (!adapterAddr) {
      throw new Error("Contract address required for EIP-712 signing");
    }
    
    const domain = {
      name: "Bermuda X402",
      version: "1",
      chainId: chainId,
      verifyingContract: adapterAddr,
    };
    
    const types = {
      Permit: [
        { name: "noteId", type: "bytes32" },
        { name: "merchant", type: "address" },
        { name: "maxAmount", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "merchantCommitment", type: "bytes32" },
      ],
    };
    
    const permitData = {
      noteId: permit.noteId,
      merchant: permit.merchant,
      maxAmount: permit.maxAmount,
      expiry: BigInt(permit.expiry),
      nonce: BigInt(permit.nonce),
      merchantCommitment: permit.merchantCommitment || "0x0000000000000000000000000000000000000000000000000000000000000000",
    };
    
    // Agent signs programmatically (no MetaMask!)
    return await this.wallet.signTypedData(domain, types, permitData);
  }
  
  /**
   * Execute a contract transaction directly (agent pays gas)
   * 
   * @param contractAddress - Contract address
   * @param abi - Contract ABI
   * @param method - Method name to call
   * @param args - Method arguments
   * @param gasLimit - Optional gas limit
   * @returns Transaction hash
   */
  async executeTransaction(
    contractAddress: string,
    abi: any[],
    method: string,
    args: any[],
    gasLimit?: bigint
  ): Promise<string> {
    const contract = new ethers.Contract(contractAddress, abi, this.wallet);
    
    const tx = await contract[method](...args, {
      gasLimit: gasLimit,
    });
    
    const receipt = await tx.wait();
    return receipt.hash;
  }
  
  /**
   * Get the agent's balance
   */
  async getBalance(): Promise<bigint> {
    return await this.provider.getBalance(this.wallet.address);
  }
  
  /**
   * Generate a noteId from agent address and nonce
   */
  static generateNoteId(agentAddress: string, nonce: number): string {
    return ethers.keccak256(
      ethers.solidityPacked(
        ["address", "uint256"],
        [agentAddress, nonce]
      )
    );
  }
  
  /**
   * Generate a new nonce for the agent
   */
  async generateNonce(): Promise<number> {
    // In production, fetch from blockchain
    // For demo, use timestamp-based nonce
    return Math.floor(Date.now() / 1000);
  }
}

