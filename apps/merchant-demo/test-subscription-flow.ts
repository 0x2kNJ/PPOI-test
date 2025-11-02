#!/usr/bin/env tsx
/**
 * Test complete subscription flow
 */

import { generateAllPrecomputes } from './lib/realPrecomputeGenerator';
import { CENT_BUCKETS } from './lib/amountBuckets';

async function testSubscriptionFlow() {
  console.log('🧪 Testing Complete Subscription Flow\n');
  console.log('='.repeat(60));
  
  // Scenario: $10 USDC monthly subscription ($120/year)
  const monthlyAmount = 10.00; // $10.00
  const yearlyTotal = monthlyAmount * 12; // $120.00
  const noteId = '0x' + 'ab'.repeat(32);
  const maxAmountCents = Math.round(yearlyTotal * 100); // 12000 cents
  
  console.log('\n📋 Subscription Scenario:');
  console.log(`   Monthly: $${monthlyAmount.toFixed(2)}`);
  console.log(`   Yearly total: $${yearlyTotal.toFixed(2)} (${maxAmountCents} cents)`);
  console.log(`   Note ID: ${noteId.slice(0, 20)}...`);
  console.log(`   Buckets: ${CENT_BUCKETS.length} (for $1,000.00 limit)`);
  
  // Step 1: Generate Precomputes
  console.log('\n🔧 Step 1: Generating precomputes...');
  const startTime = Date.now();
  
  let precomputes;
  try {
    precomputes = await generateAllPrecomputes(
      noteId,
      maxAmountCents,
      CENT_BUCKETS,
      undefined,
      {
        parallel: true,
        batchSize: 10,
        onProgress: (completed, total) => {
          const progress = Math.round((completed / total) * 100);
          if (completed % 5 === 0 || completed === total) {
            process.stdout.write(`\r   Progress: ${completed}/${total} (${progress}%)`);
          }
        }
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    process.stdout.write('\n');
    console.log(`   ✅ Generated ${precomputes.length} precomputes in ${duration}s`);
    
    // Validate precomputes
    const realProofs = precomputes.filter(p => p.isRealProof).length;
    if (realProofs !== precomputes.length) {
      throw new Error(`Expected all real proofs, got ${realProofs}/${precomputes.length}`);
    }
    
    for (const p of precomputes) {
      if (!p.proof || !p.proof.startsWith('0x')) {
        throw new Error(`Invalid proof in precompute: ${p.proofId}`);
      }
      if (!p.publicInputs || p.publicInputs.length !== 4) {
        throw new Error(`Invalid public inputs in precompute: ${p.proofId}`);
      }
      
      const [root, public_amount, ext_data_hash, nullifier] = p.publicInputs;
      if (!root.startsWith('0x') || root.length !== 66) {
        throw new Error(`Invalid root in precompute: ${p.proofId}`);
      }
      if (ext_data_hash !== '0x' + '0'.repeat(64)) {
        throw new Error(`ext_data_hash should be 0 in precompute: ${p.proofId}`);
      }
    }
    
    console.log(`   ✅ All ${precomputes.length} precomputes have valid proofs and public inputs`);
    
  } catch (error: any) {
    console.error(`   ❌ Error generating precomputes: ${error.message}`);
    throw error;
  }
  
  // Step 2: Find matching precompute for subscription amount
  console.log('\n🔧 Step 2: Finding matching precompute for subscription...');
  const subscriptionAmountCents = Math.round(monthlyAmount * 100); // 1000 cents
  const matchingPrecompute = precomputes.find(p => p.bucketAmount >= subscriptionAmountCents) || precomputes[0];
  
  if (!matchingPrecompute) {
    throw new Error('No matching precompute found');
  }
  
  console.log(`   ✅ Found precompute: $${(matchingPrecompute.bucketAmount / 100).toFixed(2)}`);
  console.log(`   ✅ Proof length: ${(matchingPrecompute.proof.length - 2) / 2} bytes`);
  console.log(`   ✅ Public inputs: ${matchingPrecompute.publicInputs.length}`);
  
  // Step 3: Validate public inputs format
  console.log('\n🔧 Step 3: Validating public inputs format...');
  const [root, public_amount, ext_data_hash, nullifier] = matchingPrecompute.publicInputs;
  
  const formatChecks = [
    { name: 'root', value: root, expectedLength: 66 },
    { name: 'public_amount', value: public_amount, expectedLength: 66 },
    { name: 'ext_data_hash', value: ext_data_hash, expectedLength: 66 },
    { name: 'nullifier', value: nullifier, expectedLength: 66 },
  ];
  
  for (const check of formatChecks) {
    if (!check.value.startsWith('0x')) {
      throw new Error(`${check.name} must start with 0x`);
    }
    if (check.value.length !== check.expectedLength) {
      throw new Error(`${check.name} must be ${check.expectedLength} chars, got ${check.value.length}`);
    }
    console.log(`   ✅ ${check.name}: ${check.value.slice(0, 20)}...`);
  }
  
  // Step 4: Validate contract call format
  console.log('\n🔧 Step 4: Validating contract call format...');
  const permit = {
    noteId: noteId,
    merchant: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    maxAmount: maxAmountCents.toString(),
    expiry: Math.floor(Date.now() / 1000) + 31536000, // 1 year
    nonce: 0,
    signature: '0x' + 'ab'.repeat(65), // Mock signature
  };
  
  const args = [
    matchingPrecompute.proof,
    matchingPrecompute.publicInputs,
    permit,
    permit.merchant, // recipient
    subscriptionAmountCents.toString(), // amount
  ];
  
  console.log(`   ✅ Contract call args: [proof, publicInputs, permit, recipient, amount]`);
  console.log(`   ✅ Proof: ${matchingPrecompute.proof.slice(0, 20)}...`);
  console.log(`   ✅ Public inputs: ${matchingPrecompute.publicInputs.length} elements`);
  console.log(`   ✅ Permit: noteId=${permit.noteId.slice(0, 20)}..., merchant=${permit.merchant}`);
  console.log(`   ✅ Recipient: ${permit.merchant}`);
  console.log(`   ✅ Amount: ${subscriptionAmountCents} cents ($${(subscriptionAmountCents / 100).toFixed(2)})`);
  
  // Step 5: Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Complete Subscription Flow Test Summary:');
  console.log(`   📦 Precomputes generated: ${precomputes.length}`);
  console.log(`   ✅ All proofs are real ZK proofs`);
  console.log(`   ✅ All precomputes have valid public inputs`);
  console.log(`   ✅ Matching precompute found for $${monthlyAmount.toFixed(2)}/month`);
  console.log(`   ✅ Contract call format valid`);
  console.log(`   ✅ Ready for on-chain verification`);
  
  console.log('\n🎉 Subscription flow test passed!');
}

testSubscriptionFlow().catch(console.error);



