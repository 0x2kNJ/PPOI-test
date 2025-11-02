import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test script to call X402Adapter.take() with dummy proof+permit
 */
async function callTake() {
  // Load environment
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const CALLER_PK = process.env.CALLER_PK || process.env.DEPLOYER_PK || '';
  const ADAPTER_ADDR = process.env.ADAPTER_ADDR || '';

  if (!CALLER_PK) {
    throw new Error('CALLER_PK not set');
  }

  if (!ADAPTER_ADDR) {
    throw new Error('ADAPTER_ADDR not set');
  }

  console.log('🧪 Testing X402Adapter.take()...');
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Adapter: ${ADAPTER_ADDR}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(CALLER_PK, provider);
  const chainId = (await provider.getNetwork()).chainId;

  console.log(`Chain ID: ${chainId}`);
  console.log(`Caller: ${wallet.address}`);

  // Load adapter ABI
  const adapterArtifact = await import('../out/X402Adapter.sol/X402Adapter.json');
  const adapter = new ethers.Contract(ADAPTER_ADDR, adapterArtifact.abi, wallet);

  // Generate dummy data
  const noteId = ethers.id('test-note-' + Date.now());
  const merchant = process.env.MERCHANT_ADDR || wallet.address;
  const recipient = process.env.RECIPIENT_ADDR || wallet.address;
  const maxAmount = ethers.parseUnits('100', 6); // 100 USDC
  const amount = ethers.parseUnits('10', 6); // 10 USDC
  const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const nonce = Date.now();

  console.log('\nTest Parameters:');
  console.log(`  Note ID: ${noteId}`);
  console.log(`  Merchant: ${merchant}`);
  console.log(`  Recipient: ${recipient}`);
  console.log(`  Max Amount: ${ethers.formatUnits(maxAmount, 6)} USDC`);
  console.log(`  Amount: ${ethers.formatUnits(amount, 6)} USDC`);
  console.log(`  Expiry: ${new Date(expiry * 1000).toISOString()}`);

  // Create dummy proof (in production, this would be a real ZK proof)
  const dummyProof = ethers.randomBytes(32);

  // Sign permit
  const domain = {
    name: 'Bermuda X402',
    version: '1',
    chainId: Number(chainId),
    verifyingContract: ADAPTER_ADDR,
  };

  const types = {
    Permit: [
      { name: 'noteId', type: 'bytes32' },
      { name: 'merchant', type: 'address' },
      { name: 'maxAmount', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  const message = {
    noteId,
    merchant,
    maxAmount,
    expiry,
    nonce,
  };

  const signature = await wallet.signTypedData(domain, types, message);

  const permit = {
    noteId,
    merchant,
    maxAmount,
    expiry,
    nonce,
    signature,
  };

  console.log('\nPermit signed');
  console.log(`  Signature: ${signature.slice(0, 20)}...`);

  // Call take()
  console.log('\n📞 Calling X402Adapter.take()...');
  try {
    const tx = await adapter.take(dummyProof, permit, recipient, amount, {
      gasLimit: 1000000,
    });
    console.log(`✅ Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Check for events
    const takeEvents = receipt.logs.filter((log: any) => {
      try {
        const parsed = adapter.interface.parseLog(log);
        return parsed && parsed.name === 'Take';
      } catch {
        return false;
      }
    });

    if (takeEvents.length > 0) {
      console.log('\n📋 Take Event:');
      takeEvents.forEach((log: any) => {
        const parsed = adapter.interface.parseLog(log);
        console.log(`  Merchant: ${parsed.args.merchant}`);
        console.log(`  Recipient: ${parsed.args.recipient}`);
        console.log(`  Note ID: ${parsed.args.noteId}`);
        console.log(`  Amount: ${ethers.formatUnits(parsed.args.amount, 6)} USDC`);
      });
    }
  } catch (error: any) {
    console.error('\n❌ Call failed:', error.message);
    if (error.reason) {
      console.error(`  Reason: ${error.reason}`);
    }
    if (error.data) {
      console.error(`  Data: ${error.data}`);
    }
    throw error;
  }

  console.log('\n✅ Test completed successfully!');
}

// Run test
callTake()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });



