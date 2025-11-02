import { CENT_BUCKETS, decomposeAmountIntoBuckets, dollarsToCents, centsToDollars } from './amountBuckets.js'

/**
 * Calculate the minimum number of precomputes needed to cover all amounts
 * from $0.01 to $1000.00 using binary combinations
 */
export function calculateMinimumPrecomputes(): {
  minPrecomputes: number
  maxAmount: number
  buckets: number[]
  coverage: string
} {
  const maxDollars = 1000.00
  const maxCents = dollarsToCents(maxDollars) // 100000 cents
  const minCents = 1 // $0.01
  
  // Find the minimum set of buckets needed
  // We need buckets that can represent any value from 1 to 100000 cents
  
  // The minimum is the number of bits needed to represent 100000
  // 100000 in binary requires ceil(log2(100000 + 1)) bits
  const bitsNeeded = Math.ceil(Math.log2(maxCents + 1))
  
  // Find the actual buckets we need (powers of 2 in cents)
  const requiredBuckets: number[] = []
  for (let i = 0; i < bitsNeeded; i++) {
    const bucket = Math.pow(2, i) // 2^i cents
    if (bucket <= maxCents) {
      requiredBuckets.push(bucket)
    }
  }
  
  // Verify we can represent all values from 1 to maxCents
  const canRepresent = (target: number): boolean => {
    if (target === 0) return true
    if (target < 0 || target > maxCents) return false
    
    let remaining = target
    for (let i = requiredBuckets.length - 1; i >= 0 && remaining > 0; i--) {
      const bucket = requiredBuckets[i]
      while (remaining >= bucket) {
        remaining -= bucket
      }
    }
    return remaining === 0
  }
  
  // Test a few key values
  const testValues = [1, 100, 999, 1000, 9999, 50000, 99999, 100000]
  const testResults = testValues.map(cents => ({
    cents,
    dollars: centsToDollars(cents),
    canRepresent: canRepresent(cents),
    decomposition: canRepresent(cents) ? decomposeAmountIntoBuckets(cents).buckets : []
  }))
  
  console.log('Minimum precomputes calculation:')
  console.log(`Target range: $0.01 to $${maxDollars}`)
  console.log(`Range in cents: ${minCents} to ${maxCents}`)
  console.log(`Bits needed: ${bitsNeeded}`)
  console.log(`Required buckets (cents): [${requiredBuckets.join(', ')}]`)
  console.log(`Required buckets (dollars): [${requiredBuckets.map(c => centsToDollars(c)).join(', ')}]`)
  console.log(`Minimum precomputes needed: ${requiredBuckets.length}`)
  console.log()
  console.log('Test decompositions:')
  testResults.forEach(({ cents, dollars, canRepresent, decomposition }) => {
    console.log(`  ${dollars} (${cents}¢): ${canRepresent ? decomposition.join(' + ') + '¢' : 'CANNOT REPRESENT'}`)
  })
  
  return {
    minPrecomputes: requiredBuckets.length,
    maxAmount: maxCents,
    buckets: requiredBuckets,
    coverage: `Can represent any amount from $0.01 to $${maxDollars} using ${requiredBuckets.length} precomputed buckets`
  }
}

// Run the calculation
if (import.meta.url === `file://${process.argv[1]}`) {
  calculateMinimumPrecomputes()
}

