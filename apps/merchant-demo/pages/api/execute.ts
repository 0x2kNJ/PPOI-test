import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";
import X402Abi from "@/abis/X402Adapter.json";

// ENV (set in .env.local)
const RPC_URL = process.env.RPC_URL!;
const RELAYER_PK = process.env.RELAYER_PK!;
const ADAPTER_ADDR = process.env.NEXT_PUBLIC_X402_ADAPTER!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Execute API called with method:', req.method);
    
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { adapter, method, args } = req.body || {};
    console.log('Execute API params:', { adapter, method, argsLength: args?.length });
    
    if (!adapter || adapter.toLowerCase() !== ADAPTER_ADDR.toLowerCase()) {
      console.error('Bad adapter address:', { adapter, expected: ADAPTER_ADDR });
      return res.status(400).json({ error: "bad adapter address", expected: ADAPTER_ADDR, received: adapter });
    }

    if (!["take", "redeemToPublic"].includes(method)) {
      console.error('Unsupported method:', method);
      return res.status(400).json({ error: "unsupported method" });
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
    console.log('Estimating gas for method:', method);
    const gas = await contract[method].estimateGas(...args).catch((err) => {
      console.error('Gas estimation failed:', err.message);
      return null;
    });
    
    if (!gas) {
      console.error('Gas estimation returned null');
      return res.status(400).json({ error: "gas estimate failed", details: "Contract call would fail" });
    }
    
    console.log('Gas estimated:', gas.toString());

    console.log('Executing transaction...');
    const tx = await contract[method](...args, { gasLimit: gas * BigInt(12) / BigInt(10) }); // +20% buffer
    console.log('Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return res.status(200).json({ txHash: receipt.hash });
  } catch (e: any) {
    console.error("relayer error:", e);
    console.error("relayer error details:", e?.message, e?.code, e?.reason);
    return res.status(500).json({ 
      error: e?.message ?? "execute failed",
      details: e?.reason || e?.code || "Unknown error"
    });
  }
}
