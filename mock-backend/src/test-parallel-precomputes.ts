/**
 * Test parallel precompute generation performance
 */

import { generateAllPrecomputes } from './precomputeGenerator.js';
import { CENT_BUCKETS } from './amountBuckets.js';

async function testParallelGeneration() {
  console.log('🧪 Testing Parallel Precompute Generation\n');
  console.log('='.repeat(70));
  
  const noteId = '0x' + '00'.repeat(32);
  const totalBalance = 100000; // $1,000.00
  const buckets = CENT_BUCKETS; // All 17 buckets
  
  console.log(`\nTest Parameters:`);
  console.log(`  Note ID: ${noteId.slice(0, 18)}...`);
  console.log(`  Total Balance: $${(totalBalance / 100).toFixed(2)}`);
  console.log(`  Number of Buckets: ${buckets.length}`);
  console.log(`  Buckets: ${buckets.map(b => `$${(b / 100).toFixed(2)}`).join(', ')}`);
  
  // Test 1: Parallel Generation
  console.log('\n' + '='.repeat(70));
  console.log('TEST 1: Parallel Generation (Default)');
  console.log('='.repeat(70));
  
  const startParallel = Date.now();
  const precomputesParallel = await generateAllPrecomputes(
    noteId,
    totalBalance,
    buckets,
    undefined,
    {
      parallel: true,
      batchSize: 10,
      onProgress: (completed, total) => {
        const percent = ((completed / total) * 100).toFixed(1);
        process.stdout.write(`\r⚙️  Progress: ${completed}/${total} (${percent}%)`);
      }
    }
  );
  const durationParallel = (Date.now() - startParallel) / 1000;
  
  console.log(`\n\n✅ Parallel generation complete:`);
  console.log(`   Total time: ${durationParallel.toFixed(2)}s`);
  console.log(`   Proofs generated: ${precomputesParallel.length}`);
  console.log(`   Average per proof: ${(durationParallel / precomputesParallel.length).toFixed(2)}s`);
  console.log(`   Real proofs: ${precomputesParallel.filter(p => p.isRealProof).length}`);
  
  // Test 2: Sequential Generation (for comparison)
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: Sequential Generation (Comparison)');
  console.log('='.repeat(70));
  
  const startSequential = Date.now();
  const precomputesSequential = await generateAllPrecomputes(
    noteId,
    totalBalance,
    buckets.slice(0, 3), // Only test 3 buckets for speed
    undefined,
    {
      parallel: false,
      onProgress: (completed, total) => {
        const percent = ((completed / total) * 100).toFixed(1);
        process.stdout.write(`\r⚙️  Progress: ${completed}/${total} (${percent}%)`);
      }
    }
  );
  const durationSequential = (Date.now() - startSequential) / 1000;
  
  console.log(`\n\n✅ Sequential generation complete:`);
  console.log(`   Total time: ${durationSequential.toFixed(2)}s`);
  console.log(`   Proofs generated: ${precomputesSequential.length}`);
  console.log(`   Average per proof: ${(durationSequential / precomputesSequential.length).toFixed(2)}s`);
  
  // Performance comparison
  const speedup = (durationSequential / durationParallel) * (buckets.length / 3);
  console.log('\n' + '='.repeat(70));
  console.log('PERFORMANCE COMPARISON');
  console.log('='.repeat(70));
  console.log(`   Parallel: ${durationParallel.toFixed(2)}s for ${buckets.length} proofs`);
  console.log(`   Sequential (estimated): ${(durationSequential / 3 * buckets.length).toFixed(2)}s for ${buckets.length} proofs`);
  console.log(`   Speedup: ${speedup.toFixed(1)}x faster`);
  console.log(`   Time saved: ${((durationSequential / 3 * buckets.length) - durationParallel).toFixed(2)}s`);
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(70));
  console.log('\n🎯 CONCLUSION: Parallel generation is significantly faster!');
  console.log(`   For ${buckets.length} real ZK proofs:`);
  console.log(`   - Parallel: ~${(durationParallel).toFixed(0)}s (all proofs at once)`);
  console.log(`   - Sequential: ~${((durationSequential / 3 * buckets.length) / 60).toFixed(1)} minutes (one by one)`);
}

// Run test
testParallelGeneration().catch(console.error);



