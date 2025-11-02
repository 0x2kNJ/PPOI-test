/**
 * Amount buckets - copied from mock-backend for Next.js API routes
 */
export type CentAmount = number;

/**
 * Create truncated ladder of power-of-2 buckets for a given balance
 */
export function createTruncatedLadder(balanceCents: CentAmount): CentAmount[] {
  if (!Number.isInteger(balanceCents) || balanceCents <= 0) {
    throw new Error('balanceCents must be a positive integer');
  }
  
  let power = 0;
  while (Math.pow(2, power + 1) <= balanceCents) {
    power++;
  }
  
  const buckets: CentAmount[] = [];
  for (let i = 0; i <= power; i++) {
    buckets.push(Math.pow(2, i));
  }
  
  return buckets;
}

/**
 * Static buckets for $1,000 limit (17 buckets)
 */
export const CENT_BUCKETS: CentAmount[] = createTruncatedLadder(100000);

