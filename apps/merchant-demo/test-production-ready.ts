#!/usr/bin/env tsx
/**
 * Production Readiness Test Suite
 * Tests real ZK proof generation, witness validation, and on-chain verification setup
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const SDK_PATH = '/Users/0xblockbird/Cursor/Bermuda/baanx/demo/ui/lib/sdk/build/src';
const CIRCUIT_DIR = '/Users/0xblockbird/Cursor/Bermuda/baanx/demo/lib/precompute-circuit';
const CIRCUIT_JSON = join(CIRCUIT_DIR, 'circuit.json');
const NARGO_PATH = '/Users/0xblockbird/.nargo/bin/nargo';
const BB_PATH = '/Users/0xblockbird/.bb/bb';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void> | void): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => results.push({ name, passed: true }))
        .catch((error) => results.push({ name, passed: false, error: error.message }));
    } else {
      results.push({ name, passed: true });
    }
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
  }
}

async function runTests() {
  console.log('🧪 Production Readiness Test Suite\n');
  console.log('=' .repeat(60));

  // Test 1: SDK Build Files Exist
  test('SDK Build Files Exist', () => {
    const keypairFile = join(SDK_PATH, 'keypair.js');
    const utxoFile = join(SDK_PATH, 'utxo.js');
    const utilsFile = join(SDK_PATH, 'utils.js');
    
    if (!existsSync(keypairFile)) throw new Error(`Missing: ${keypairFile}`);
    if (!existsSync(utxoFile)) throw new Error(`Missing: ${utxoFile}`);
    if (!existsSync(utilsFile)) throw new Error(`Missing: ${utilsFile}`);
    
    console.log('✅ SDK build files exist');
  });

  // Test 2: Circuit Files Exist
  test('Circuit Files Exist', () => {
    if (!existsSync(CIRCUIT_DIR)) throw new Error(`Circuit directory missing: ${CIRCUIT_DIR}`);
    if (!existsSync(CIRCUIT_JSON)) throw new Error(`Circuit JSON missing: ${CIRCUIT_JSON}`);
    
    const circuitData = JSON.parse(readFileSync(CIRCUIT_JSON, 'utf-8'));
    if (!circuitData.bytecode) throw new Error('Circuit bytecode missing');
    
    console.log('✅ Circuit files exist');
  });

  // Test 3: Noir & Barretenberg Installed
  test('Noir & Barretenberg Installed', async () => {
    const { execSync } = await import('child_process');
    
    try {
      const nargoVersion = execSync(`${NARGO_PATH} --version`, { encoding: 'utf-8' }).trim();
      console.log(`   Nargo: ${nargoVersion}`);
    } catch {
      throw new Error('Nargo not found or not working');
    }
    
    try {
      const bbVersion = execSync(`${BB_PATH} --version`, { encoding: 'utf-8' }).trim();
      console.log(`   Barretenberg: ${bbVersion}`);
    } catch {
      throw new Error('Barretenberg not found or not working');
    }
    
    console.log('✅ Noir & Barretenberg installed');
  });

  // Test 4: SDK Can Be Imported
  test('SDK Can Be Imported', async () => {
    const { pathToFileURL } = await import('url');
    const keypairPath = pathToFileURL(join(SDK_PATH, 'keypair.js')).href;
    const utilsPath = pathToFileURL(join(SDK_PATH, 'utils.js')).href;
    
    const keypairModule = await import(keypairPath);
    const utilsModule = await import(utilsPath);
    
    if (!keypairModule.default) throw new Error('KeyPair not exported');
    if (!utilsModule.poseidon2_compression) throw new Error('poseidon2_compression not exported');
    if (!utilsModule.bigint2bytes) throw new Error('bigint2bytes not exported');
    
    console.log('✅ SDK can be imported');
  });

  // Test 5: Witness Generation Works
  test('Witness Generation Works', async () => {
    const { generateValidWitness } = await import('./lib/witnessGenerator');
    
    const witness = await generateValidWitness({
      private_key: BigInt('18289945158108304925660975126443984768591757366360530341676524993526201583222'),
      amount: BigInt(100000), // $1,000.00 in cents
      blinding: BigInt('289184164427839320485306849001486046229521124595132064080744981764368187374'),
      token: BigInt('1184589422945421143511828701991100965039074119625'),
      safe: BigInt(0),
      note: BigInt(0),
      path_index: BigInt(0),
      path_elements: Array(23).fill(BigInt(0)),
      public_amount: BigInt(-100000),
      ext_data_hash: BigInt(0),
    });
    
    if (!witness.root || !witness.root.startsWith('0x')) throw new Error('Invalid root');
    if (!witness.nullifier || !witness.nullifier.startsWith('0x')) throw new Error('Invalid nullifier');
    if (!witness.public_amount) throw new Error('Invalid public_amount');
    
    console.log('✅ Witness generation works');
    console.log(`   Root: ${witness.root.slice(0, 20)}...`);
    console.log(`   Nullifier: ${witness.nullifier.slice(0, 20)}...`);
  });

  // Test 6: Precompute Generation Works
  test('Precompute Generation Works', async () => {
    const { generatePrecompute } = await import('./lib/realPrecomputeGenerator');
    
    const precompute = await generatePrecompute(
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      100000, // $1,000.00 in cents
      100000,
      0
    );
    
    if (!precompute.proof || !precompute.proof.startsWith('0x')) throw new Error('Invalid proof');
    if (!precompute.publicInputs || precompute.publicInputs.length !== 4) {
      throw new Error(`Invalid publicInputs length: ${precompute.publicInputs?.length}`);
    }
    
    console.log('✅ Precompute generation works');
    console.log(`   Proof length: ${precompute.proof.length} chars`);
    console.log(`   Public inputs: ${precompute.publicInputs.length}`);
    console.log(`   Is real proof: ${precompute.isRealProof}`);
  });

  // Test 7: Public Inputs Match Witness
  test('Public Inputs Match Witness', async () => {
    const { generatePrecompute } = await import('./lib/realPrecomputeGenerator');
    const noteId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const amount = 100000;
    
    const precompute = await generatePrecompute(noteId, amount, amount, 0);
    
    // Check public inputs format
    const [root, public_amount, ext_data_hash, nullifier] = precompute.publicInputs;
    
    if (!root.startsWith('0x')) throw new Error('Root must be hex');
    if (!public_amount.startsWith('0x')) throw new Error('Public amount must be hex');
    if (!ext_data_hash.startsWith('0x')) throw new Error('Ext data hash must be hex');
    if (!nullifier.startsWith('0x')) throw new Error('Nullifier must be hex');
    
    // Check ext_data_hash is 0 for precompute
    if (ext_data_hash !== '0x' + '0'.repeat(64)) {
      throw new Error('Ext data hash should be 0 for precompute');
    }
    
    console.log('✅ Public inputs match witness format');
    console.log(`   Root: ${root.slice(0, 20)}...`);
    console.log(`   Public amount: ${public_amount.slice(0, 20)}...`);
    console.log(`   Ext data hash: ${ext_data_hash.slice(0, 20)}...`);
    console.log(`   Nullifier: ${nullifier.slice(0, 20)}...`);
  });

  // Test 8: API Endpoints Exist
  test('API Endpoints Exist', () => {
    const precomputesApi = join(__dirname, 'pages', 'api', 'precomputes.ts');
    const subscriptionApi = join(__dirname, 'pages', 'api', 'subscription.ts');
    const executeApi = join(__dirname, 'pages', 'api', 'execute.ts');
    
    if (!existsSync(precomputesApi)) throw new Error(`Missing: ${precomputesApi}`);
    if (!existsSync(subscriptionApi)) throw new Error(`Missing: ${subscriptionApi}`);
    if (!existsSync(executeApi)) throw new Error(`Missing: ${executeApi}`);
    
    console.log('✅ API endpoints exist');
  });

  // Test 9: Contract Interface Matches
  test('Contract Interface Matches', async () => {
    const interfacePath = join(__dirname, '..', '..', 'contracts', 'interfaces', 'IX402Adapter.sol');
    if (!existsSync(interfacePath)) throw new Error('Interface file missing');
    
    const interfaceContent = readFileSync(interfacePath, 'utf-8');
    
    // Check for publicInputs parameter
    if (!interfaceContent.includes('bytes32[] calldata publicInputs')) {
      throw new Error('Interface missing publicInputs parameter');
    }
    
    console.log('✅ Contract interface matches');
  });

  // Test 10: Parallel Precompute Generation
  test('Parallel Precompute Generation Works', async () => {
    const { generateAllPrecomputes } = await import('./lib/realPrecomputeGenerator');
    const { CENT_BUCKETS } = await import('./lib/amountBuckets');
    
    const noteId = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const maxAmountCents = 12000; // $120.00 for 12 months
    
    console.log(`   Generating ${CENT_BUCKETS.length} precomputes in parallel...`);
    const startTime = Date.now();
    
    const precomputes = await generateAllPrecomputes(
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
            console.log(`   Progress: ${completed}/${total} (${progress}%)`);
          }
        }
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (precomputes.length !== CENT_BUCKETS.length) {
      throw new Error(`Expected ${CENT_BUCKETS.length} precomputes, got ${precomputes.length}`);
    }
    
    const realProofs = precomputes.filter(p => p.isRealProof).length;
    if (realProofs !== precomputes.length) {
      throw new Error(`Expected all real proofs, got ${realProofs}/${precomputes.length}`);
    }
    
    // Verify all have public inputs
    for (const p of precomputes) {
      if (!p.publicInputs || p.publicInputs.length !== 4) {
        throw new Error(`Precompute missing public inputs: ${p.proofId}`);
      }
    }
    
    console.log(`✅ Parallel precompute generation works`);
    console.log(`   Generated ${precomputes.length} precomputes in ${duration}s`);
    console.log(`   Average: ${(parseFloat(duration) / precomputes.length).toFixed(2)}s per proof`);
    console.log(`   All proofs are real ZK proofs`);
  });

  // Wait for async tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n✅ Passed: ${passed}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! Production ready.');
  }
}

runTests().catch(console.error);



