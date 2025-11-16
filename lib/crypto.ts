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
 * TODO: Implement proper client-side encryption for transmission
 * 
 * This function is a placeholder. For production:
 * 1. Use Web Crypto API for client-side encryption
 * 2. Implement public key encryption with backend's public key
 * 3. Backend should decrypt with corresponding private key
 * 4. Consider using established libraries like `tweetnacl` or `libsodium.js`
 * 
 * @param data - Data to encrypt
 * @returns Encrypted data (currently returns base64-encoded data as placeholder)
 */
export async function encryptSensitiveData(data: string): Promise<string> {
  // PLACEHOLDER: Base64 encoding is NOT encryption
  // TODO: Implement actual encryption using Web Crypto API
  console.warn('SECURITY WARNING: Using placeholder encryption. Implement proper encryption before production.');
  
  if (typeof window === 'undefined') {
    // Server-side: use Node.js Buffer
    return Buffer.from(data).toString('base64');
  }
  
  // Client-side: use btoa
  return btoa(data);
}

/**
 * TODO: Implement proper decryption
 * 
 * @param encryptedData - Data to decrypt
 * @returns Decrypted data (currently returns base64-decoded data as placeholder)
 */
export async function decryptSensitiveData(encryptedData: string): Promise<string> {
  // PLACEHOLDER: Base64 decoding is NOT decryption
  // TODO: Implement actual decryption
  
  if (typeof window === 'undefined') {
    return Buffer.from(encryptedData, 'base64').toString('utf-8');
  }
  
  return atob(encryptedData);
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
 * Validates, sanitizes, and optionally encrypts data
 * 
 * @param data - Object containing sensitive fields
 * @param fieldsToEncrypt - Array of field names that should be encrypted
 * @returns Prepared data object
 */
export async function prepareSensitiveDataForTransmission(
  data: Record<string, any>,
  fieldsToEncrypt: string[] = []
): Promise<Record<string, any>> {
  if (!isSecureConnection()) {
    console.error('SECURITY WARNING: Transmitting sensitive data over insecure connection');
  }
  
  const preparedData: Record<string, any> = { ...data };
  
  // TODO: Implement field-level encryption for specified fields
  // For now, just validate and sanitize
  for (const field of fieldsToEncrypt) {
    if (preparedData[field]) {
      const validation = validateSensitiveField(field, preparedData[field]);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // Placeholder: In production, encrypt the field here
      // preparedData[field] = await encryptSensitiveData(preparedData[field]);
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
