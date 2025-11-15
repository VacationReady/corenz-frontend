/**
 * Compliance Validation System
 * 
 * Validates onboarding templates against NZ statutory requirements
 * Surfaces warnings when mandatory steps are removed or modified
 */

import { NZ_STATUTORY_REQUIREMENTS, type StatutoryRequirement, isMandatoryRequirement, getRemovalWarning } from './nz-statutory-requirements';
import { getPresetById, isComplianceStep, type CompliancePresetStep } from './nz-compliance-presets';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationResult = {
  isValid: boolean;
  severity: ValidationSeverity;
  code: string;
  message: string;
  field?: string;
  requirementId?: string;
  remedy?: string;
};

export type ComplianceValidationReport = {
  isCompliant: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
  missingRequirements: StatutoryRequirement[];
  satisfiedRequirements: StatutoryRequirement[];
};

export type TemplateStep = {
  id: string;
  stepType: string;
  title: string;
  isMandatory?: boolean;
  metadata?: Record<string, any>;
  complianceRequirements?: string[];
};

/**
 * Validate a template against NZ compliance requirements
 */
export function validateTemplate(
  steps: TemplateStep[],
  options: {
    region?: string;
    industry?: string;
    strictMode?: boolean;
  } = {}
): ComplianceValidationReport {
  const { region = 'NZ', industry, strictMode = false } = options;

  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];
  const info: ValidationResult[] = [];

  // Get mandatory requirements
  const mandatoryRequirements = NZ_STATUTORY_REQUIREMENTS.filter(
    req => req.severity === 'mandatory'
  );

  // Track which requirements are satisfied
  const satisfiedRequirementIds = new Set<string>();

  // Check each step for compliance requirements
  steps.forEach(step => {
    if (step.complianceRequirements) {
      step.complianceRequirements.forEach(reqId => {
        satisfiedRequirementIds.add(reqId);
      });
    }

    // Validate step metadata based on step type
    const stepValidation = validateStepMetadata(step);
    errors.push(...stepValidation.errors);
    warnings.push(...stepValidation.warnings);
    info.push(...stepValidation.info);
  });

  // Find missing mandatory requirements
  const missingRequirements = mandatoryRequirements.filter(
    req => !satisfiedRequirementIds.has(req.id)
  );

  // Add errors for missing mandatory requirements
  missingRequirements.forEach(req => {
    errors.push({
      isValid: false,
      severity: 'error',
      code: 'MISSING_MANDATORY_REQUIREMENT',
      message: `Missing mandatory requirement: ${req.title}`,
      requirementId: req.id,
      remedy: `Add a ${req.relatedStepTypes.join(' or ')} step to satisfy this requirement. ${req.description}`
    });
  });

  // Get satisfied requirements
  const satisfiedRequirements = NZ_STATUTORY_REQUIREMENTS.filter(req =>
    satisfiedRequirementIds.has(req.id)
  );

  // Check for recommended requirements in strict mode
  if (strictMode) {
    const recommendedRequirements = NZ_STATUTORY_REQUIREMENTS.filter(
      req => req.severity === 'recommended' && !satisfiedRequirementIds.has(req.id)
    );

    recommendedRequirements.forEach(req => {
      warnings.push({
        isValid: true,
        severity: 'warning',
        code: 'MISSING_RECOMMENDED_REQUIREMENT',
        message: `Recommended requirement not included: ${req.title}`,
        requirementId: req.id,
        remedy: req.description
      });
    });
  }

  return {
    isCompliant: errors.length === 0,
    errors,
    warnings,
    info,
    missingRequirements,
    satisfiedRequirements
  };
}

/**
 * Validate step metadata for compliance
 */
function validateStepMetadata(step: TemplateStep): {
  errors: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
} {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];
  const info: ValidationResult[] = [];

  // Validate payroll-setup steps
  if (step.stepType === 'payroll-setup' && step.metadata) {
    const fields = step.metadata.fields as any[] || [];
    
    // Check for IRD number field
    const hasIrdField = fields.some(f => f.fieldType === 'irdNumber' || f.id === 'ird-number');
    if (!hasIrdField) {
      errors.push({
        isValid: false,
        severity: 'error',
        code: 'MISSING_IRD_FIELD',
        message: 'Payroll setup must include IRD number field',
        field: 'metadata.fields',
        remedy: 'Add an IRD number field to comply with PAYE requirements'
      });
    }

    // Check for tax code field
    const hasTaxCodeField = fields.some(f => f.id === 'tax-code' || f.label?.toLowerCase().includes('tax code'));
    if (!hasTaxCodeField) {
      errors.push({
        isValid: false,
        severity: 'error',
        code: 'MISSING_TAX_CODE_FIELD',
        message: 'Payroll setup must include tax code field',
        field: 'metadata.fields',
        remedy: 'Add a tax code field to comply with PAYE requirements'
      });
    }

    // Warn if bank account is missing
    const hasBankField = fields.some(f => f.id?.includes('bank') || f.label?.toLowerCase().includes('bank'));
    if (!hasBankField) {
      warnings.push({
        isValid: true,
        severity: 'warning',
        code: 'MISSING_BANK_FIELD',
        message: 'Payroll setup should include bank account field',
        field: 'metadata.fields',
        remedy: 'Add a bank account field for wage payments'
      });
    }
  }

  // Validate health-safety steps
  if (step.stepType === 'compliance-training' && step.complianceRequirements?.includes('nz-health-safety-induction')) {
    const courses = step.metadata?.courses as any[] || [];
    if (courses.length === 0) {
      warnings.push({
        isValid: true,
        severity: 'warning',
        code: 'EMPTY_COMPLIANCE_TRAINING',
        message: 'Health and safety training has no courses defined',
        field: 'metadata.courses',
        remedy: 'Add health and safety training courses'
      });
    }
  }

  // Validate document upload steps
  if (step.stepType === 'upload-document' && step.complianceRequirements) {
    const allowedFileTypes = step.metadata?.allowedFileTypes as string[] || [];
    if (!allowedFileTypes.includes('.pdf')) {
      info.push({
        isValid: true,
        severity: 'info',
        code: 'PDF_FORMAT_RECOMMENDED',
        message: 'Consider allowing PDF format for document uploads',
        field: 'metadata.allowedFileTypes',
        remedy: 'PDF is a common format for official documents'
      });
    }
  }

  return { errors, warnings, info };
}

/**
 * Validate step removal
 * Returns validation results if removing a step would violate compliance
 */
export function validateStepRemoval(
  step: TemplateStep,
  remainingSteps: TemplateStep[]
): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (!step.complianceRequirements || step.complianceRequirements.length === 0) {
    return results;
  }

  // Check if any compliance requirements would become unsatisfied
  step.complianceRequirements.forEach(reqId => {
    const requirement = NZ_STATUTORY_REQUIREMENTS.find(r => r.id === reqId);
    if (!requirement) return;

    // Check if other steps satisfy this requirement
    const isSatisfiedByOtherSteps = remainingSteps.some(s =>
      s.complianceRequirements?.includes(reqId)
    );

    if (!isSatisfiedByOtherSteps) {
      if (requirement.severity === 'mandatory') {
        results.push({
          isValid: false,
          severity: 'error',
          code: 'REMOVING_MANDATORY_REQUIREMENT',
          message: requirement.warningMessage || `Removing this step would violate mandatory requirement: ${requirement.title}`,
          requirementId: reqId,
          remedy: `This step is required by ${requirement.governmentResource.organization}. ${requirement.consequences || ''}`
        });
      } else if (requirement.severity === 'recommended') {
        results.push({
          isValid: true,
          severity: 'warning',
          code: 'REMOVING_RECOMMENDED_REQUIREMENT',
          message: `Removing this step eliminates recommended compliance: ${requirement.title}`,
          requirementId: reqId,
          remedy: requirement.description
        });
      }
    }
  });

  return results;
}

/**
 * Validate step modification
 * Returns validation results if modifying a step would affect compliance
 */
export function validateStepModification(
  originalStep: TemplateStep,
  modifiedStep: TemplateStep
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check if compliance requirements were removed
  const originalReqs = new Set(originalStep.complianceRequirements || []);
  const modifiedReqs = new Set(modifiedStep.complianceRequirements || []);

  originalReqs.forEach(reqId => {
    if (!modifiedReqs.has(reqId)) {
      const requirement = NZ_STATUTORY_REQUIREMENTS.find(r => r.id === reqId);
      if (requirement && requirement.severity === 'mandatory') {
        results.push({
          isValid: false,
          severity: 'error',
          code: 'REMOVED_COMPLIANCE_REQUIREMENT',
          message: `Removed mandatory compliance requirement: ${requirement.title}`,
          requirementId: reqId,
          remedy: 'Restore the compliance requirement or ensure it is satisfied by another step'
        });
      }
    }
  });

  // Check if mandatory flag was changed
  if (originalStep.isMandatory && !modifiedStep.isMandatory) {
    const hasManatoryReq = originalStep.complianceRequirements?.some(isMandatoryRequirement);
    if (hasManatoryReq) {
      results.push({
        isValid: false,
        severity: 'warning',
        code: 'MADE_COMPLIANCE_STEP_OPTIONAL',
        message: 'Changed a compliance step from mandatory to optional',
        remedy: 'Compliance steps should remain mandatory to ensure legal requirements are met'
      });
    }
  }

  // Validate metadata changes
  const metadataValidation = validateStepMetadata(modifiedStep);
  results.push(...metadataValidation.errors);

  return results;
}

/**
 * Get compliance score for a template
 * Returns a percentage representing compliance coverage
 */
export function getComplianceScore(steps: TemplateStep[]): {
  score: number;
  mandatoryCompliance: number;
  recommendedCompliance: number;
  totalRequirements: number;
  satisfiedRequirements: number;
} {
  const validation = validateTemplate(steps, { strictMode: true });

  const mandatoryRequirements = NZ_STATUTORY_REQUIREMENTS.filter(r => r.severity === 'mandatory');
  const recommendedRequirements = NZ_STATUTORY_REQUIREMENTS.filter(r => r.severity === 'recommended');

  const satisfiedMandatory = validation.satisfiedRequirements.filter(r => r.severity === 'mandatory').length;
  const satisfiedRecommended = validation.satisfiedRequirements.filter(r => r.severity === 'recommended').length;

  const mandatoryCompliance = mandatoryRequirements.length > 0
    ? (satisfiedMandatory / mandatoryRequirements.length) * 100
    : 100;

  const recommendedCompliance = recommendedRequirements.length > 0
    ? (satisfiedRecommended / recommendedRequirements.length) * 100
    : 100;

  // Weight mandatory compliance more heavily
  const score = (mandatoryCompliance * 0.8) + (recommendedCompliance * 0.2);

  return {
    score: Math.round(score),
    mandatoryCompliance: Math.round(mandatoryCompliance),
    recommendedCompliance: Math.round(recommendedCompliance),
    totalRequirements: mandatoryRequirements.length + recommendedRequirements.length,
    satisfiedRequirements: validation.satisfiedRequirements.length
  };
}

/**
 * Generate compliance report for template
 */
export function generateComplianceReport(
  templateName: string,
  steps: TemplateStep[],
  options: { includeRecommendations?: boolean } = {}
): string {
  const validation = validateTemplate(steps, { strictMode: options.includeRecommendations });
  const score = getComplianceScore(steps);

  let report = `# NZ Compliance Report: ${templateName}\n\n`;
  report += `## Compliance Score: ${score.score}%\n\n`;
  report += `- Mandatory Requirements: ${score.mandatoryCompliance}%\n`;
  report += `- Recommended Requirements: ${score.recommendedCompliance}%\n`;
  report += `- Total Requirements Satisfied: ${score.satisfiedRequirements}/${score.totalRequirements}\n\n`;

  if (validation.errors.length > 0) {
    report += `## ⚠️ Compliance Errors (${validation.errors.length})\n\n`;
    validation.errors.forEach(error => {
      report += `- **${error.code}**: ${error.message}\n`;
      if (error.remedy) {
        report += `  - Remedy: ${error.remedy}\n`;
      }
    });
    report += '\n';
  }

  if (validation.warnings.length > 0 && options.includeRecommendations) {
    report += `## ⚡ Warnings (${validation.warnings.length})\n\n`;
    validation.warnings.forEach(warning => {
      report += `- **${warning.code}**: ${warning.message}\n`;
      if (warning.remedy) {
        report += `  - Recommendation: ${warning.remedy}\n`;
      }
    });
    report += '\n';
  }

  report += `## ✅ Satisfied Requirements (${validation.satisfiedRequirements.length})\n\n`;
  validation.satisfiedRequirements.forEach(req => {
    report += `- ${req.title} (${req.category})\n`;
  });
  report += '\n';

  if (validation.missingRequirements.length > 0) {
    report += `## ❌ Missing Requirements (${validation.missingRequirements.length})\n\n`;
    validation.missingRequirements.forEach(req => {
      report += `- **${req.title}**\n`;
      report += `  - Category: ${req.category}\n`;
      report += `  - ${req.description}\n`;
      report += `  - Resource: [${req.governmentResource.title}](${req.governmentResource.url})\n`;
    });
  }

  return report;
}
