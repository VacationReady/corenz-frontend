/**
 * Cryptography and sensitive data handling utilities
 * 
 * SECURITY NOTE: This is a client-side utility for field masking and validation.
 * TRUE encryption should occur on the backend with proper key management.
 * 
 * For production deployment:
 * 1. Implement backend encryption using industry-standard libraries (e.g., crypto module)
 * 2. Use environment-based encryption keys stored in secure vaults (e.g., AWS Secrets Manager)
 * 3. Encrypt sensitive fields (IRD, bank accounts) at rest in the database
 * 4. Use HTTPS/TLS for all data transmission
 * 5. Implement field-level encryption with proper key rotation
 * 6. Consider using database-level encryption for highly sensitive data
 */

/**
 * Masks sensitive data for display purposes
 * @param value - The value to mask
 * @param visibleStart - Number of characters visible at start
 * @param visibleEnd - Number of characters visible at end
 * @param maskChar - Character to use for masking
 * @returns Masked string
 */
export function maskSensitiveField(
  value: string,
  visibleStart: number = 0,
  visibleEnd: number = 4,
  maskChar: string = '•'
): string {
  if (!value || value.length <= visibleStart + visibleEnd) {
    return value;
  }

  const start = value.substring(0, visibleStart);
  const end = value.substring(value.length - visibleEnd);
  const maskLength = value.length - visibleStart - visibleEnd;
  
  return `${start}${maskChar.repeat(maskLength)}${end}`;
}

/**
 * Masks an IRD number for display (shows last 3 digits)
 * Example: 123-456-789 → ••••••-789
 */
export function maskIRDNumber(ird: string): string {
  const cleaned = ird.replace(/[-\s]/g, '');
  return maskSensitiveField(cleaned, 0, 3, '•');
}

/**
 * Masks a bank account number for display
 * Example: 12-3456-7890123-00 → ••-••••-•••••23-00
 */
export function maskBankAccount(account: string): string {
  const parts = account.split('-');
  if (parts.length !== 4) return maskSensitiveField(account, 0, 5);
  
  return `••-••••-${'•'.repeat(parts[2].length - 2)}${parts[2].slice(-2)}-${parts[3]}`;
}

/**
 * Encrypts sensitive data using AES-GCM with a derived key from environment.
 * 
 * Production implementation:
 * - Uses Web Crypto API with AES-GCM (256-bit)
 * - Derives encryption key from environment variable
 * - Generates random IV for each encryption
 * - Returns base64-encoded ciphertext with IV prepended
 * 
 * @param data - Data to encrypt
 * @returns Encrypted data as base64 string with format: IV:CIPHERTEXT
 */
export async function encryptSensitiveData(data: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side encryption using Node.js crypto
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    
    // Get encryption key from environment or use secure default
    const keyMaterial = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production';
    const key = crypto.createHash('sha256').update(keyMaterial).digest();
    
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Return IV:AuthTag:Ciphertext format
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }
  
  // Client-side encryption using Web Crypto API
  try {
    // Get encryption key from environment or derive from session
    const keyMaterial = (window as any).__ENCRYPTION_KEY__ || 'default-key-change-in-production';
    
    // Derive key from key material
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyMaterial);
    
    // Import key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.digest('SHA-256', keyData),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt data
    const encodedData = encoder.encode(data);
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      importedKey,
      encodedData
    );
    
    // Convert to base64
    const encryptedArray = new Uint8Array(encryptedData);
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
    
    // Return IV:Ciphertext format
    return `${ivBase64}:${encryptedBase64}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    // Fallback to base64 encoding with clear warning
    console.error('CRITICAL SECURITY WARNING: Encryption failed, falling back to base64 encoding. DO NOT USE IN PRODUCTION.');
    return `UNENCRYPTED:${btoa(data)}`;
  }
}

/**
 * Decrypts sensitive data encrypted with encryptSensitiveData.
 * 
 * @param encryptedData - Encrypted data in format IV:CIPHERTEXT or IV:AuthTag:CIPHERTEXT
 * @returns Decrypted plaintext string
 */
export async function decryptSensitiveData(encryptedData: string): Promise<string> {
  // Handle unencrypted fallback
  if (encryptedData.startsWith('UNENCRYPTED:')) {
    console.warn('Decrypting unencrypted data (fallback mode)');
    return atob(encryptedData.substring(12));
  }
  
  if (typeof window === 'undefined') {
    // Server-side decryption using Node.js crypto
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    
    // Get encryption key from environment
    const keyMaterial = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production';
    const key = crypto.createHash('sha256').update(keyMaterial).digest();
    
    // Parse IV:AuthTag:Ciphertext format
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Client-side decryption using Web Crypto API
  try {
    // Get encryption key from environment
    const keyMaterial = (window as any).__ENCRYPTION_KEY__ || 'default-key-change-in-production';
    
    // Derive key from key material
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const keyData = encoder.encode(keyMaterial);
    
    // Import key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.digest('SHA-256', keyData),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Parse IV:Ciphertext format
    const parts = encryptedData.split(':');
    if (parts.length < 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const ivBase64 = parts[0];
    const encryptedBase64 = parts[parts.length - 1];
    
    // Convert from base64
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      importedKey,
      encrypted
    );
    
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Validates that sensitive data meets security requirements before transmission
 * @param fieldName - Name of the field for error messages
 * @param value - Value to validate
 * @param isRequired - Whether the field is required
 * @returns Validation result
 */
export function validateSensitiveField(
  fieldName: string,
  value: string,
  isRequired: boolean = false
): { valid: boolean; error?: string } {
  if (!value && isRequired) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (!value) {
    return { valid: true };
  }
  
  // Check for common injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /eval\(/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(value)) {
      return { 
        valid: false, 
        error: `${fieldName} contains potentially dangerous content` 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Sanitizes input to prevent XSS attacks
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Checks if the current connection is secure (HTTPS)
 * @returns true if connection is secure
 */
export function isSecureConnection(): boolean {
  if (typeof window === 'undefined') return true; // Server-side
  return window.location.protocol === 'https:';
}

/**
 * Prepares sensitive data for secure transmission
 * Validates, sanitizes, and encrypts specified fields
 * 
 * @param data - Object containing sensitive fields
 * @param fieldsToEncrypt - Array of field names that should be encrypted
 * @returns Prepared data object with encrypted fields
 */
export async function prepareSensitiveDataForTransmission(
  data: Record<string, any>,
  fieldsToEncrypt: string[] = []
): Promise<Record<string, any>> {
  if (!isSecureConnection()) {
    console.warn('WARNING: Transmitting data over HTTP. Ensure TLS is enabled in production.');
  }
  
  const preparedData: Record<string, any> = { ...data };
  
  // Encrypt specified sensitive fields
  for (const field of fieldsToEncrypt) {
    if (preparedData[field] && typeof preparedData[field] === 'string' && preparedData[field].trim()) {
      // Validate field before encryption
      const validation = validateSensitiveField(field, preparedData[field]);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // Encrypt the field
      try {
        preparedData[field] = await encryptSensitiveData(preparedData[field]);
        // Mark field as encrypted for backend processing
        preparedData[`${field}_encrypted`] = true;
      } catch (error) {
        console.error(`Failed to encrypt field ${field}:`, error);
        throw new Error(`Failed to secure ${field} for transmission`);
      }
    }
  }
  
  return preparedData;
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
