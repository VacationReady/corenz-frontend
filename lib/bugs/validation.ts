/**
 * Bug Report Validation and Sanitization
 * 
 * Provides input validation and XSS sanitization for bug reports.
 * 
 * Requirements: 4.7, 9.5
 */

import DOMPurify from "isomorphic-dompurify";
import {
  BUG_VALIDATION,
  isBugSeverity,
  isBugStatus,
  type BugSeverity,
  type BugStatus,
  type CreateBugRequest,
} from "../../app/types/bugs";

// ============================================
// TYPES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface SanitizedBugInput {
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: BugSeverity;
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize text input to prevent XSS attacks
 * 
 * Uses DOMPurify to remove potentially dangerous HTML/JavaScript.
 * Strips all HTML tags for plain text fields.
 * 
 * Requirements: 4.7, 9.5
 * 
 * @param input - The raw input string
 * @returns Sanitized string with HTML tags removed
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) {
    return "";
  }

  // Use DOMPurify to sanitize, then strip all HTML tags for plain text
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
  });

  // Additional cleanup: decode HTML entities and trim
  return decodeHtmlEntities(sanitized).trim();
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
  };

  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (match) => entities[match] || match);
}

/**
 * Sanitize admin notes (allows basic formatting)
 * 
 * Admin notes may contain basic formatting but no scripts.
 * 
 * @param input - The raw input string
 * @returns Sanitized string with safe HTML preserved
 */
export function sanitizeAdminNotes(input: string | undefined | null): string {
  if (!input) {
    return "";
  }

  // Allow basic formatting tags for admin notes
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "u", "br", "p", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
  }).trim();
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate title field
 * 
 * @param title - The title to validate
 * @returns Validation result with error message if invalid
 */
export function validateTitle(title: string | undefined | null): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: "Title is required" };
  }

  const trimmed = title.trim();

  if (trimmed.length > BUG_VALIDATION.TITLE_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Title must be ${BUG_VALIDATION.TITLE_MAX_LENGTH} characters or less`,
    };
  }

  return { isValid: true };
}

/**
 * Validate description field
 * 
 * @param description - The description to validate
 * @returns Validation result with error message if invalid
 */
export function validateDescription(
  description: string | undefined | null
): { isValid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { isValid: false, error: "Description is required" };
  }

  const trimmed = description.trim();

  if (trimmed.length > BUG_VALIDATION.DESCRIPTION_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Description must be ${BUG_VALIDATION.DESCRIPTION_MAX_LENGTH} characters or less`,
    };
  }

  return { isValid: true };
}

/**
 * Validate steps to reproduce field (optional)
 * 
 * @param steps - The steps to validate
 * @returns Validation result with error message if invalid
 */
export function validateStepsToReproduce(
  steps: string | undefined | null
): { isValid: boolean; error?: string } {
  if (!steps || steps.trim().length === 0) {
    return { isValid: true }; // Optional field
  }

  const trimmed = steps.trim();

  if (trimmed.length > BUG_VALIDATION.STEPS_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Steps to reproduce must be ${BUG_VALIDATION.STEPS_MAX_LENGTH} characters or less`,
    };
  }

  return { isValid: true };
}

/**
 * Validate severity field
 * 
 * @param severity - The severity to validate
 * @returns Validation result with error message if invalid
 */
export function validateSeverity(
  severity: string | undefined | null
): { isValid: boolean; error?: string } {
  if (!severity) {
    return { isValid: false, error: "Severity is required" };
  }

  if (!isBugSeverity(severity)) {
    return {
      isValid: false,
      error: "Severity must be one of: CRITICAL, HIGH, MEDIUM, LOW",
    };
  }

  return { isValid: true };
}

/**
 * Validate status field
 * 
 * @param status - The status to validate
 * @returns Validation result with error message if invalid
 */
export function validateStatus(
  status: string | undefined | null
): { isValid: boolean; error?: string } {
  if (!status) {
    return { isValid: true }; // Optional for updates
  }

  if (!isBugStatus(status)) {
    return {
      isValid: false,
      error: "Status must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED, WONT_FIX",
    };
  }

  return { isValid: true };
}

/**
 * Validate a complete bug creation request
 * 
 * Requirements: 2.5, 4.4
 * 
 * @param request - The bug creation request to validate
 * @returns Validation result with all errors
 */
export function validateCreateBugRequest(request: Partial<CreateBugRequest>): ValidationResult {
  const errors: Record<string, string> = {};

  const titleResult = validateTitle(request.title);
  if (!titleResult.isValid && titleResult.error) {
    errors.title = titleResult.error;
  }

  const descriptionResult = validateDescription(request.description);
  if (!descriptionResult.isValid && descriptionResult.error) {
    errors.description = descriptionResult.error;
  }

  const stepsResult = validateStepsToReproduce(request.stepsToReproduce);
  if (!stepsResult.isValid && stepsResult.error) {
    errors.stepsToReproduce = stepsResult.error;
  }

  const severityResult = validateSeverity(request.severity);
  if (!severityResult.isValid && severityResult.error) {
    errors.severity = severityResult.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate and sanitize a bug creation request
 * 
 * Combines validation and sanitization into a single operation.
 * Returns sanitized input if valid, or validation errors if invalid.
 * 
 * Requirements: 4.7, 9.5
 * 
 * @param request - The raw bug creation request
 * @returns Either sanitized input or validation errors
 */
export function validateAndSanitizeBugRequest(
  request: Partial<CreateBugRequest>
): { success: true; data: SanitizedBugInput } | { success: false; errors: Record<string, string> } {
  // First validate
  const validation = validateCreateBugRequest(request);
  
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  // Then sanitize
  const sanitized: SanitizedBugInput = {
    title: sanitizeText(request.title),
    description: sanitizeText(request.description),
    severity: request.severity as BugSeverity,
  };

  if (request.stepsToReproduce) {
    sanitized.stepsToReproduce = sanitizeText(request.stepsToReproduce);
  }

  // Re-validate after sanitization (in case sanitization made fields empty)
  const postSanitizationValidation = validateCreateBugRequest(sanitized);
  
  if (!postSanitizationValidation.isValid) {
    return { success: false, errors: postSanitizationValidation.errors };
  }

  return { success: true, data: sanitized };
}

/**
 * Validate admin notes update
 * 
 * @param adminNotes - The admin notes to validate
 * @returns Validation result with error message if invalid
 */
export function validateAdminNotes(
  adminNotes: string | undefined | null
): { isValid: boolean; error?: string } {
  if (!adminNotes) {
    return { isValid: true }; // Optional field
  }

  // Admin notes have a reasonable limit
  const MAX_ADMIN_NOTES_LENGTH = 10000;
  
  if (adminNotes.length > MAX_ADMIN_NOTES_LENGTH) {
    return {
      isValid: false,
      error: `Admin notes must be ${MAX_ADMIN_NOTES_LENGTH} characters or less`,
    };
  }

  return { isValid: true };
}

// ============================================
// COMMENT VALIDATION
// ============================================

/**
 * Maximum length for comment content
 */
const COMMENT_MAX_LENGTH = 5000;

/**
 * Validate comment content
 * 
 * Requirements: 11.2
 * 
 * @param content - The comment content to validate
 * @returns Validation result with error message if invalid
 */
export function validateCommentContent(
  content: string | undefined | null
): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: "Comment content is required" };
  }

  const trimmed = content.trim();

  if (trimmed.length > COMMENT_MAX_LENGTH) {
    return {
      valid: false,
      error: `Comment must be ${COMMENT_MAX_LENGTH} characters or less`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize input text (alias for sanitizeText for cleaner imports)
 * 
 * @param input - The raw input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string | undefined | null): string {
  return sanitizeText(input);
}

// Export validation constants for use in other modules
export { BUG_VALIDATION };
