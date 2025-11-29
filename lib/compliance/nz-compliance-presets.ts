/**
 * NZ Compliance Presets for Onboarding Templates
 * 
 * Provides pre-configured onboarding steps that meet NZ statutory requirements
 */

import type { StatutoryRequirement } from './nz-statutory-requirements';
import { NZ_STATUTORY_REQUIREMENTS } from './nz-statutory-requirements';

export type CompliancePresetStep = {
  stepType: string;
  title: string;
  description: string;
  order: number;
  isMandatory: boolean;
  daysOffset?: number;
  assigneeRole: 'employee' | 'manager' | 'hr' | 'admin';
  metadata: Record<string, any>;
  complianceRequirements: string[]; // IDs from StatutoryRequirement
  contextualTip?: string;
};

export type CompliancePreset = {
  id: string;
  name: string;
  description: string;
  category: string;
  region: 'NZ';
  industry?: string;
  steps: CompliancePresetStep[];
  estimatedCompletionDays: number;
};

/**
 * Core NZ Employment Compliance Preset
 * Covers minimum legal requirements for all NZ employers
 */
export const NZ_CORE_EMPLOYMENT_PRESET: CompliancePreset = {
  id: 'nz-core-employment-2025',
  name: 'NZ Core Employment Compliance',
  description: 'Essential onboarding steps required by NZ employment law for all new employees',
  category: 'compliance',
  region: 'NZ',
  steps: [
    {
      stepType: 'acknowledge-document',
      title: 'Sign Employment Agreement',
      description: 'Review and acknowledge your employment agreement as required by the Employment Relations Act 2000',
      order: 1,
      isMandatory: true,
      daysOffset: -1, // Before start date
      assigneeRole: 'employee',
      metadata: {
        acknowledgementText: 'I have read, understood, and agree to the terms of my employment agreement',
      },
      complianceRequirements: ['nz-employment-agreement'],
      contextualTip: 'Your employment agreement sets out your rights and responsibilities. Under NZ law, you must receive this before or as soon as possible after starting work.'
    },

    {
      stepType: 'acknowledge-document',
      title: 'Privacy Notice Acknowledgment',
      description: 'Review how your personal information will be collected, used, and stored under the Privacy Act 2020',
      order: 2,
      isMandatory: true,
      daysOffset: 0,
      assigneeRole: 'employee',
      metadata: {
        acknowledgementText: 'I acknowledge that I have read and understood the privacy notice',
      },
      complianceRequirements: ['nz-privacy-notice'],
      contextualTip: 'NZ privacy law requires us to inform you about how we handle your personal information.'
    },

    {
      stepType: 'payroll-setup',
      title: 'Tax and Payroll Information',
      description: 'Provide your IRD number, tax code, and bank account for payroll setup',
      order: 3,
      isMandatory: true,
      daysOffset: 0,
      assigneeRole: 'employee',
      metadata: {
        instructions: 'Please provide your tax and banking details to ensure timely payment of your wages.',
        fields: [
          {
            id: 'ird-number',
            label: 'IRD Number',
            fieldType: 'irdNumber',
            required: true,
            placeholder: '123-456-785'
          },
          {
            id: 'tax-code',
            label: 'Tax Code',
            fieldType: 'select',
            required: true,
            options: ['M', 'ME', 'SB', 'S', 'SH', 'ST', 'CAE', 'EDW', 'NSW', 'STC']
          },
          {
            id: 'bank-account',
            label: 'Bank Account Number',
            fieldType: 'text',
            required: true,
            placeholder: '00-0000-0000000-00'
          }
        ]
      },
      complianceRequirements: ['nz-ird-number', 'nz-tax-code', 'nz-bank-account'],
      contextualTip: 'We need your IRD number and tax code before your first pay to comply with PAYE requirements. Visit ird.govt.nz if you need help with your tax code.'
    },

    {
      stepType: 'benefits-enrollment',
      title: 'KiwiSaver Information and Enrollment',
      description: 'Review KiwiSaver information and confirm your enrollment status',
      order: 4,
      isMandatory: true,
      daysOffset: 7,
      assigneeRole: 'employee',
      metadata: {
        links: [
          {
            id: 'kiwisaver-info',
            label: 'KiwiSaver Information Pack',
            url: 'https://www.kiwisaver.govt.nz/',
            required: true
          },
          {
            id: 'kiwisaver-rates',
            label: 'Contribution Rates',
            url: 'https://www.kiwisaver.govt.nz/already-enrolled/contributions/contribution-rates/',
            required: true
          }
        ]
      },
      complianceRequirements: ['nz-kiwisaver-enrollment'],
      contextualTip: 'NZ law requires us to provide KiwiSaver information within 7 days. You\'ll be automatically enrolled unless you opt out within 2-8 weeks.'
    },

    {
      stepType: 'compliance-training',
      title: 'Health and Safety Induction',
      description: 'Complete mandatory health and safety training as required by the Health and Safety at Work Act 2015',
      order: 5,
      isMandatory: true,
      daysOffset: 0,
      assigneeRole: 'employee',
      metadata: {
        courses: [
          {
            id: 'hs-general',
            label: 'General Health and Safety Induction',
            required: true,
            url: ''
          },
          {
            id: 'hs-emergency',
            label: 'Emergency Procedures and Evacuation',
            required: true,
            url: ''
          }
        ]
      },
      complianceRequirements: ['nz-health-safety-induction', 'nz-emergency-procedures'],
      contextualTip: 'Workplace safety is paramount. This training covers your health and safety rights and responsibilities under NZ law.'
    },

    {
      stepType: 'instructions',
      title: 'Leave Entitlements Information',
      description: 'Review your annual leave, sick leave, and public holiday entitlements under the Holidays Act 2003',
      order: 6,
      isMandatory: true,
      daysOffset: 7,
      assigneeRole: 'employee',
      metadata: {
        buttonLabel: 'I understand my leave entitlements'
      },
      complianceRequirements: ['nz-leave-entitlements'],
      contextualTip: 'You\'re entitled to a minimum of 4 weeks annual leave and 10 days sick leave per year. Learn more at employment.govt.nz'
    },

    {
      stepType: 'upload-document',
      title: 'Work Visa Verification (If Applicable)',
      description: 'Upload your work visa or residence documentation if you are not a NZ citizen',
      order: 7,
      isMandatory: false, // Conditional - only for non-citizens
      daysOffset: -1,
      assigneeRole: 'employee',
      metadata: {
        instructions: 'If you are not a New Zealand citizen or permanent resident, please upload proof of your right to work in NZ',
        category: 'Immigration',
        allowedFileTypes: ['.pdf', '.jpg', '.png']
      },
      complianceRequirements: ['nz-work-visa-verification'],
      contextualTip: 'Only required if you\'re not a NZ citizen or permanent resident. We must verify your right to work before you start.'
    }
  ],
  estimatedCompletionDays: 7
};

/**
 * Extended NZ Onboarding Preset with Best Practices
 * Includes compliance requirements plus recommended best practices
 */
export const NZ_COMPREHENSIVE_ONBOARDING_PRESET: CompliancePreset = {
  id: 'nz-comprehensive-onboarding-2025',
  name: 'NZ Comprehensive Onboarding',
  description: 'Complete onboarding experience combining legal compliance with employee engagement best practices',
  category: 'comprehensive',
  region: 'NZ',
  steps: [
    ...NZ_CORE_EMPLOYMENT_PRESET.steps,
    {
      stepType: 'instructions',
      title: 'Welcome to the Team',
      description: 'Welcome message and company overview',
      order: 0.5,
      isMandatory: false,
      daysOffset: 0,
      assigneeRole: 'employee',
      metadata: {
        buttonLabel: 'Get Started'
      },
      complianceRequirements: [],
      contextualTip: 'Welcome! We\'re excited to have you join our team.'
    },

    {
      stepType: 'buddy-introduction',
      title: 'Meet Your Buddy',
      description: 'Connect with your assigned workplace buddy',
      order: 8,
      isMandatory: false,
      daysOffset: 0,
      assigneeRole: 'manager',
      metadata: {
        notes: 'Introduce the new employee to their buddy and explain the buddy\'s role in supporting them during their first few weeks'
      },
      complianceRequirements: [],
      contextualTip: 'Your buddy is here to help you settle in and answer any questions you might have.'
    },

    {
      stepType: 'system-access',
      title: 'IT Systems Setup',
      description: 'Set up access to required systems and tools',
      order: 9,
      isMandatory: false,
      daysOffset: 0,
      assigneeRole: 'admin',
      metadata: {
        instructions: 'Provision the following system access for the new employee',
        systems: [
          {
            id: 'email',
            label: 'Email Account',
            required: true,
            notes: ''
          },
          {
            id: 'intranet',
            label: 'Company Intranet',
            required: true,
            notes: ''
          }
        ]
      },
      complianceRequirements: [],
      contextualTip: 'IT will set up your accounts and systems access.'
    },

    {
      stepType: 'equipment-checklist',
      title: 'Equipment Handover',
      description: 'Receive and confirm receipt of required equipment',
      order: 10,
      isMandatory: false,
      daysOffset: 0,
      assigneeRole: 'manager',
      metadata: {
        items: [
          {
            id: 'laptop',
            label: 'Laptop',
            required: true,
            notes: ''
          },
          {
            id: 'phone',
            label: 'Mobile Phone (if applicable)',
            required: false,
            notes: ''
          }
        ]
      },
      complianceRequirements: [],
      contextualTip: 'Check that all your equipment is working properly.'
    },

    {
      stepType: 'manager-checkin',
      title: 'Week 1 Check-in',
      description: 'First week check-in with your manager',
      order: 11,
      isMandatory: false,
      daysOffset: 7,
      assigneeRole: 'manager',
      metadata: {
        template: 'Topics to cover:\n- How is your first week going?\n- Do you have everything you need?\n- Any questions about your role?\n- Review immediate priorities',
        timeline: [
          {
            id: 'week1',
            label: 'Week 1 Check-in',
            scheduledAt: 'Day 7'
          }
        ]
      },
      complianceRequirements: [],
      contextualTip: 'Regular check-ins help ensure you\'re settling in well.'
    },

    {
      stepType: 'probation-goals',
      title: 'Probation Period Goals',
      description: 'Review your goals and expectations for the probation period',
      order: 12,
      isMandatory: false,
      daysOffset: 14,
      assigneeRole: 'manager',
      metadata: {
        milestones: [
          {
            id: 'goal1',
            label: 'Complete all onboarding training',
            notes: '',
            required: true
          },
          {
            id: 'goal2',
            label: 'Understand core responsibilities',
            notes: '',
            required: true
          }
        ]
      },
      complianceRequirements: [],
      contextualTip: 'Clear goals help you succeed during your probation period.'
    },

    {
      stepType: 'welcome-survey',
      title: '30-Day Onboarding Survey',
      description: 'Share your feedback about the onboarding experience',
      order: 13,
      isMandatory: false,
      daysOffset: 30,
      assigneeRole: 'employee',
      metadata: {
        questionSet: 'onboarding-30day',
        instructions: 'Your feedback helps us improve the onboarding experience for future employees'
      },
      complianceRequirements: [],
      contextualTip: 'We value your feedback and want to continuously improve.'
    }
  ],
  estimatedCompletionDays: 30
};

/**
 * Industry-specific presets
 */
export const NZ_HEALTHCARE_PRESET: CompliancePreset = {
  id: 'nz-healthcare-onboarding-2025',
  name: 'NZ Healthcare Onboarding',
  description: 'Onboarding for healthcare workers with additional compliance requirements',
  category: 'industry-specific',
  region: 'NZ',
  industry: 'healthcare',
  steps: [
    ...NZ_CORE_EMPLOYMENT_PRESET.steps,
    {
      stepType: 'upload-document',
      title: 'Police Vetting Clearance',
      description: 'Upload your police vetting certificate',
      order: 7.5,
      isMandatory: true,
      daysOffset: -1,
      assigneeRole: 'employee',
      metadata: {
        instructions: 'Healthcare workers require police vetting clearance before starting work',
        category: 'Compliance',
        allowedFileTypes: ['.pdf']
      },
      complianceRequirements: [],
      contextualTip: 'Police vetting is a standard requirement for healthcare roles in NZ.'
    },
    {
      stepType: 'upload-document',
      title: 'Professional Registration',
      description: 'Upload proof of current professional registration (if applicable)',
      order: 7.6,
      isMandatory: true,
      daysOffset: -1,
      assigneeRole: 'employee',
      metadata: {
        instructions: 'Provide evidence of current registration with your professional body (e.g., Nursing Council, Medical Council)',
        category: 'Professional',
        allowedFileTypes: ['.pdf', '.jpg', '.png']
      },
      complianceRequirements: [],
      contextualTip: 'You must maintain current professional registration to practice in NZ.'
    },
    {
      stepType: 'compliance-training',
      title: 'Healthcare-Specific Compliance Training',
      description: 'Complete mandatory healthcare compliance training',
      order: 8,
      isMandatory: true,
      daysOffset: 0,
      assigneeRole: 'employee',
      metadata: {
        courses: [
          {
            id: 'infection-control',
            label: 'Infection Prevention and Control',
            required: true
          },
          {
            id: 'patient-privacy',
            label: 'Patient Privacy and Confidentiality',
            required: true
          },
          {
            id: 'medication-safety',
            label: 'Medication Safety',
            required: true
          }
        ]
      },
      complianceRequirements: [],
      contextualTip: 'Healthcare compliance training is essential for patient safety.'
    }
  ],
  estimatedCompletionDays: 7
};

/**
 * All available presets
 */
export const NZ_COMPLIANCE_PRESETS: CompliancePreset[] = [
  NZ_CORE_EMPLOYMENT_PRESET,
  NZ_COMPREHENSIVE_ONBOARDING_PRESET,
  NZ_HEALTHCARE_PRESET
];

/**
 * Get preset by ID
 */
export function getPresetById(presetId: string): CompliancePreset | undefined {
  return NZ_COMPLIANCE_PRESETS.find(preset => preset.id === presetId);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): CompliancePreset[] {
  return NZ_COMPLIANCE_PRESETS.filter(preset => preset.category === category);
}

/**
 * Get industry-specific presets
 */
export function getIndustryPresets(industry: string): CompliancePreset[] {
  return NZ_COMPLIANCE_PRESETS.filter(preset => preset.industry === industry);
}

/**
 * Get compliance requirements for a preset
 */
export function getPresetComplianceRequirements(presetId: string): StatutoryRequirement[] {
  const preset = getPresetById(presetId);
  if (!preset) return [];

  const requirementIds = new Set<string>();
  preset.steps.forEach(step => {
    step.complianceRequirements.forEach(id => requirementIds.add(id));
  });

  return Array.from(requirementIds)
    .map(id => NZ_STATUTORY_REQUIREMENTS.find(req => req.id === id))
    .filter((req): req is StatutoryRequirement => req !== undefined);
}

/**
 * Check if a step in a preset is mandatory for compliance
 */
export function isComplianceStep(step: CompliancePresetStep): boolean {
  return step.isMandatory && step.complianceRequirements.length > 0;
}

/**
 * Get contextual help for a step
 */
export function getStepContextualHelp(step: CompliancePresetStep): {
  tip: string;
  resources: Array<{ title: string; url: string; organization: string }>;
} {
  const resources = step.complianceRequirements
    .map(id => NZ_STATUTORY_REQUIREMENTS.find(req => req.id === id))
    .filter((req): req is StatutoryRequirement => req !== undefined)
    .map(req => req.governmentResource);

  return {
    tip: step.contextualTip || '',
    resources
  };
}
