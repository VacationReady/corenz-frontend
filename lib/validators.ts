/**
 * Reusable validation functions for form inputs
 * 
 * Provides common validators for email, phone numbers (NZ format),
 * and required field checks with consistent error messages.
 * 
 * @version 1.0
 * @date 2024-11-17
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email address format
 * Uses RFC 5322 compliant regex pattern
 */
export function validateEmail(email: string | undefined | null): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'Email is required' };
  }

  // RFC 5322 simplified regex for email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Additional checks
  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  const [localPart, domain] = trimmed.split('@');
  
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email local part is too long' };
  }

  if (domain && domain.length > 253) {
    return { isValid: false, error: 'Email domain is too long' };
  }

  return { isValid: true };
}

/**
 * Validate phone number format
 * Supports NZ format with +64 country code
 * Also accepts other international formats and local NZ numbers
 */
export function validatePhone(phone: string | undefined | null): ValidationResult {
  if (!phone) {
    return { isValid: true }; // Phone is optional
  }

  const trimmed = phone.trim();
  
  if (!trimmed) {
    return { isValid: true }; // Empty is valid (optional field)
  }

  // Remove common formatting characters
  const cleaned = trimmed.replace(/[\s\-()]/g, '');

  // Check if it contains only valid characters (digits, +, spaces, hyphens, parentheses)
  if (!/^[\d\s\-+()]+$/.test(trimmed)) {
    return { isValid: false, error: 'Phone number contains invalid characters' };
  }

  // Must have at least 7 digits (minimum for local NZ numbers)
  const digitsOnly = cleaned.replace(/[^\d]/g, '');
  if (digitsOnly.length < 7) {
    return { isValid: false, error: 'Phone number is too short (minimum 7 digits)' };
  }

  // Maximum length check (international numbers can be up to 15 digits per E.164)
  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number is too long (maximum 15 digits)' };
  }

  // NZ-specific validation hints
  if (cleaned.startsWith('+64')) {
    // NZ international format: +64 followed by area code (no leading 0) and number
    // Example: +64 21 123 4567 or +64 9 123 4567
    const nzNumber = cleaned.slice(3); // Remove +64
    if (nzNumber.length < 8 || nzNumber.length > 10) {
      return { 
        isValid: false, 
        error: 'NZ phone number should be 8-10 digits after +64' 
      };
    }
  } else if (cleaned.startsWith('64') && !cleaned.startsWith('+')) {
    // Common mistake: 64 without +
    return { 
      isValid: false, 
      error: 'NZ international format should start with +64 (not 64)' 
    };
  } else if (cleaned.startsWith('0')) {
    // NZ local format: 0X XXXX XXXX
    if (digitsOnly.length < 9 || digitsOnly.length > 11) {
      return { 
        isValid: false, 
        error: 'NZ local number should be 9-11 digits including leading 0' 
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate required field (non-empty string)
 */
export function validateRequired(
  value: string | undefined | null,
  fieldName: string = 'This field'
): ValidationResult {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmed = value.trim();
  
  if (!trimmed) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
}

/**
 * Validate date field
 * Checks if date is valid and optionally within a range
 */
export function validateDate(
  dateString: string | undefined | null,
  options?: {
    fieldName?: string;
    minDate?: Date;
    maxDate?: Date;
    required?: boolean;
  }
): ValidationResult {
  const fieldName = options?.fieldName || 'Date';
  const required = options?.required ?? true;

  if (!dateString) {
    if (required) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
  }

  const date = new Date(dateString);
  
  if (Number.isNaN(date.getTime())) {
    return { isValid: false, error: `${fieldName} is not a valid date` };
  }

  if (options?.minDate && date < options.minDate) {
    return { 
      isValid: false, 
      error: `${fieldName} must be after ${options.minDate.toLocaleDateString()}` 
    };
  }

  if (options?.maxDate && date > options.maxDate) {
    return { 
      isValid: false, 
      error: `${fieldName} must be before ${options.maxDate.toLocaleDateString()}` 
    };
  }

  return { isValid: true };
}

/**
 * Get helper text for phone number input
 * Provides contextual hints based on current input
 */
export function getPhoneHelperText(phone: string | undefined | null): string {
  if (!phone) {
    return 'NZ format: +64 21 123 4567 or 021 123 4567';
  }

  const trimmed = phone.trim();
  const cleaned = trimmed.replace(/[\s\-()]/g, '');

  if (cleaned.startsWith('0') && cleaned.length > 1) {
    // Show international format suggestion
    const withoutLeadingZero = cleaned.slice(1);
    return `International format: +64 ${withoutLeadingZero}`;
  }

  if (cleaned.startsWith('+64') || cleaned.startsWith('64')) {
    return 'NZ international format detected';
  }

  return 'NZ format: +64 21 123 4567 or 021 123 4567';
}

/**
 * Format phone number for display (NZ format)
 * Converts various formats to a consistent display format
 */
export function formatPhoneDisplay(phone: string | undefined | null): string {
  if (!phone) return '';

  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Convert to international format if local NZ
  if (cleaned.startsWith('0')) {
    const withoutZero = cleaned.slice(1);
    return `+64 ${withoutZero}`;
  }

  // Already in international format
  if (cleaned.startsWith('+64')) {
    return cleaned.replace('+64', '+64 ');
  }

  // Return as-is for other formats
  return phone;
}

/**
 * Validate multiple fields at once
 * Returns a map of field names to validation results
 */
export function validateFields(
  fields: Record<string, { value: any; validator: (value: any) => ValidationResult }>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const [fieldName, { value, validator }] of Object.entries(fields)) {
    results[fieldName] = validator(value);
  }

  return results;
}

/**
 * Check if any validation results contain errors
 */
export function hasValidationErrors(
  results: Record<string, ValidationResult>
): boolean {
  return Object.values(results).some((result) => !result.isValid);
}
