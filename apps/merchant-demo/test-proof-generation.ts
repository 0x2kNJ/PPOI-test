#!/usr/bin/env tsx
/**
 * Test real ZK proof generation end-to-end
 */

import { generatePrecompute } from './lib/realPrecomputeGenerator';

async function testProofGeneration() {
  console.log('🧪 Testing Real ZK Proof Generation\n');
  
  const testCases = [
    { name: 'Small amount ($0.01)', amount: 1, noteId: '0x' + '01'.repeat(32) },
    { name: 'Monthly subscription ($10.00)', amount: 1000, noteId: '0x' + '10'.repeat(32) },
    { name: 'Bucket amount ($0.50)', amount: 50, noteId: '0x' + '50'.repeat(32) },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}:`);
    console.log(`   Amount: $${(testCase.amount / 100).toFixed(2)} (${testCase.amount} cents)`);
    
    try {
      const startTime = Date.now();
      
      const precompute = await generatePrecompute(
        testCase.noteId,
        testCase.amount,
        testCase.amount, // remaining balance = amount
        0, // nonce
        undefined // merkle root
      );
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Validate proof
      if (!precompute.proof || !precompute.proof.startsWith('0x')) {
        throw new Error('Invalid proof format');
      }
      
      // Validate public inputs
      if (!precompute.publicInputs || precompute.publicInputs.length !== 4) {
        throw new Error(`Invalid public inputs: expected 4, got ${precompute.publicInputs?.length}`);
      }
      
      // Validate public inputs format
      const [root, public_amount, ext_data_hash, nullifier] = precompute.publicInputs;
      if (!root.startsWith('0x') || root.length !== 66) {
        throw new Error(`Invalid root format: ${root}`);
      }
      if (!public_amount.startsWith('0x') || public_amount.length !== 66) {
        throw new Error(`Invalid public_amount format: ${public_amount}`);
      }
      if (!ext_data_hash.startsWith('0x') || ext_data_hash.length !== 66) {
        throw new Error(`Invalid ext_data_hash format: ${ext_data_hash}`);
      }
      if (!nullifier.startsWith('0x') || nullifier.length !== 66) {
        throw new Error(`Invalid nullifier format: ${nullifier}`);
      }
      
      // Check ext_data_hash is 0
      if (ext_data_hash !== '0x' + '0'.repeat(64)) {
        throw new Error('ext_data_hash should be 0 for precompute');
      }
      
      // Validate is real proof
      if (!precompute.isRealProof) {
        throw new Error('Proof should be real ZK proof');
      }
      
      console.log(`   ✅ Proof generated in ${duration}s`);
      console.log(`   ✅ Proof length: ${(precompute.proof.length - 2) / 2} bytes`);
      console.log(`   ✅ Public inputs: ${precompute.publicInputs.length}`);
      console.log(`   ✅ Root: ${root.slice(0, 20)}...`);
      console.log(`   ✅ Nullifier: ${nullifier.slice(0, 20)}...`);
      
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      throw error;
    }
  }
  
  console.log('\n✅ All proof generation tests passed!');
}

testProofGeneration().catch(console.error);

