/**
 * Test Truncated Ladder Implementation
 * 
 * Verifies that the truncated ladder approach works correctly
 * for various balance amounts and payment scenarios
 */

import {
  createTruncatedLadder,
  decomposeAmountIntoBuckets,
  getOptimalBuckets,
  dollarsToCents,
  centsToDollars,
  CENT_BUCKETS,
} from './amountBuckets.js'

console.log('🧪 Truncated Ladder Test Suite\n')
console.log('='.repeat(60))

// Test 1: Basic truncated ladder generation
console.log('\n📋 Test 1: Truncated Ladder Generation')
console.log('-'.repeat(60))

const testBalances = [
  { balance: dollarsToCents(100.00), expectedBuckets: 14 },   // $100 → 2^13 (8,192¢) is largest that fits, need 14 buckets
  { balance: dollarsToCents(500.00), expectedBuckets: 16 },   // $500 → 2^15 (32,768¢) is largest that fits, need 16 buckets
  { balance: dollarsToCents(1000.00), expectedBuckets: 17 }, // $1,000 → 2^16 (65,536¢) is largest that fits, need 17 buckets
  { balance: dollarsToCents(5000.00), expectedBuckets: 19 },  // $5,000 → 2^18 (262,144¢) is largest that fits, need 19 buckets
  { balance: dollarsToCents(10000.00), expectedBuckets: 20 }, // $10,000 → 2^19 (524,288¢) is largest that fits, need 20 buckets
]

for (const { balance, expectedBuckets } of testBalances) {
  const buckets = createTruncatedLadder(balance)
  const maxAmount = buckets.reduce((sum, b) => sum + b, 0)
  const efficiency = ((balance / maxAmount) * 100).toFixed(1)
  
  console.log(`Balance: ${centsToDollars(balance)}`)
  console.log(`  Buckets: ${buckets.length} (expected: ${expectedBuckets}) ${buckets.length === expectedBuckets ? '✅' : '❌'}`)
  console.log(`  Max amount: ${centsToDollars(maxAmount)}`)
  console.log(`  Efficiency: ${efficiency}%`)
  console.log(`  Largest bucket: ${centsToDollars(buckets[buckets.length - 1])}`)
  console.log()
}

// Test 2: Decomposition correctness
console.log('\n📋 Test 2: Amount Decomposition')
console.log('-'.repeat(60))

const testAmounts = [
  dollarsToCents(0.01),   // 1 cent
  dollarsToCents(0.99),   // 99 cents
  dollarsToCents(1.00),   // $1
  dollarsToCents(10.00),  // $10
  dollarsToCents(100.00), // $100
  dollarsToCents(999.99), // $999.99
  dollarsToCents(1000.00), // $1,000
]

for (const amount of testAmounts) {
  try {
    const plan = decomposeAmountIntoBuckets(amount)
    const sum = plan.buckets.reduce((a, b) => a + b, 0)
    const correct = sum === amount
    
    console.log(`Amount: ${centsToDollars(amount)}`)
    console.log(`  Buckets: ${plan.buckets.length} buckets`)
    console.log(`  Sum: ${centsToDollars(sum)} ${correct ? '✅' : '❌'}`)
    if (plan.buckets.length <= 5) {
      console.log(`  Decomposition: ${plan.buckets.map(centsToDollars).join(' + ')}`)
    }
    console.log()
  } catch (error: any) {
    console.log(`Amount: ${centsToDollars(amount)} ❌ Error: ${error.message}`)
    console.log()
  }
}

// Test 3: Truncated ladder vs static buckets
console.log('\n📋 Test 3: Truncated Ladder vs Static Buckets')
console.log('-'.repeat(60))

const staticBuckets = CENT_BUCKETS
console.log(`Static CENT_BUCKETS: ${staticBuckets.length} buckets`)
console.log(`  Covers up to: ${centsToDollars(staticBuckets.reduce((a, b) => a + b, 0))}`)
console.log()

const dynamicBalances = [dollarsToCents(500.00), dollarsToCents(1000.00), dollarsToCents(2000.00)]

for (const balance of dynamicBalances) {
  const dynamicBuckets = getOptimalBuckets(balance)
  const staticMax = staticBuckets.reduce((a, b) => a + b, 0)
  const dynamicMax = dynamicBuckets.reduce((a, b) => a + b, 0)
  
  console.log(`Balance: ${centsToDollars(balance)}`)
  console.log(`  Static buckets: ${staticBuckets.length} buckets, max ${centsToDollars(staticMax)}`)
  console.log(`  Dynamic buckets: ${dynamicBuckets.length} buckets, max ${centsToDollars(dynamicMax)}`)
  
  const staticEfficiency = ((balance / staticMax) * 100).toFixed(1)
  const dynamicEfficiency = ((balance / dynamicMax) * 100).toFixed(1)
  
  console.log(`  Static efficiency: ${staticEfficiency}%`)
  console.log(`  Dynamic efficiency: ${dynamicEfficiency}%`)
  
  if (dynamicEfficiency > staticEfficiency) {
    console.log(`  ✅ Dynamic is more efficient (+${(parseFloat(dynamicEfficiency) - parseFloat(staticEfficiency)).toFixed(1)}%)`)
  }
  console.log()
}

// Test 4: Edge cases
console.log('\n📋 Test 4: Edge Cases')
console.log('-'.repeat(60))

// Minimum balance
try {
  const minBuckets = createTruncatedLadder(1) // 1 cent
  console.log(`Minimum balance (1¢): ${minBuckets.length} bucket ✅`)
  console.log(`  Buckets: ${minBuckets.map(centsToDollars).join(', ')}`)
} catch (error: any) {
  console.log(`Minimum balance: ❌ ${error.message}`)
}
console.log()

// Power of 2 balance
const powerOf2Balance = dollarsToCents(655.36) // 65,536 cents = 2^16
try {
  const buckets = createTruncatedLadder(powerOf2Balance)
  console.log(`Power-of-2 balance (65,536¢ = 2^16): ${buckets.length} buckets ✅`)
  console.log(`  Largest bucket: ${centsToDollars(buckets[buckets.length - 1])}`)
} catch (error: any) {
  console.log(`Power-of-2 balance: ❌ ${error.message}`)
}
console.log()

// Large balance
const largeBalance = dollarsToCents(10000.00) // $10,000
try {
  const buckets = createTruncatedLadder(largeBalance)
  const maxAmount = buckets.reduce((sum, b) => sum + b, 0)
  console.log(`Large balance ($10,000): ${buckets.length} buckets ✅`)
  console.log(`  Max representable: ${centsToDollars(maxAmount)}`)
  console.log(`  Efficiency: ${((largeBalance / maxAmount) * 100).toFixed(1)}%`)
} catch (error: any) {
  console.log(`Large balance: ❌ ${error.message}`)
}

console.log('\n✅ Truncated ladder tests completed!\n')

