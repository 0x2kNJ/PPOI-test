/**
 * Subscription Storage Encryption
 * 
 * Encrypts subscription data at rest to protect user privacy
 * in case of server compromise or file access.
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Derive encryption key from environment or generate default
 * 
 * IMPORTANT: In production, set SUBSCRIPTION_ENCRYPTION_KEY in environment
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.SUBSCRIPTION_ENCRYPTION_KEY;
  
  if (envKey) {
    // Use environment key
    return crypto.scryptSync(envKey, 'subscription-salt', 32);
  }
  
  // Development fallback: Derive from merchant address (NOT secure for production!)
  const devKey = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS || 'default-dev-key';
  console.warn('⚠️  Using development encryption key. Set SUBSCRIPTION_ENCRYPTION_KEY in production!');
  return crypto.scryptSync(devKey, 'dev-salt', 32);
}

/**
 * Encrypt subscription data
 * 
 * @param data - Plain text data to encrypt
 * @returns Encrypted data in format: salt:iv:authTag:encryptedData (all hex-encoded)
 */
export function encryptSubscriptionData(data: string): string {
  try {
    const key = getEncryptionKey();
    
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: iv:authTag:encrypted (all hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error: any) {
    console.error('❌ Encryption error:', error.message);
    throw new Error('Failed to encrypt subscription data');
  }
}

/**
 * Decrypt subscription data
 * 
 * @param encryptedData - Encrypted data in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decryptSubscriptionData(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Parse encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    
    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    console.error('❌ Decryption error:', error.message);
    throw new Error('Failed to decrypt subscription data');
  }
}

/**
 * Check if data is encrypted (has correct format)
 */
export function isEncrypted(data: string): boolean {
  // Check format: hex:hex:hex (3 parts, all hex)
  const parts = data.split(':');
  if (parts.length !== 3) return false;
  
  // Check each part is hex
  return parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 * Encrypt subscription object
 */
export function encryptSubscription(subscription: any): string {
  const json = JSON.stringify(subscription);
  return encryptSubscriptionData(json);
}

/**
 * Decrypt subscription object
 */
export function decryptSubscription(encryptedData: string): any {
  const json = decryptSubscriptionData(encryptedData);
  return JSON.parse(json);
}
