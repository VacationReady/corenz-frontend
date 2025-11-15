/**
 * Onboarding Step Label Validation
 * 
 * Enforces unique step labels per tenant template with real-time feedback.
 * Replaces auto-numbering logic with inline validation.
 */

export interface LabelValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export interface StepForValidation {
  id?: string;
  key?: string;
  title: string;
  label?: string;
}

/**
 * Validates that a step label is unique within a template
 * 
 * @param label - The label to validate
 * @param currentStepId - ID or key of the current step being edited
 * @param allSteps - All steps in the template
 * @param tenantId - Tenant/company ID for scoping
 * @returns Validation result with error message if invalid
 */
export function validateStepLabel(
  label: string,
  currentStepId: string | undefined,
  allSteps: StepForValidation[],
  tenantId: string
): LabelValidationResult {
  const trimmedLabel = label.trim();

  // Check if label is empty
  if (!trimmedLabel) {
    return {
      isValid: false,
      error: 'Step title cannot be empty',
    };
  }

  // Check minimum length
  if (trimmedLabel.length < 3) {
    return {
      isValid: false,
      error: 'Step title must be at least 3 characters',
    };
  }

  // Check maximum length
  if (trimmedLabel.length > 80) {
    return {
      isValid: false,
      error: 'Step title cannot exceed 80 characters',
    };
  }

  // Check for uniqueness - compare with other steps
  const duplicateStep = allSteps.find((step) => {
    const stepId = step.id || step.key;
    const stepLabel = (step.title || step.label || '').trim();
    
    // Skip the current step being edited
    if (stepId === currentStepId) {
      return false;
    }

    // Case-insensitive comparison
    return stepLabel.toLowerCase() === trimmedLabel.toLowerCase();
  });

  if (duplicateStep) {
    // Generate a suggestion by appending a number
    const baseName = trimmedLabel;
    let counter = 2;
    let suggestion = `${baseName} ${counter}`;

    // Find the next available number
    while (
      allSteps.some((s) => {
        const sId = s.id || s.key;
        const sLabel = (s.title || s.label || '').trim();
        return sId !== currentStepId && sLabel.toLowerCase() === suggestion.toLowerCase();
      })
    ) {
      counter++;
      suggestion = `${baseName} ${counter}`;
    }

    return {
      isValid: false,
      error: 'This step title is already in use. Each step must have a unique title.',
      suggestion,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Generate a unique label for a new step based on its type
 * 
 * @param stepType - The type of step
 * @param existingSteps - All existing steps in the template
 * @returns A unique label
 */
export function generateUniqueLabel(
  stepType: string,
  existingSteps: StepForValidation[]
): string {
  const typeLabels: Record<string, string> = {
    'acknowledge-document': 'Acknowledge Document',
    'upload-document': 'Upload Document',
    'fill-form': 'Complete Form',
    'instruction': 'Instructions',
    'training': 'Training',
    'task': 'Task',
  };

  const baseLabel = typeLabels[stepType] || 'Step';
  let counter = 1;
  let label = baseLabel;

  // Find the next available number
  while (
    existingSteps.some((s) => {
      const sLabel = (s.title || s.label || '').trim();
      return sLabel.toLowerCase() === label.toLowerCase();
    })
  ) {
    counter++;
    label = `${baseLabel} ${counter}`;
  }

  return label;
}

/**
 * Localization messages for label validation
 */
export const labelValidationMessages = {
  en: {
    empty: 'Step title cannot be empty',
    tooShort: 'Step title must be at least 3 characters',
    tooLong: 'Step title cannot exceed 80 characters',
    duplicate: 'This step title is already in use. Each step must have a unique title.',
    suggestion: 'Try "{suggestion}" instead',
  },
  mi: {
    // Te Reo Māori
    empty: 'Kāore e taea te waiho kau te ingoa o te mahi',
    tooShort: 'Me 3 ngā pū iti rawa o te ingoa',
    tooLong: 'Kāore e taea te nui ake i te 80 ngā pū o te ingoa',
    duplicate: 'Kei te whakamahia kētia tēnei ingoa. Me ahurei ia mahi.',
    suggestion: 'Whakamātauhia "{suggestion}"',
  },
};

/**
 * Get localized validation message
 * 
 * @param key - Message key
 * @param locale - Locale code (default: 'en')
 * @param replacements - Values to replace in the message
 * @returns Localized message
 */
export function getValidationMessage(
  key: keyof typeof labelValidationMessages.en,
  locale: string = 'en',
  replacements?: Record<string, string>
): string {
  const messages = labelValidationMessages[locale as keyof typeof labelValidationMessages] || labelValidationMessages.en;
  let message = messages[key];

  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
  }

  return message;
}
