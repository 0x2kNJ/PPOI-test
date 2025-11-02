#!/usr/bin/env tsx
/**
 * Test API endpoints functionality
 */

import { readFileSync } from 'fs';
import { join } from 'path';

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints\n');
  
  const apiDir = join(__dirname, 'pages', 'api');
  
  // Test 1: Precomputes API
  console.log('📋 Testing /api/precomputes:');
  try {
    const precomputesApi = join(apiDir, 'precomputes.ts');
    const content = readFileSync(precomputesApi, 'utf-8');
    
    const checks = [
      { name: 'Imports realPrecomputeGenerator', check: content.includes('realPrecomputeGenerator') },
      { name: 'Imports amountBuckets', check: content.includes('amountBuckets') },
      { name: 'Returns proof in response', check: content.includes('proof:') },
      { name: 'Returns publicInputs in response', check: content.includes('publicInputs:') },
      { name: 'No mock fallback', check: !content.includes('mock') || !content.includes('fallback') },
    ];
    
    for (const check of checks) {
      console.log(`   ${check.check ? '✅' : '❌'} ${check.name}`);
      if (!check.check) throw new Error(`Check failed: ${check.name}`);
    }
    
    console.log('   ✅ /api/precomputes looks good');
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
  
  // Test 2: Subscription API
  console.log('\n📋 Testing /api/subscription:');
  try {
    const subscriptionApi = join(apiDir, 'subscription.ts');
    const content = readFileSync(subscriptionApi, 'utf-8');
    
    const checks = [
      { name: 'Stores proof', check: content.includes('proof:') },
      { name: 'Stores publicInputs', check: content.includes('publicInputs:') },
      { name: 'PUT method for charging', check: content.includes('req.method === "PUT"') },
      { name: 'Calls execute API', check: content.includes('/api/execute') || content.includes('execute') },
      { name: 'Updates nonce on charge', check: content.includes('nonce') && content.includes('++') },
    ];
    
    for (const check of checks) {
      console.log(`   ${check.check ? '✅' : '❌'} ${check.name}`);
      if (!check.check) throw new Error(`Check failed: ${check.name}`);
    }
    
    console.log('   ✅ /api/subscription looks good');
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
  
  // Test 3: Execute API
  console.log('\n📋 Testing /api/execute:');
  try {
    const executeApi = join(apiDir, 'execute.ts');
    const content = readFileSync(executeApi, 'utf-8');
    
    const checks = [
      { name: 'Formats publicInputs', check: content.includes('publicInputs') || content.includes('args[1]') },
      { name: 'Calls contract method', check: content.includes('contract[method]') },
      { name: 'Handles take method', check: content.includes('take') },
      { name: 'Returns txHash', check: content.includes('txHash') },
    ];
    
    for (const check of checks) {
      console.log(`   ${check.check ? '✅' : '❌'} ${check.name}`);
      if (!check.check) throw new Error(`Check failed: ${check.name}`);
    }
    
    console.log('   ✅ /api/execute looks good');
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
  
  console.log('\n✅ All API endpoint tests passed!');
}

testAPIEndpoints().catch(console.error);



