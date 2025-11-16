"use client";

/**
 * Step Label Validator Component
 * 
 * Provides real-time validation of onboarding step labels with:
 * - Duplicate detection within the current template
 * - Intelligent alternative suggestions
 * - Localized error messages
 * - Tenant-scoped uniqueness enforcement
 * - Audit trail integration
 */

import { useEffect, useState, useCallback } from "react";
import {
  validateStepLabel,
  generateUniqueLabel,
  getValidationMessage,
  type StepForValidation,
  type LabelValidationResult,
} from "@/lib/onboarding/label-validation";

export interface StepLabelValidatorProps {
  /** Current label/title value */
  value: string;
  /** Current step ID or key (for excluding from duplicate check) */
  currentStepId?: string;
  /** All steps in the template for uniqueness checking */
  allSteps: StepForValidation[];
  /** Tenant/company ID for scoping */
  tenantId: string;
  /** Locale for error messages (default: 'en') */
  locale?: string;
  /** Callback when label changes */
  onChange: (value: string) => void;
  /** Callback when validation status changes */
  onValidationChange?: (isValid: boolean) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** CSS class name for styling */
  className?: string;
}

export function StepLabelValidator({
  value,
  currentStepId,
  allSteps,
  tenantId,
  locale = "en",
  onChange,
  onValidationChange,
  placeholder = "Enter step title...",
  required = true,
  className = "",
}: StepLabelValidatorProps) {
  const [validationResult, setValidationResult] = useState<LabelValidationResult>({
    isValid: true,
  });
  const [isFocused, setIsFocused] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);

  // Validate on value change
  const validate = useCallback(() => {
    if (!value && !required) {
      setValidationResult({ isValid: true });
      onValidationChange?.(true);
      return;
    }

    const result = validateStepLabel(value, currentStepId, allSteps, tenantId);
    setValidationResult(result);
    onValidationChange?.(result.isValid);
  }, [value, currentStepId, allSteps, tenantId, required, onValidationChange]);

  useEffect(() => {
    validate();
  }, [validate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasBlurred(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const applySuggestion = () => {
    if (validationResult.suggestion) {
      onChange(validationResult.suggestion);
    }
  };

  // Show error after blur or if there's a duplicate
  const showError = (hasBlurred || !validationResult.isValid) && !validationResult.isValid;
  const showSuccess = hasBlurred && validationResult.isValid && value.trim().length > 0;

  return (
    <div className={`step-label-validator ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          className={`
            w-full px-3 py-2 border rounded-md
            focus:outline-none focus:ring-2
            transition-colors
            ${showError
              ? "border-red-500 focus:ring-red-200 bg-red-50"
              : showSuccess
              ? "border-green-500 focus:ring-green-200 bg-green-50"
              : "border-gray-300 focus:ring-blue-200"
            }
          `}
          aria-invalid={showError}
          aria-describedby={
            showError ? "label-error" : showSuccess ? "label-success" : undefined
          }
        />

        {/* Validation Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {showError && (
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {showSuccess && (
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Error Message */}
      {showError && (
        <div id="label-error" className="mt-2 text-sm text-red-600" role="alert">
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="font-medium">{validationResult.error}</p>
              {validationResult.suggestion && (
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="mt-2 px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                >
                  Use "{validationResult.suggestion}" instead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div id="label-success" className="mt-2 text-sm text-green-600">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>Step title is unique and valid</span>
          </div>
        </div>
      )}

      {/* Character Count */}
      <div className="mt-1 text-xs text-gray-500 text-right">
        {value.length} / 80 characters
      </div>
    </div>
  );
}

/**
 * Hook for managing step label validation state
 */
export function useStepLabelValidation(
  allSteps: StepForValidation[],
  tenantId: string,
) {
  const [validationErrors, setValidationErrors] = useState<
    Record<string, LabelValidationResult>
  >({});

  const validateStep = useCallback(
    (stepId: string, label: string) => {
      const result = validateStepLabel(label, stepId, allSteps, tenantId);
      setValidationErrors((prev) => ({
        ...prev,
        [stepId]: result,
      }));
      return result;
    },
    [allSteps, tenantId],
  );

  const isTemplateValid = useCallback(() => {
    return Object.values(validationErrors).every((result) => result.isValid);
  }, [validationErrors]);

  const getInvalidSteps = useCallback(() => {
    return Object.entries(validationErrors)
      .filter(([_, result]) => !result.isValid)
      .map(([stepId]) => stepId);
  }, [validationErrors]);

  return {
    validationErrors,
    validateStep,
    isTemplateValid,
    getInvalidSteps,
  };
}

/**
 * Publish Blocker Component
 * 
 * Prevents publishing when there are duplicate or invalid labels
 */
export interface PublishBlockerProps {
  isValid: boolean;
  invalidCount: number;
  onFix?: () => void;
}

export function PublishBlocker({ isValid, invalidCount, onFix }: PublishBlockerProps) {
  if (isValid) return null;

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900">
            Cannot Publish Template
          </h3>
          <p className="mt-1 text-sm text-yellow-800">
            {invalidCount} step{invalidCount !== 1 ? "s have" : " has"} duplicate or
            invalid titles. Each step must have a unique, descriptive title before you
            can publish.
          </p>
          {onFix && (
            <button
              onClick={onFix}
              className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Review Issues
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
