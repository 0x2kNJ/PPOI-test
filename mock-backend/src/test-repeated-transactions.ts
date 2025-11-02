/**
 * Test ZK Proof Generation for Repeated Transactions
 * 
 * This test simulates multiple sequential payments to verify that:
 * 1. Truncated ladder buckets are generated correctly
 * 2. Amounts are decomposed into buckets correctly
 * 3. Proof generation works for repeated transactions
 * 4. State changes are handled correctly (balance updates)
 */

import {
  createTruncatedLadder,
  decomposeAmountIntoBuckets,
  getOptimalBuckets,
  dollarsToCents,
  centsToDollars,
  type CentAmount,
} from './amountBuckets.js'

interface Transaction {
  id: string
  amount: CentAmount
  buckets: CentAmount[]
  proofId: string
  timestamp: number
}

interface ProofArtifact {
  proofId: string
  noteId: string
  amount: CentAmount
  buckets: CentAmount[]
  proof: string
  publicInputs: string[]
  nullifier: string
}

/**
 * Simulate ZK proof generation
 * In production, this would call the actual Bermuda ZKP circuit
 */
function generateProof(
  noteId: string,
  amount: CentAmount,
  buckets: CentAmount[],
  nullifier: string
): ProofArtifact {
  // Simulate proof generation
  // In production: await wallet.zkp.precompute({ noteId, amount, buckets })
  
  const proofId = `proof_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const proof = `0x${Buffer.from(`${proofId}_${nullifier}`).toString('hex').padStart(128, '0')}`
  const publicInputs = [noteId, amount.toString(), buckets.join(',')]
  
  return {
    proofId,
    noteId,
    amount,
    buckets,
    proof,
    publicInputs,
    nullifier,
  }
}

/**
 * Simulate nullifier generation
 * In production, this would use the actual nullifier derivation
 */
function generateNullifier(noteId: string, nonce: number): string {
  // Simulate nullifier = hash(noteId, nonce)
  const hash = Buffer.from(`${noteId}_${nonce}`).toString('hex')
  return `0x${hash.padStart(64, '0')}`
}

/**
 * Test repeated transactions with state updates
 */
class RepeatedTransactionTest {
  private balance: CentAmount
  private noteId: string
  private transactions: Transaction[] = []
  private proofs: Map<string, ProofArtifact> = new Map()
  private nonce = 0
  
  constructor(initialBalance: CentAmount, noteId: string) {
    this.balance = initialBalance
    this.noteId = noteId
  }
  
  /**
   * Process a payment transaction
   */
  async processPayment(amountCents: CentAmount): Promise<{
    success: boolean
    transaction: Transaction | null
    proof: ProofArtifact | null
    newBalance: CentAmount
    error?: string
  }> {
    // 1. Check balance
    if (amountCents > this.balance) {
      return {
        success: false,
        transaction: null,
        proof: null,
        newBalance: this.balance,
        error: `Insufficient balance: ${centsToDollars(amountCents)} > ${centsToDollars(this.balance)}`,
      }
    }
    
    // 2. Get optimal buckets for current balance
    const optimalBuckets = getOptimalBuckets(this.balance)
    
    // 3. Decompose amount into buckets
    let bucketPlan
    try {
      bucketPlan = decomposeAmountIntoBuckets(amountCents, optimalBuckets)
    } catch (error: any) {
      return {
        success: false,
        transaction: null,
        proof: null,
        newBalance: this.balance,
        error: error.message,
      }
    }
    
    // 4. Generate nullifier (unique per transaction)
    const nullifier = generateNullifier(this.noteId, this.nonce++)
    
    // 5. Generate proof
    const proof = generateProof(
      this.noteId,
      amountCents,
      bucketPlan.buckets,
      nullifier
    )
    
    // 6. Create transaction record
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${this.nonce}`,
      amount: amountCents,
      buckets: bucketPlan.buckets,
      proofId: proof.proofId,
      timestamp: Date.now(),
    }
    
    // 7. Update state
    this.transactions.push(transaction)
    this.proofs.set(proof.proofId, proof)
    this.balance -= amountCents
    
    return {
      success: true,
      transaction,
      proof,
      newBalance: this.balance,
    }
  }
  
  /**
   * Get current balance
   */
  getBalance(): CentAmount {
    return this.balance
  }
  
  /**
   * Get transaction history
   */
  getTransactions(): Transaction[] {
    return [...this.transactions]
  }
  
  /**
   * Get proof by ID
   */
  getProof(proofId: string): ProofArtifact | undefined {
    return this.proofs.get(proofId)
  }
}

/**
 * Run comprehensive test suite
 */
async function runTestSuite() {
  console.log('🧪 ZK Proof Generation Test Suite for Repeated Transactions\n')
  console.log('='.repeat(60))
  
  // Test 1: Basic repeated transactions
  console.log('\n📋 Test 1: Basic Repeated Transactions')
  console.log('-'.repeat(60))
  
  const test1 = new RepeatedTransactionTest(
    dollarsToCents(1000.00), // $1,000 starting balance
    'note_0x1234567890abcdef'
  )
  
  const payments1 = [
    dollarsToCents(100.00),  // $100
    dollarsToCents(50.00),   // $50
    dollarsToCents(25.00),   // $25
    dollarsToCents(10.00),   // $10
    dollarsToCents(5.00),    // $5
  ]
  
  for (const payment of payments1) {
    const result = await test1.processPayment(payment)
    
    if (result.success) {
      console.log(`✅ Payment: ${centsToDollars(payment)}`)
      console.log(`   Buckets: ${result.transaction!.buckets.map(centsToDollars).join(' + ')}`)
      console.log(`   Proof ID: ${result.proof!.proofId.slice(0, 20)}...`)
      console.log(`   New Balance: ${centsToDollars(result.newBalance)}`)
    } else {
      console.log(`❌ Payment failed: ${centsToDollars(payment)} - ${result.error}`)
    }
    console.log()
  }
  
  // Test 2: Variable bucket sizes as balance decreases
  console.log('\n📋 Test 2: Variable Bucket Sizes (Balance Decreasing)')
  console.log('-'.repeat(60))
  
  const test2 = new RepeatedTransactionTest(
    dollarsToCents(500.00), // $500 starting balance
    'note_0xabcdef1234567890'
  )
  
  console.log(`Initial Balance: ${centsToDollars(test2.getBalance())}`)
  const initialBuckets = getOptimalBuckets(test2.getBalance())
  console.log(`Initial Buckets: ${initialBuckets.length} buckets (max: ${centsToDollars(initialBuckets[initialBuckets.length - 1])})`)
  console.log()
  
  const largePayment = dollarsToCents(400.00) // $400 (80% of balance)
  const result1 = await test2.processPayment(largePayment)
  
  if (result1.success) {
    console.log(`✅ Large Payment: ${centsToDollars(largePayment)}`)
    console.log(`   Used ${result1.transaction!.buckets.length} buckets`)
    console.log(`   New Balance: ${centsToDollars(result1.newBalance)}`)
    
    const newBuckets = getOptimalBuckets(result1.newBalance)
    console.log(`   New Optimal Buckets: ${newBuckets.length} buckets (max: ${centsToDollars(newBuckets[newBuckets.length - 1])})`)
    console.log(`   Bucket count changed: ${initialBuckets.length !== newBuckets.length ? 'Yes' : 'No'}`)
  }
  console.log()
  
  // Test 3: Edge cases
  console.log('\n📋 Test 3: Edge Cases')
  console.log('-'.repeat(60))
  
  const test3 = new RepeatedTransactionTest(
    dollarsToCents(1000.00),
    'note_0xfedcba0987654321'
  )
  
  // Smallest payment
  const smallest = await test3.processPayment(1) // 1 cent
  console.log(`Smallest payment (1¢): ${smallest.success ? '✅' : '❌'}`)
  
  // Largest payment
  const largest = await test3.processPayment(test3.getBalance())
  console.log(`Largest payment (all balance): ${largest.success ? '✅' : '❌'}`)
  
  // Over balance
  const over = await test3.processPayment(test3.getBalance() + 1)
  console.log(`Over balance: ${over.success ? '✅' : '❌'} (expected: false)`)
  console.log(`   Error: ${over.error}`)
  
  // Test 4: Sequential payments with proof reuse
  console.log('\n📋 Test 4: Sequential Payments (Proof Generation)')
  console.log('-'.repeat(60))
  
  const test4 = new RepeatedTransactionTest(
    dollarsToCents(1000.00),
    'note_0x1111111111111111'
  )
  
  const sequentialPayments = Array.from({ length: 10 }, (_, i) => 
    dollarsToCents((i + 1) * 10) // $10, $20, $30, ..., $100
  )
  
  console.log(`Processing ${sequentialPayments.length} sequential payments...\n`)
  
  const startTime = Date.now()
  for (const payment of sequentialPayments) {
    const result = await test4.processPayment(payment)
    if (!result.success) {
      console.log(`❌ Failed at payment ${centsToDollars(payment)}: ${result.error}`)
      break
    }
  }
  const endTime = Date.now()
  
  const transactions = test4.getTransactions()
  console.log(`\n✅ Processed ${transactions.length} transactions in ${endTime - startTime}ms`)
  console.log(`   Average: ${((endTime - startTime) / transactions.length).toFixed(2)}ms per transaction`)
  console.log(`   Final Balance: ${centsToDollars(test4.getBalance())}`)
  console.log(`   Total Spent: ${centsToDollars(transactions.reduce((sum, tx) => sum + tx.amount, 0))}`)
  
  // Verify all proofs are unique
  const proofIds = new Set(transactions.map(tx => tx.proofId))
  console.log(`   Unique Proofs: ${proofIds.size}/${transactions.length}`)
  console.log(`   Proof uniqueness: ${proofIds.size === transactions.length ? '✅' : '❌'}`)
  
  // Test 5: Truncated ladder efficiency
  console.log('\n📋 Test 5: Truncated Ladder Efficiency')
  console.log('-'.repeat(60))
  
  const testBalances = [
    dollarsToCents(100.00),   // $100
    dollarsToCents(500.00),   // $500
    dollarsToCents(1000.00),  // $1,000
    dollarsToCents(5000.00),  // $5,000
    dollarsToCents(10000.00), // $10,000
  ]
  
  console.log('Bucket count vs balance:')
  for (const balance of testBalances) {
    const buckets = getOptimalBuckets(balance)
    const maxAmount = buckets.reduce((sum, b) => sum + b, 0)
    const efficiency = ((balance / maxAmount) * 100).toFixed(1)
    console.log(`  ${centsToDollars(balance)}: ${buckets.length} buckets, max ${centsToDollars(maxAmount)}, efficiency ${efficiency}%`)
  }
  
  console.log('\n✅ All tests completed!\n')
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTestSuite().catch(console.error)
}

export { RepeatedTransactionTest, runTestSuite, generateProof, generateNullifier }

