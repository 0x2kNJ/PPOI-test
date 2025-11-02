import { decomposeAmountIntoBuckets, dollarsToCents, centsToDollars } from './amountBuckets.js'

/**
 * Verify that our bucket system can represent ALL amounts from $0.01 to $1000.00
 */
export function verifyCompleteCoverage(): {
  success: boolean
  totalAmounts: number
  failedAmounts: number[]
  sampleDecompositions: Array<{cents: number, dollars: string, buckets: number[]}>
} {
  const maxDollars = 1000.00
  const maxCents = dollarsToCents(maxDollars) // 100000
  const minCents = 1 // $0.01
  
  console.log(`Verifying coverage for all amounts from $0.01 to $${maxDollars}...`)
  console.log(`Testing ${maxCents} different amounts...`)
  
  const failedAmounts: number[] = []
  const sampleDecompositions: Array<{cents: number, dollars: string, buckets: number[]}> = []
  
  // Test every single cent amount from 1 to 100000
  for (let cents = minCents; cents <= maxCents; cents++) {
    try {
      const decomposition = decomposeAmountIntoBuckets(cents)
      
      // Verify the decomposition sums correctly
      const sum = decomposition.buckets.reduce((a, b) => a + b, 0)
      if (sum !== cents) {
        failedAmounts.push(cents)
        console.error(`FAILED: ${centsToDollars(cents)} - sum ${sum} ≠ target ${cents}`)
      }
      
      // Collect some sample decompositions for display
      if (cents === 1 || cents === 100 || cents === 1000 || cents === 5000 || 
          cents === 10000 || cents === 25000 || cents === 50000 || 
          cents === 75000 || cents === 99999 || cents === 100000) {
        sampleDecompositions.push({
          cents,
          dollars: centsToDollars(cents),
          buckets: decomposition.buckets
        })
      }
      
    } catch (error) {
      failedAmounts.push(cents)
      console.error(`FAILED: ${centsToDollars(cents)} - ${error}`)
    }
    
    // Progress indicator for large ranges
    if (cents % 10000 === 0) {
      console.log(`  Verified up to ${centsToDollars(cents)}...`)
    }
  }
  
  const totalAmounts = maxCents - minCents + 1
  const success = failedAmounts.length === 0
  
  console.log()
  console.log(`Verification ${success ? 'PASSED' : 'FAILED'}!`)
  console.log(`Total amounts tested: ${totalAmounts.toLocaleString()}`)
  console.log(`Failed amounts: ${failedAmounts.length}`)
  
  if (success) {
    console.log(`✅ ALL ${totalAmounts.toLocaleString()} amounts can be represented!`)
  } else {
    console.log(`❌ ${failedAmounts.length} amounts failed`)
    console.log('First 10 failed amounts:', failedAmounts.slice(0, 10).map(centsToDollars))
  }
  
  console.log()
  console.log('Sample decompositions:')
  sampleDecompositions.forEach(({cents, dollars, buckets}) => {
    console.log(`  ${dollars}: ${buckets.join(' + ')}¢ = ${buckets.reduce((a,b) => a+b, 0)}¢`)
  })
  
  return {
    success,
    totalAmounts,
    failedAmounts,
    sampleDecompositions
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyCompleteCoverage()
}

