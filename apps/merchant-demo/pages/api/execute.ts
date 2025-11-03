import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";
import X402Abi from "@/abis/X402Adapter.json";
import { createSafeLogger } from "../../lib/sanitize";

const logger = createSafeLogger("ExecuteAPI");

// ENV (set in .env.local)
const RPC_URL = process.env.RPC_URL!;
const RELAYER_PK = process.env.RELAYER_PK!;
const ADAPTER_ADDR = process.env.NEXT_PUBLIC_X402_ADAPTER!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    logger.log('Execute API called', { method: req.method });
    
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { adapter, method, args } = req.body || {};
    logger.log('Execute API params', { adapter: adapter?.slice(0, 10) + '...', method, argsLength: args?.length });
    
    if (!adapter || adapter.toLowerCase() !== ADAPTER_ADDR.toLowerCase()) {
      logger.error('Bad adapter address', { adapter: adapter?.slice(0, 10) + '...', expected: ADAPTER_ADDR.slice(0, 10) + '...' });
      return res.status(400).json({ error: "bad adapter address", expected: ADAPTER_ADDR, received: adapter });
    }

    // Support x402 methods including delegation-aware method
    if (!["take", "redeemToPublic", "takeShielded", "takeWithDelegationAnchor"].includes(method)) {
      logger.error('Unsupported method', { method });
      return res.status(400).json({ error: "unsupported method", allowed: ["take", "redeemToPublic", "takeShielded", "takeWithDelegationAnchor"] });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(RELAYER_PK, provider);
    const contract = new ethers.Contract(ADAPTER_ADDR, X402Abi, wallet);

    // Format public inputs: convert hex strings to bytes32[] for Solidity
    // args should be: [proof, publicInputs, permit, recipient, amount]
    if (args && args.length > 1 && Array.isArray(args[1])) {
      // Convert publicInputs string array to bytes32[]
      args[1] = args[1].map((input: string) => {
        if (typeof input === 'string') {
          // Ensure it's a valid bytes32 (pad to 64 hex chars if needed)
          const cleanInput = input.startsWith('0x') ? input.slice(2) : input;
          return '0x' + cleanInput.padStart(64, '0').slice(0, 64);
        }
        return input;
      });
    }

    // Simple gas guard
    logger.log('Estimating gas', { method });
    const gas = await contract[method].estimateGas(...args).catch((err) => {
      logger.error('Gas estimation failed', { error: err.message });
      return null;
    });
    
    if (!gas) {
      logger.error('Gas estimation returned null');
      return res.status(400).json({ error: "gas estimate failed", details: "Contract call would fail" });
    }
    
    logger.log('Gas estimated', { gas: gas.toString() });

    logger.log('Executing transaction', { method });
    const tx = await contract[method](...args, { gasLimit: gas * BigInt(12) / BigInt(10) }); // +20% buffer
    logger.log('Transaction sent', { txHash: tx.hash.slice(0, 10) + '...' });
    
    const receipt = await tx.wait();
    logger.log('Transaction confirmed', { txHash: receipt.hash.slice(0, 10) + '...' });

    return res.status(200).json({ txHash: receipt.hash });
  } catch (e: any) {
    logger.error("relayer error", { error: e?.message || 'Unknown error', code: e?.code, reason: e?.reason });
    return res.status(500).json({ 
      error: e?.message ?? "execute failed",
      details: e?.reason || e?.code || "Unknown error"
    });
  }
}
