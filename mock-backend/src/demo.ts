import { decomposeAmountIntoBuckets, dollarsToCents, centsToDollars } from './amountBuckets.js'

console.log('🎯 Interactive Demo: 17 Buckets Covering $0.01 to $1000.00\n')

// Test some tricky amounts
const testAmounts = [
  0.01,    // 1 cent
  0.99,    // 99 cents  
  1.00,    // 1 dollar
  9.99,    // 9.99 dollars
  10.00,   // 10 dollars
  99.99,   // 99.99 dollars
  100.00,  // 100 dollars
  999.99,  // 999.99 dollars
  1000.00  // 1000 dollars
]

console.log('Testing tricky amounts:\n')

for (const amount of testAmounts) {
  const cents = dollarsToCents(amount)
  const plan = decomposeAmountIntoBuckets(cents)
  
  console.log(`$${amount.toFixed(2)} (${cents}¢):`)
  console.log(`  Buckets: ${plan.buckets.map(c => centsToDollars(c)).join(' + ')}`)
  console.log(`  Sum: ${plan.buckets.reduce((a, b) => a + b, 0)}¢ = $${(plan.buckets.reduce((a, b) => a + b, 0) / 100).toFixed(2)}`)
  console.log(`  Buckets used: ${plan.buckets.length}`)
  console.log()
}

// Show why this works mathematically
console.log('🔬 Mathematical Foundation:\n')
console.log('Think of it like binary numbers, but in cents:')
console.log('• 1¢ = 2^0 = 1')
console.log('• 2¢ = 2^1 = 2') 
console.log('• 4¢ = 2^2 = 4')
console.log('• 8¢ = 2^3 = 8')
console.log('• 16¢ = 2^4 = 16')
console.log('• ... and so on up to 65536¢ = 2^16')
console.log()
console.log('Just like any number can be written in binary (using 1s and 0s),')
console.log('any amount of cents can be written as a sum of these power-of-2 buckets!')
console.log()
console.log('Example: 100¢ = 64 + 32 + 4 (binary: 1100100)')
console.log('Example: 1000¢ = 512 + 256 + 128 + 64 + 32 + 8 (binary: 1111101000)')
console.log()
console.log('✅ This is why 17 buckets can cover 100,000 different amounts!')




