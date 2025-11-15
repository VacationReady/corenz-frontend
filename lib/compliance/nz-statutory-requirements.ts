/**
 * NZ Statutory Requirements for Employee Onboarding
 * 
 * Sources:
 * - Employment Relations Act 2000
 * - Holidays Act 2003
 * - Health and Safety at Work Act 2015
 * - Privacy Act 2020
 * - Immigration Act 2009
 * - Tax Administration Act 1994
 * 
 * Last Updated: November 2025
 */

export type ComplianceCategory = 
  | 'employment_agreement'
  | 'tax_compliance'
  | 'health_safety'
  | 'immigration'
  | 'privacy'
  | 'leave_entitlements'
  | 'kiwisaver';

export type ComplianceSeverity = 'mandatory' | 'recommended' | 'optional';

export type ComplianceDeadline = {
  type: 'immediate' | 'within_days' | 'before_start_date' | 'first_pay_period';
  days?: number;
  description: string;
};

export interface StatutoryRequirement {
  id: string;
  category: ComplianceCategory;
  severity: ComplianceSeverity;
  title: string;
  description: string;
  documentTypes?: string[];
  deadline: ComplianceDeadline;
  governmentResource: {
    title: string;
    url: string;
    organization: string;
  };
  relatedStepTypes: string[];
  warningMessage?: string;
  consequences?: string;
}

/**
 * Core NZ Statutory Requirements
 */
export const NZ_STATUTORY_REQUIREMENTS: StatutoryRequirement[] = [
  // Employment Agreement (Mandatory)
  {
    id: 'nz-employment-agreement',
    category: 'employment_agreement',
    severity: 'mandatory',
    title: 'Employment Agreement',
    description: 'Under the Employment Relations Act 2000, all employees must have a written employment agreement before starting work or as soon as possible afterwards.',
    documentTypes: ['Employment Agreement', 'Individual Employment Agreement', 'Collective Employment Agreement'],
    deadline: {
      type: 'before_start_date',
      description: 'Must be provided before the employee starts work, or as soon as possible after starting'
    },
    governmentResource: {
      title: 'Employment Agreements - Employment New Zealand',
      url: 'https://www.employment.govt.nz/starting-employment/employment-agreements/',
      organization: 'Ministry of Business, Innovation and Employment (MBIE)'
    },
    relatedStepTypes: ['acknowledge-document', 'upload-document'],
    warningMessage: 'Removing employment agreement acknowledgment may breach the Employment Relations Act 2000',
    consequences: 'Non-compliance can result in penalties of up to $20,000 for employers and potential personal grievance claims'
  },

  // Tax Compliance - IRD Number (Mandatory)
  {
    id: 'nz-ird-number',
    category: 'tax_compliance',
    severity: 'mandatory',
    title: 'IRD Number Collection',
    description: 'Employers must collect the employee\'s IRD number and tax code before the first payday to comply with PAYE obligations.',
    deadline: {
      type: 'first_pay_period',
      description: 'Must be collected before the employee\'s first pay is processed'
    },
    governmentResource: {
      title: 'Employing Staff - Inland Revenue',
      url: 'https://www.ird.govt.nz/employing-staff',
      organization: 'Inland Revenue Department (IRD)'
    },
    relatedStepTypes: ['payroll-setup', 'fill-form'],
    warningMessage: 'IRD number collection is mandatory for PAYE compliance',
    consequences: 'Failure to deduct correct PAYE can result in penalties and interest charges'
  },

  // Tax Compliance - Tax Code (Mandatory)
  {
    id: 'nz-tax-code',
    category: 'tax_compliance',
    severity: 'mandatory',
    title: 'Tax Code Declaration',
    description: 'Employee must provide their tax code (e.g., M, ME, SB) to ensure correct PAYE deductions.',
    deadline: {
      type: 'first_pay_period',
      description: 'Required before processing first pay'
    },
    governmentResource: {
      title: 'Tax Codes - Inland Revenue',
      url: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-codes-for-individuals',
      organization: 'Inland Revenue Department (IRD)'
    },
    relatedStepTypes: ['payroll-setup', 'fill-form'],
    warningMessage: 'Tax code declaration is required for PAYE compliance',
    consequences: 'Incorrect tax code may result in over or under-deduction of tax'
  },

  // KiwiSaver (Mandatory Information)
  {
    id: 'nz-kiwisaver-enrollment',
    category: 'kiwisaver',
    severity: 'mandatory',
    title: 'KiwiSaver Information and Enrollment',
    description: 'Employers must provide KiwiSaver information pack within 7 days of employment starting and automatically enroll eligible employees.',
    deadline: {
      type: 'within_days',
      days: 7,
      description: 'KiwiSaver information must be provided within 7 days of starting employment'
    },
    governmentResource: {
      title: 'KiwiSaver for Employers',
      url: 'https://www.kiwisaver.govt.nz/already-enrolled/employers/',
      organization: 'Inland Revenue Department (IRD)'
    },
    relatedStepTypes: ['payroll-setup', 'benefits-enrollment', 'acknowledge-document'],
    warningMessage: 'KiwiSaver information and enrollment process is legally required',
    consequences: 'Non-compliance can result in penalties and employee complaints to IRD'
  },

  // Health and Safety (Mandatory)
  {
    id: 'nz-health-safety-induction',
    category: 'health_safety',
    severity: 'mandatory',
    title: 'Health and Safety Induction',
    description: 'Under the Health and Safety at Work Act 2015, employers must provide adequate health and safety information, training, and supervision to workers.',
    deadline: {
      type: 'before_start_date',
      description: 'Health and safety induction must be provided before or on the first day of work'
    },
    governmentResource: {
      title: 'Worker Engagement and Participation - WorkSafe NZ',
      url: 'https://www.worksafe.govt.nz/managing-health-and-safety/businesses/worker-engagement-and-participation/',
      organization: 'WorkSafe New Zealand'
    },
    relatedStepTypes: ['compliance-training', 'training-assignment', 'instructions'],
    warningMessage: 'Health and safety training is mandatory under HSWA 2015',
    consequences: 'Non-compliance can result in enforcement action, improvement notices, or prosecution'
  },

  // Immigration Compliance (Mandatory for non-citizens)
  {
    id: 'nz-work-visa-verification',
    category: 'immigration',
    severity: 'mandatory',
    title: 'Work Visa Verification',
    description: 'Employers must verify that all non-citizen employees have the legal right to work in New Zealand before they start employment.',
    documentTypes: ['Work Visa', 'Residence Visa', 'Passport', 'Immigration Documents'],
    deadline: {
      type: 'before_start_date',
      description: 'Must be verified before the employee commences work'
    },
    governmentResource: {
      title: 'Employing Migrant Workers - Immigration NZ',
      url: 'https://www.immigration.govt.nz/employ-migrants',
      organization: 'Immigration New Zealand'
    },
    relatedStepTypes: ['upload-document', 'collect-document'],
    warningMessage: 'Work visa verification is required under the Immigration Act 2009',
    consequences: 'Employing someone without valid work rights can result in fines up to $100,000 and imprisonment'
  },

  // Privacy and Personal Information (Mandatory)
  {
    id: 'nz-privacy-notice',
    category: 'privacy',
    severity: 'mandatory',
    title: 'Privacy Notice',
    description: 'Under the Privacy Act 2020, employers must inform employees how their personal information will be collected, used, and stored.',
    deadline: {
      type: 'immediate',
      description: 'Must be provided at or before the time of collecting personal information'
    },
    governmentResource: {
      title: 'Privacy in Employment - Office of the Privacy Commissioner',
      url: 'https://www.privacy.org.nz/privacy-for-agencies/employment/',
      organization: 'Office of the Privacy Commissioner'
    },
    relatedStepTypes: ['acknowledge-document', 'instructions'],
    warningMessage: 'Privacy notice is required under the Privacy Act 2020',
    consequences: 'Non-compliance can result in Privacy Commissioner investigation and potential damages claims'
  },

  // Leave Entitlements (Mandatory Information)
  {
    id: 'nz-leave-entitlements',
    category: 'leave_entitlements',
    severity: 'mandatory',
    title: 'Annual Leave and Leave Entitlements',
    description: 'Employers must inform employees of their leave entitlements including annual leave (4 weeks minimum), sick leave, and public holidays under the Holidays Act 2003.',
    deadline: {
      type: 'within_days',
      days: 14,
      description: 'Leave entitlements should be communicated within the first two weeks of employment'
    },
    governmentResource: {
      title: 'Leave and Holidays - Employment NZ',
      url: 'https://www.employment.govt.nz/leave-and-holidays/',
      organization: 'Ministry of Business, Innovation and Employment (MBIE)'
    },
    relatedStepTypes: ['instructions', 'acknowledge-document'],
    warningMessage: 'Leave entitlements information is required under the Holidays Act 2003',
    consequences: 'Failure to provide correct leave entitlements can result in costly remediation and penalties'
  },

  // Health and Safety - Emergency Procedures (Recommended)
  {
    id: 'nz-emergency-procedures',
    category: 'health_safety',
    severity: 'recommended',
    title: 'Emergency Procedures and Evacuation',
    description: 'Best practice requires all employees to be familiar with emergency procedures, evacuation routes, and assembly points.',
    deadline: {
      type: 'within_days',
      days: 1,
      description: 'Should be covered on the first day of employment'
    },
    governmentResource: {
      title: 'Emergency Planning and Preparedness - WorkSafe NZ',
      url: 'https://www.worksafe.govt.nz/topic-and-industry/emergency-planning/',
      organization: 'WorkSafe New Zealand'
    },
    relatedStepTypes: ['instructions', 'compliance-training'],
    warningMessage: 'Emergency procedures training is strongly recommended for workplace safety'
  },

  // Bank Account Details (Recommended)
  {
    id: 'nz-bank-account',
    category: 'tax_compliance',
    severity: 'recommended',
    title: 'Bank Account for Wage Payment',
    description: 'Employee bank account details should be collected to facilitate direct credit wage payments.',
    deadline: {
      type: 'first_pay_period',
      description: 'Recommended before first pay period to enable electronic payment'
    },
    governmentResource: {
      title: 'Paying Wages - Employment NZ',
      url: 'https://www.employment.govt.nz/pay-and-wages/paying-wages/',
      organization: 'Ministry of Business, Innovation and Employment (MBIE)'
    },
    relatedStepTypes: ['payroll-setup', 'fill-form'],
    warningMessage: 'Bank account details are needed for wage payments'
  }
];

/**
 * Get statutory requirements by category
 */
export function getRequirementsByCategory(category: ComplianceCategory): StatutoryRequirement[] {
  return NZ_STATUTORY_REQUIREMENTS.filter(req => req.category === category);
}

/**
 * Get mandatory requirements only
 */
export function getMandatoryRequirements(): StatutoryRequirement[] {
  return NZ_STATUTORY_REQUIREMENTS.filter(req => req.severity === 'mandatory');
}

/**
 * Get requirements for a specific step type
 */
export function getRequirementsForStepType(stepType: string): StatutoryRequirement[] {
  return NZ_STATUTORY_REQUIREMENTS.filter(req => 
    req.relatedStepTypes.includes(stepType)
  );
}

/**
 * Check if a requirement is mandatory
 */
export function isMandatoryRequirement(requirementId: string): boolean {
  const requirement = NZ_STATUTORY_REQUIREMENTS.find(req => req.id === requirementId);
  return requirement?.severity === 'mandatory';
}

/**
 * Get warning message for removing a step
 */
export function getRemovalWarning(requirementId: string): string | undefined {
  const requirement = NZ_STATUTORY_REQUIREMENTS.find(req => req.id === requirementId);
  return requirement?.warningMessage;
}
