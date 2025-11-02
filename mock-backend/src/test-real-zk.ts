/**
 * Test real ZK proof generation with Barretenberg
 */

import { isRealProvingAvailable, generateRealProof, PrecomputeWitness } from './zkProver.js';

async function testRealZKProof() {
  console.log('\n🧪 Testing Real ZK Proof Generation with Barretenberg\n');
  console.log('=' .repeat(70));
  
  // Step 1: Check availability
  console.log('\n📋 Step 1: Check ZK Prover Availability');
  console.log('-'.repeat(70));
  const available = isRealProvingAvailable();
  if (!available) {
    console.log('❌ Real ZK prover not available. Using mock proofs.');
    console.log('\nTo enable real proofs:');
    console.log('  1. Install Noir: noirup --version 1.0.0-beta.9');
    console.log('  2. Install Barretenberg: bbup');
    console.log('  3. Compile circuit: cd demo/lib/precompute-circuit && nargo compile');
    console.log('  4. Generate VK: bb write_vk -b target/precompute_circuit.json -o target/vk');
    return;
  }
  
  console.log('✅ Real ZK prover is available!');
  
  // Step 2: Create test witness
  console.log('\n📋 Step 2: Create Test Witness');
  console.log('-'.repeat(70));
  
  const testWitness: PrecomputeWitness = {
    root: '0x' + '1'.repeat(64),
    public_amount: '1000',  // 10.00 in cents
    ext_data_hash: '0x' + '2'.repeat(64),
    nullifier: '0x' + '3'.repeat(64),
    safe: '0x' + '4'.repeat(40),
    amount: '1000',
    private_key: '0x' + '5'.repeat(64),
    blinding: '0x' + '6'.repeat(64),
    token: '0x' + '7'.repeat(40),
    note: '0x' + '8'.repeat(64),
    path_index: '0',
    path_elements: Array(23).fill('0x' + '9'.repeat(64)),
  };
  
  console.log(`Merkle root: ${testWitness.root.slice(0, 18)}...`);
  console.log(`Amount: ${testWitness.amount} cents ($${(parseInt(testWitness.amount) / 100).toFixed(2)})`);
  console.log(`Nullifier: ${testWitness.nullifier.slice(0, 18)}...`);
  
  // Step 3: Generate real proof
  console.log('\n📋 Step 3: Generate Real ZK Proof');
  console.log('-'.repeat(70));
  console.log('⏳ Generating proof... (this may take 30-60 seconds)');
  
  const startTime = Date.now();
  
  try {
    const { proof, publicInputs } = await generateRealProof(testWitness);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Real ZK proof generated in ${duration}s`);
    console.log(`\nProof: ${proof.slice(0, 66)}... (${Math.floor(proof.length / 2)} bytes)`);
    console.log(`\nPublic inputs (${publicInputs.length}):`);
    publicInputs.forEach((input, i) => {
      console.log(`  ${i + 1}. ${input.slice(0, 18)}...`);
    });
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Real ZK proof generated successfully`);
    console.log(`✅ Proof size: ${Math.floor(proof.length / 2)} bytes`);
    console.log(`✅ Generation time: ${duration}s`);
    console.log(`✅ Public inputs: ${publicInputs.length}`);
    console.log('\n🎯 CONCLUSION: Real ZK proving with Barretenberg works!');
    
  } catch (error: any) {
    console.error('\n❌ Proof generation failed:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test
testRealZKProof().catch(console.error);



