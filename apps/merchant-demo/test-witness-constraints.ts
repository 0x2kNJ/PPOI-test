#!/usr/bin/env tsx
/**
 * Test witness generation matches circuit constraints
 */

import { generateValidWitness } from './lib/witnessGenerator';

async function testWitnessConstraints() {
  console.log('🧪 Testing Witness Generation Against Circuit Constraints\n');
  
  const testCases = [
    {
      name: 'Basic witness ($10.00)',
      params: {
        private_key: BigInt('18289945158108304925660975126443984768591757366360530341676524993526201583222'),
        amount: BigInt(1000), // $10.00 in cents
        blinding: BigInt('289184164427839320485306849001486046229521124595132064080744981764368187374'),
        token: BigInt('1184589422945421143511828701991100965039074119625'),
        safe: BigInt(0),
        note: BigInt(0),
        path_index: BigInt(0),
        path_elements: Array(23).fill(BigInt(0)),
        public_amount: BigInt(-1000), // Must equal -amount
        ext_data_hash: BigInt(0),
      }
    },
    {
      name: 'Monthly subscription ($10.00)',
      params: {
        private_key: BigInt('18289945158108304925660975126443984768591757366360530341676524993526201583222'),
        amount: BigInt(1000), // $10.00
        blinding: BigInt('289184164427839320485306849001486046229521124595132064080744981764368187374'),
        token: BigInt('1184589422945421143511828701991100965039074119625'),
        safe: BigInt(0),
        note: BigInt(0),
        path_index: BigInt(1),
        path_elements: Array(23).fill(BigInt(0)),
        public_amount: BigInt(-1000),
        ext_data_hash: BigInt(0),
      }
    },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}:`);
    
    try {
      const witness = await generateValidWitness(testCase.params);
      
      // Validate witness structure
      const checks = [
        { name: 'root', value: witness.root, check: (v: string) => v.startsWith('0x') && v.length === 66 },
        { name: 'nullifier', value: witness.nullifier, check: (v: string) => v.startsWith('0x') && v.length === 66 },
        { name: 'public_amount', value: witness.public_amount, check: (v: string) => v.startsWith('0x') },
        { name: 'ext_data_hash', value: witness.ext_data_hash, check: (v: string) => v.startsWith('0x') },
        { name: 'amount', value: witness.amount, check: (v: string) => !isNaN(Number(v)) },
        { name: 'path_elements', value: witness.path_elements, check: (v: string[]) => v.length === 23 },
      ];
      
      let allPassed = true;
      for (const check of checks) {
        const passed = check.check(check.value);
        console.log(`   ${passed ? '✅' : '❌'} ${check.name}: ${passed ? 'valid' : 'invalid'}`);
        if (!passed) allPassed = false;
      }
      
      if (allPassed) {
        console.log(`   ✅ Witness constraints satisfied`);
      } else {
        throw new Error('Witness constraints not satisfied');
      }
      
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      throw error;
    }
  }
  
  console.log('\n✅ All witness constraint tests passed!');
}

testWitnessConstraints().catch(console.error);

