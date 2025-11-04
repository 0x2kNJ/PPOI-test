/**
 * Sanitization utilities for logging and storage
 * Removes or hashes sensitive data to prevent privacy leaks
 */

/**
 * List of fields that should be completely removed from logs
 */
const SENSITIVE_FIELDS = [
  'privateKey',
  'agentPrivateKey',
  'salt',
  'policyHash',
  'secret',
  'seed',
];

/**
 * List of fields that should be truncated/hashed in logs
 */
const HASH_FIELDS = [
  'leafCommitment',
  'attestation',
  'noteId',
  'signature',
  'permitSignature',
  'proof',
  'merkleProof',
  'delegationAttestation',
];

/**
 * Sanitize an object for logging by removing sensitive fields and hashing long fields
 * @param data - Object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object safe for logging
 */
export function sanitizeForLogging(
  data: any,
  options: {
    removeSensitive?: boolean;
    hashLongFields?: boolean;
    maxLength?: number;
  } = {}
): any {
  const {
    removeSensitive = true,
    hashLongFields = true,
    maxLength = 10,
  } = options;

  if (!data || typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item, options));
  }

  const sanitized: any = { ...data };

  // Remove sensitive fields
  if (removeSensitive) {
    SENSITIVE_FIELDS.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
        sanitized[`${field}_removed`] = true; // Indicate field was removed
      }
    });
  }

  // Hash/truncate long fields
  if (hashLongFields) {
    HASH_FIELDS.forEach(field => {
      if (sanitized[field]) {
        const value = sanitized[field];
        if (typeof value === 'string' && value.length > maxLength * 2) {
          // Truncate long strings
          sanitized[field] = value.slice(0, maxLength) + '...' + value.slice(-4);
        } else if (Array.isArray(value)) {
          // Truncate arrays
          sanitized[field] = `[${value.length} items]`;
        }
      }
    });
  }

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] && typeof sanitized[key] === 'object' && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeForLogging(sanitized[key], options);
    }
  });

  return sanitized;
}

/**
 * Create a safe logger that automatically sanitizes data
 */
export function createSafeLogger(prefix: string = '') {
  return {
    log: (message: string, data?: any) => {
      const sanitized = data ? sanitizeForLogging(data) : undefined;
      console.log(prefix ? `[${prefix}] ${message}` : message, sanitized || '');
    },
    error: (message: string, error?: any) => {
      const sanitized = error ? sanitizeForLogging(error) : undefined;
      console.error(prefix ? `[${prefix}] ${message}` : message, sanitized || '');
    },
    warn: (message: string, data?: any) => {
      const sanitized = data ? sanitizeForLogging(data) : undefined;
      console.warn(prefix ? `[${prefix}] ${message}` : message, sanitized || '');
    },
  };
}

/**
 * Sanitize a subscription object for logging
 */
export function sanitizeSubscription(subscription: any): any {
  return sanitizeForLogging(subscription, {
    removeSensitive: true,
    hashLongFields: true,
  });
}







