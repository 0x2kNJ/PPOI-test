import { verifyCompleteCoverage } from './verifyCompleteCoverage.js'
import { decomposeAmountIntoBuckets, dollarsToCents } from './amountBuckets.js'

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}min`
}

console.log('🚀 Benchmarking precompute verification on MacBook...\n')

// Benchmark the full verification
console.log('Running full verification of 100,000 amounts...')
const startFull = performance.now()
const result = verifyCompleteCoverage()
const endFull = performance.now()
const fullTime = endFull - startFull

console.log(`\n📊 Full verification results:`)
console.log(`• Total time: ${formatTime(fullTime)}`)
console.log(`• Amounts per second: ${(result.totalAmounts / (fullTime / 1000)).toLocaleString()} amounts/sec`)
console.log(`• Time per amount: ${(fullTime / result.totalAmounts * 1000).toFixed(2)} microseconds`)

// Benchmark individual decompositions
console.log(`\n🔬 Benchmarking individual decompositions...`)
const testAmounts = [1, 100, 1000, 10000, 50000, 99999, 100000]
const iterations = 10000

for (const cents of testAmounts) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    decomposeAmountIntoBuckets(cents)
  }
  const end = performance.now()
  const avgTime = (end - start) / iterations
  
  console.log(`• $${(cents/100).toFixed(2)}: ${(avgTime * 1000).toFixed(2)} microseconds/decomposition`)
}

// Memory usage estimate
const bucketCount = 17
const avgBucketsPerAmount = 8.5 // rough estimate
const memoryPerDecomposition = 8 * avgBucketsPerAmount // 8 bytes per number
const totalMemory = result.totalAmounts * memoryPerDecomposition

console.log(`\n💾 Memory estimates:`)
console.log(`• Buckets needed: ${bucketCount}`)
console.log(`• Average buckets per amount: ~${avgBucketsPerAmount}`)
console.log(`• Memory per decomposition: ~${memoryPerDecomposition} bytes`)
console.log(`• Total memory for all decompositions: ~${(totalMemory / 1024 / 1024).toFixed(2)} MB`)

console.log(`\n✅ Benchmark complete!`)

