/**
 * ============================================================================
 * AES-256-GCM FIELD-LEVEL ENCRYPTION UTILITY (Control #15 / Weakness W7)
 * ============================================================================
 * Addresses Security Weakness W7: Confidentiality & Data at Rest Protection
 * 
 * Technical Implementation:
 * 1. AES-256-GCM authenticated encryption with 256-bit symmetric key.
 * 2. Fresh 12-byte (96-bit) Initialization Vector (IV) generated per encryption call
 *    to prevent IV reuse attacks in Galois/Counter Mode.
 * 3. 16-byte Authentication Tag for GCM payload integrity verification.
 * 4. Safe ciphertext format: `enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * ============================================================================
 */
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Returns a 32-byte (256-bit) key derived from ENCRYPTION_KEY environment variable.
 */
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || 'fintech_wallet_secure_aes256_secret_key_2026!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a sensitive string (e.g., CNIC) using AES-256-GCM.
 * Generates a unique 12-byte IV for EVERY call.
 */
export function encryptField(plaintext: string): string;
export function encryptField(plaintext: string | null | undefined): string | null;
export function encryptField(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  // Prevent double-encryption if value is already encrypted
  if (typeof plaintext === 'string' && plaintext.startsWith('enc:v1:')) {
    return plaintext;
  }

  const iv = crypto.randomBytes(12); // Fresh 12-byte IV for GCM
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex'); // 16-byte GCM Auth Tag

  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string back to plaintext.
 * Verifies GCM auth tag to prevent tampering.
 */
export function decryptField(ciphertext: string): string;
export function decryptField(ciphertext: string | null | undefined): string | null;
export function decryptField(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  // If not encrypted in GCM format, return as is
  if (typeof ciphertext !== 'string' || !ciphertext.startsWith('enc:v1:')) {
    return ciphertext;
  }

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 5) return ciphertext;

    const ivHex = parts[2];
    const authTagHex = parts[3];
    const encryptedHex = parts[4];

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('AES-256-GCM Decryption failed for payload:', err);
    return ciphertext; // Fallback to raw payload if decryption fails
  }
}
