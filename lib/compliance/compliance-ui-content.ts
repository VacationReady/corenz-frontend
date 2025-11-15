/**
 * UX Copy and Contextual Tips for NZ Compliance
 * 
 * Provides localized, contextual guidance for compliance requirements
 * Links to official NZ government resources
 */

import type { StatutoryRequirement } from './nz-statutory-requirements';
import { NZ_STATUTORY_REQUIREMENTS } from './nz-statutory-requirements';

export type LocalizedContent = {
  en_NZ: string;
  mi_NZ?: string; // Te Reo Māori
};

export type ContextualTip = {
  requirementId: string;
  stepType: string;
  title: LocalizedContent;
  description: LocalizedContent;
  tips: LocalizedContent[];
  resources: Array<{
    title: string;
    url: string;
    organization: string;
    icon?: string;
  }>;
  warningMessage?: LocalizedContent;
  helpText?: LocalizedContent;
};

/**
 * Contextual tips for each compliance requirement
 */
export const COMPLIANCE_CONTEXTUAL_TIPS: Record<string, ContextualTip> = {
  'nz-employment-agreement': {
    requirementId: 'nz-employment-agreement',
    stepType: 'acknowledge-document',
    title: {
      en_NZ: 'Employment Agreement Required'
    },
    description: {
      en_NZ: 'Your employment agreement is a legal contract that sets out your rights and responsibilities at work.'
    },
    tips: [
      {
        en_NZ: 'Read your agreement carefully before signing - it\'s a legally binding document'
      },
      {
        en_NZ: 'You must receive your agreement before you start work, or as soon as possible after starting'
      },
      {
        en_NZ: 'Keep a copy of your signed agreement for your records'
      },
      {
        en_NZ: 'If anything is unclear, ask your employer for clarification before signing'
      }
    ],
    resources: [
      {
        title: 'Employment Agreements Guide',
        url: 'https://www.employment.govt.nz/starting-employment/employment-agreements/',
        organization: 'Employment New Zealand',
        icon: 'FileText'
      },
      {
        title: 'Your Rights at Work',
        url: 'https://www.employment.govt.nz/starting-employment/rights-and-responsibilities/',
        organization: 'Employment New Zealand',
        icon: 'Shield'
      }
    ],
    warningMessage: {
      en_NZ: 'Employment agreements are mandatory under NZ law. Removing this step may breach the Employment Relations Act 2000.'
    },
    helpText: {
      en_NZ: 'Need help? Contact Employment New Zealand on 0800 20 90 20 for free advice about employment agreements.'
    }
  },

  'nz-ird-number': {
    requirementId: 'nz-ird-number',
    stepType: 'payroll-setup',
    title: {
      en_NZ: 'IRD Number Required for Tax'
    },
    description: {
      en_NZ: 'Your IRD (Inland Revenue Department) number is required so your employer can deduct the correct tax from your wages.'
    },
    tips: [
      {
        en_NZ: 'Your IRD number is 8 or 9 digits and may include dashes (e.g., 123-456-789)'
      },
      {
        en_NZ: 'Don\'t have an IRD number? You can apply online at ird.govt.nz - it takes about 10 days'
      },
      {
        en_NZ: 'Keep your IRD number secure - it\'s like your tax identity'
      },
      {
        en_NZ: 'You use the same IRD number for your entire life - it never changes'
      }
    ],
    resources: [
      {
        title: 'Apply for an IRD Number',
        url: 'https://www.ird.govt.nz/managing-my-tax/ird-numbers/get-an-ird-number',
        organization: 'Inland Revenue',
        icon: 'Hash'
      },
      {
        title: 'Find Your IRD Number',
        url: 'https://www.ird.govt.nz/managing-my-tax/ird-numbers/finding-my-ird-number',
        organization: 'Inland Revenue',
        icon: 'Search'
      }
    ],
    helpText: {
      en_NZ: 'Contact IRD on 0800 227 774 if you need help with your IRD number.'
    }
  },

  'nz-tax-code': {
    requirementId: 'nz-tax-code',
    stepType: 'payroll-setup',
    title: {
      en_NZ: 'Choose Your Tax Code'
    },
    description: {
      en_NZ: 'Your tax code tells your employer how much tax to deduct from your pay. Choosing the right code ensures you don\'t pay too much or too little tax.'
    },
    tips: [
      {
        en_NZ: 'Use code M if this is your main source of income and you have no student loan'
      },
      {
        en_NZ: 'Use code ME if this is your main source of income and you have a student loan'
      },
      {
        en_NZ: 'Use code SB, S, SH, or ST if this is a secondary job (not your main income)'
      },
      {
        en_NZ: 'Not sure? Use IRD\'s tax code selector tool online - it takes 2 minutes'
      }
    ],
    resources: [
      {
        title: 'Tax Code Selector Tool',
        url: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-code-finder',
        organization: 'Inland Revenue',
        icon: 'Calculator'
      },
      {
        title: 'Tax Codes Explained',
        url: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-codes-for-individuals',
        organization: 'Inland Revenue',
        icon: 'BookOpen'
      }
    ],
    helpText: {
      en_NZ: 'Choosing the wrong tax code may mean you owe tax at the end of the year or get too much tax deducted.'
    }
  },

  'nz-kiwisaver-enrollment': {
    requirementId: 'nz-kiwisaver-enrollment',
    stepType: 'benefits-enrollment',
    title: {
      en_NZ: 'KiwiSaver - Saving for Your Future'
    },
    description: {
      en_NZ: 'KiwiSaver is a voluntary savings scheme to help you save for your retirement. Your employer will automatically enroll you unless you opt out within 2-8 weeks.'
    },
    tips: [
      {
        en_NZ: 'You\'ll be automatically enrolled if you\'re a new employee or starting your first job'
      },
      {
        en_NZ: 'You can choose to contribute 3%, 4%, 6%, 8%, or 10% of your pay'
      },
      {
        en_NZ: 'Your employer must contribute at least 3% on top of your contributions'
      },
      {
        en_NZ: 'You can opt out between 2-8 weeks after starting, but staying in means free money from your employer!'
      },
      {
        en_NZ: 'The government may also contribute up to $521.43 per year if you contribute enough'
      }
    ],
    resources: [
      {
        title: 'KiwiSaver Explained',
        url: 'https://www.kiwisaver.govt.nz/new/kiwisaver-explained/',
        organization: 'Inland Revenue',
        icon: 'PiggyBank'
      },
      {
        title: 'KiwiSaver Calculator',
        url: 'https://www.kiwisaver.govt.nz/new/how-much-should-i-contribute/kiwisaver-retirement-calculator/',
        organization: 'Inland Revenue',
        icon: 'Calculator'
      },
      {
        title: 'Choosing a KiwiSaver Scheme',
        url: 'https://www.kiwisaver.govt.nz/new/choosing-a-kiwisaver-scheme/',
        organization: 'Inland Revenue',
        icon: 'Building'
      }
    ],
    warningMessage: {
      en_NZ: 'Employers must provide KiwiSaver information within 7 days. Removing this step may breach your legal obligations.'
    },
    helpText: {
      en_NZ: 'Questions about KiwiSaver? Call IRD on 0800 549 472 or visit kiwisaver.govt.nz'
    }
  },

  'nz-health-safety-induction': {
    requirementId: 'nz-health-safety-induction',
    stepType: 'compliance-training',
    title: {
      en_NZ: 'Health and Safety at Work'
    },
    description: {
      en_NZ: 'Your safety at work is paramount. This training covers your rights, responsibilities, and how to stay safe on the job.'
    },
    tips: [
      {
        en_NZ: 'You have the right to refuse unsafe work - your employer cannot penalize you for this'
      },
      {
        en_NZ: 'Report all hazards, incidents, and near-misses to your supervisor immediately'
      },
      {
        en_NZ: 'Know where emergency exits, first aid kits, and fire extinguishers are located'
      },
      {
        en_NZ: 'If you\'re unsure about something, ask - there are no silly questions when it comes to safety'
      }
    ],
    resources: [
      {
        title: 'Worker Rights and Responsibilities',
        url: 'https://www.worksafe.govt.nz/managing-health-and-safety/businesses/worker-engagement-and-participation/worker-responsibilities/',
        organization: 'WorkSafe New Zealand',
        icon: 'Shield'
      },
      {
        title: 'Reporting Safety Concerns',
        url: 'https://www.worksafe.govt.nz/notify-worksafe/',
        organization: 'WorkSafe New Zealand',
        icon: 'AlertTriangle'
      }
    ],
    warningMessage: {
      en_NZ: 'Health and safety training is mandatory under the Health and Safety at Work Act 2015. Employers must ensure workers are adequately trained.'
    },
    helpText: {
      en_NZ: 'Safety concerns? Contact WorkSafe NZ on 0800 030 040 or report online at worksafe.govt.nz'
    }
  },

  'nz-work-visa-verification': {
    requirementId: 'nz-work-visa-verification',
    stepType: 'upload-document',
    title: {
      en_NZ: 'Work Visa - Right to Work in NZ'
    },
    description: {
      en_NZ: 'If you\'re not a NZ citizen or permanent resident, you must have a valid work visa to work in New Zealand.'
    },
    tips: [
      {
        en_NZ: 'Check your visa conditions - some visas restrict the type or hours of work you can do'
      },
      {
        en_NZ: 'Keep track of your visa expiry date and apply for renewal well in advance'
      },
      {
        en_NZ: 'Your employer will keep a copy of your visa for their records - this is normal and required by law'
      },
      {
        en_NZ: 'Working on an expired or invalid visa is illegal and can affect future visa applications'
      }
    ],
    resources: [
      {
        title: 'Work Visa Guide',
        url: 'https://www.immigration.govt.nz/new-zealand-visas/options/work',
        organization: 'Immigration New Zealand',
        icon: 'Globe'
      },
      {
        title: 'Visa Conditions',
        url: 'https://www.immigration.govt.nz/new-zealand-visas/already-have-a-visa/living-in-new-zealand/visa-conditions',
        organization: 'Immigration New Zealand',
        icon: 'FileText'
      },
      {
        title: 'Check Visa Status',
        url: 'https://www.immigration.govt.nz/new-zealand-visas/already-have-a-visa/my-visa-online',
        organization: 'Immigration New Zealand',
        icon: 'CheckCircle'
      }
    ],
    warningMessage: {
      en_NZ: 'Employers must verify work rights before employment starts. Failure to do so can result in fines up to $100,000 and imprisonment.'
    },
    helpText: {
      en_NZ: 'Immigration questions? Contact Immigration NZ on 0508 558 855 or visit immigration.govt.nz'
    }
  },

  'nz-privacy-notice': {
    requirementId: 'nz-privacy-notice',
    stepType: 'acknowledge-document',
    title: {
      en_NZ: 'Your Privacy Rights'
    },
    description: {
      en_NZ: 'Under the Privacy Act 2020, you have the right to know how your personal information is collected, used, and stored.'
    },
    tips: [
      {
        en_NZ: 'You can request access to your personal information held by your employer at any time'
      },
      {
        en_NZ: 'You can request corrections if your personal information is incorrect'
      },
      {
        en_NZ: 'Your employer must keep your information secure and only use it for legitimate purposes'
      },
      {
        en_NZ: 'You can complain to the Privacy Commissioner if you believe your privacy rights have been breached'
      }
    ],
    resources: [
      {
        title: 'Privacy in Employment',
        url: 'https://www.privacy.org.nz/privacy-for-agencies/employment/',
        organization: 'Office of the Privacy Commissioner',
        icon: 'Lock'
      },
      {
        title: 'Your Privacy Rights',
        url: 'https://www.privacy.org.nz/your-privacy-rights/',
        organization: 'Office of the Privacy Commissioner',
        icon: 'User'
      }
    ],
    helpText: {
      en_NZ: 'Privacy concerns? Contact the Privacy Commissioner on 0800 803 909 or visit privacy.org.nz'
    }
  },

  'nz-leave-entitlements': {
    requirementId: 'nz-leave-entitlements',
    stepType: 'instructions',
    title: {
      en_NZ: 'Your Leave Entitlements'
    },
    description: {
      en_NZ: 'You\'re entitled to various types of paid and unpaid leave under NZ law. Know your rights!'
    },
    tips: [
      {
        en_NZ: 'Annual Leave: You\'re entitled to 4 weeks (20 days) paid annual leave per year'
      },
      {
        en_NZ: 'Sick Leave: After 6 months, you get 10 days paid sick leave per year (can be used for caring for dependants)'
      },
      {
        en_NZ: 'Public Holidays: You\'re entitled to 12 public holidays per year with pay (or alternative days off)'
      },
      {
        en_NZ: 'Bereavement Leave: You\'re entitled to 3 days paid bereavement leave per occurrence'
      },
      {
        en_NZ: 'Parental Leave: Eligible employees can take up to 26 weeks paid parental leave'
      }
    ],
    resources: [
      {
        title: 'Leave and Holidays Guide',
        url: 'https://www.employment.govt.nz/leave-and-holidays/',
        organization: 'Employment New Zealand',
        icon: 'Calendar'
      },
      {
        title: 'Annual Leave Calculator',
        url: 'https://www.employment.govt.nz/leave-and-holidays/annual-holidays/calculating-annual-holiday-entitlements/',
        organization: 'Employment New Zealand',
        icon: 'Calculator'
      },
      {
        title: 'Sick Leave Rules',
        url: 'https://www.employment.govt.nz/leave-and-holidays/sick-leave/',
        organization: 'Employment New Zealand',
        icon: 'Heart'
      }
    ],
    warningMessage: {
      en_NZ: 'Employers must inform employees of their leave entitlements. This is a legal requirement under the Holidays Act 2003.'
    },
    helpText: {
      en_NZ: 'Questions about leave? Call Employment NZ on 0800 20 90 20 for free advice.'
    }
  }
};

/**
 * Get contextual tip for a requirement
 */
export function getContextualTip(requirementId: string): ContextualTip | undefined {
  return COMPLIANCE_CONTEXTUAL_TIPS[requirementId];
}

/**
 * Get all tips for a step type
 */
export function getTipsForStepType(stepType: string): ContextualTip[] {
  return Object.values(COMPLIANCE_CONTEXTUAL_TIPS).filter(
    tip => tip.stepType === stepType
  );
}

/**
 * Get warning message for removing a requirement
 */
export function getRemovalWarningMessage(requirementId: string, locale: string = 'en_NZ'): string | undefined {
  const tip = COMPLIANCE_CONTEXTUAL_TIPS[requirementId];
  return tip?.warningMessage?.[locale as keyof LocalizedContent];
}

/**
 * Get help text for a requirement
 */
export function getHelpText(requirementId: string, locale: string = 'en_NZ'): string | undefined {
  const tip = COMPLIANCE_CONTEXTUAL_TIPS[requirementId];
  return tip?.helpText?.[locale as keyof LocalizedContent];
}

/**
 * Format resources for display
 */
export function formatResources(requirementId: string): string {
  const tip = COMPLIANCE_CONTEXTUAL_TIPS[requirementId];
  if (!tip) return '';

  return tip.resources
    .map(r => `- [${r.title}](${r.url}) - ${r.organization}`)
    .join('\n');
}

/**
 * Compliance UI messages
 */
export const COMPLIANCE_UI_MESSAGES = {
  PRESET_SELECTOR: {
    title: {
      en_NZ: 'Choose a Compliance Preset'
    },
    description: {
      en_NZ: 'Start with a pre-configured template that meets NZ employment law requirements'
    },
    emptyState: {
      en_NZ: 'No presets available for your region. Create a custom template instead.'
    }
  },
  
  VALIDATION_PANEL: {
    title: {
      en_NZ: 'Compliance Validation'
    },
    allClear: {
      en_NZ: '✅ All mandatory compliance requirements are met'
    },
    hasErrors: {
      en_NZ: '⚠️ This template has compliance issues that must be resolved'
    },
    hasWarnings: {
      en_NZ: '⚡ This template has recommended improvements'
    }
  },

  REMOVAL_CONFIRMATION: {
    title: {
      en_NZ: 'Remove Compliance Step?'
    },
    mandatoryWarning: {
      en_NZ: 'This step satisfies mandatory legal requirements. Removing it may breach NZ employment law.'
    },
    recommendedWarning: {
      en_NZ: 'This step is recommended for compliance best practices. Are you sure you want to remove it?'
    },
    requiresReason: {
      en_NZ: 'Please provide a reason for removing this compliance step (will be logged for audit)'
    },
    confirmButton: {
      en_NZ: 'Remove and Log Override'
    },
    cancelButton: {
      en_NZ: 'Keep Step'
    }
  },

  COMPLIANCE_SCORE: {
    excellent: {
      en_NZ: '🌟 Excellent - Full compliance'
    },
    good: {
      en_NZ: '✅ Good - Meets mandatory requirements'
    },
    fair: {
      en_NZ: '⚠️ Fair - Some gaps exist'
    },
    poor: {
      en_NZ: '❌ Poor - Critical requirements missing'
    }
  },

  TOOLTIPS: {
    complianceScore: {
      en_NZ: 'Compliance score measures how well this template meets NZ statutory requirements'
    },
    mandatoryStep: {
      en_NZ: 'This step is required by NZ law and cannot be made optional'
    },
    recommendedStep: {
      en_NZ: 'This step is recommended but not legally required'
    },
    contextualHelp: {
      en_NZ: 'Click to view detailed guidance and government resources'
    }
  }
};

/**
 * Get localized message
 */
export function getMessage(
  category: keyof typeof COMPLIANCE_UI_MESSAGES,
  key: string,
  locale: string = 'en_NZ'
): string {
  const messages = COMPLIANCE_UI_MESSAGES[category] as any;
  const message = messages?.[key];
  return message?.[locale] || message?.en_NZ || '';
}
