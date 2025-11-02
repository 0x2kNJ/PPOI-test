export type CentAmount = number

/**
 * Create truncated ladder of power-of-2 buckets for a given balance
 * This dynamically generates optimal buckets based on the actual balance
 * 
 * @param balanceCents Balance in cents (e.g., 100000 for $1,000.00)
 * @returns Array of bucket amounts in cents (powers of 2 up to largest that fits)
 */
export function createTruncatedLadder(balanceCents: CentAmount): CentAmount[] {
  if (!Number.isInteger(balanceCents) || balanceCents <= 0) {
    throw new Error('balanceCents must be a positive integer')
  }
  
  // Find the largest power of 2 that fits within the balance
  let power = 0
  while (Math.pow(2, power + 1) <= balanceCents) {
    power++
  }
  
  // Create complete ladder up to 2^power
  const buckets: CentAmount[] = []
  for (let i = 0; i <= power; i++) {
    buckets.push(Math.pow(2, i))
  }
  
  return buckets
}

/**
 * Static buckets for backward compatibility
 * Covers up to 100,000 cents ($1,000.00) = 17 buckets
 */
export const CENT_BUCKETS: CentAmount[] = createTruncatedLadder(100000)

/**
 * Get optimal buckets for a given balance dynamically
 * Uses truncated ladder approach for optimal efficiency
 * 
 * @param balanceCents Balance in cents
 * @returns Array of bucket amounts in cents
 */
export function getOptimalBuckets(balanceCents: CentAmount): CentAmount[] {
  return createTruncatedLadder(balanceCents)
}

export type BucketPlan = {
  // total target in cents
  target: CentAmount
  // multiset of bucket values used (in cents)
  buckets: CentAmount[]
}

/**
 * Decompose an amount into bucket combinations
 * Uses greedy algorithm (always take largest bucket that fits)
 * 
 * @param targetCents Target amount in cents
 * @param availableBuckets Optional bucket array (defaults to CENT_BUCKETS for $1,000 range)
 * @returns BucketPlan with target and bucket combination
 */
export function decomposeAmountIntoBuckets(
  targetCents: CentAmount,
  availableBuckets?: CentAmount[]
): BucketPlan {
  if (!Number.isInteger(targetCents) || targetCents < 0) {
    throw new Error('targetCents must be a non-negative integer')
  }
  
  const buckets = availableBuckets || CENT_BUCKETS
  
  if (buckets.length === 0) {
    throw new Error('availableBuckets must not be empty')
  }
  
  // Sort buckets in descending order for greedy algorithm
  const sortedBuckets = [...buckets].sort((a, b) => b - a)
  
  const result: CentAmount[] = []
  let remaining = targetCents
  
  for (const bucket of sortedBuckets) {
    while (remaining >= bucket) {
      result.push(bucket)
      remaining -= bucket
    }
  }
  
  if (remaining > 0) {
    throw new Error(
      `Cannot decompose ${targetCents}¢: ${remaining}¢ remaining. ` +
      `Max representable amount with given buckets: ${targetCents - remaining}¢`
    )
  }
  
  return { target: targetCents, buckets: result }
}

export function enumerateAllPlansUpTo(maxCents: CentAmount): BucketPlan[] {
  if (!Number.isInteger(maxCents) || maxCents < 0) {
    throw new Error('maxCents must be a non-negative integer')
  }
  const plans: BucketPlan[] = []
  for (let cents = 0; cents <= maxCents; cents++) {
    plans.push(decomposeAmountIntoBuckets(cents))
  }
  return plans
}

export function dollarsToCents(amount: number): CentAmount {
  // round to cents robustly
  return Math.round(amount * 100)
}

export function centsToDollars(cents: CentAmount): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remainder = abs % 100
  return `${sign}${dollars}.${remainder.toString().padStart(2, '0')}`
}
