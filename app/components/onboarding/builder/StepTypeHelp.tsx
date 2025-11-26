"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HelpCircle,
  Info,
  ExternalLink,
  Clock,
  Users,
  FileText,
  UploadCloud,
  FileEdit,
  Wrench,
  KeySquare,
  CalendarClock,
  UserRoundPlus,
  ShieldCheck,
  Wallet,
  HeartPulse,
  Target,
  Smile,
  Workflow,
  Star,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Comprehensive help content for each step type
export const STEP_TYPE_HELP: Record<
  string,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    summary: string;
    whenToUse: string;
    employeeSees: string;
    managerSees?: string;
    estimatedTime: string;
    bestPractices: string[];
    commonMistakes?: string[];
    nzCompliance?: {
      relevant: boolean;
      references?: string[];
      notes?: string;
    };
    relatedStepTypes?: string[];
    externalLinks?: { label: string; url: string }[];
  }
> = {
  "acknowledge-document": {
    title: "Acknowledge Document",
    icon: FileText,
    color: "from-blue-500 to-indigo-600",
    summary: "Have employees read and acknowledge a document",
    whenToUse:
      "Use this step when employees need to read and confirm they understand a policy, contract, employment agreement, or any legal document. The acknowledgement creates an audit trail.",
    employeeSees:
      "A document viewer (or link to view) with a checkbox to confirm acknowledgement. They must check the box to proceed.",
    managerSees:
      "Confirmation that the employee has acknowledged, with timestamp.",
    estimatedTime: "2-5 minutes",
    bestPractices: [
      "Use clear, specific acknowledgement text",
      "Keep documents concise and readable",
      "Consider using plain language summaries for complex documents",
      "Test that the document displays correctly on mobile",
    ],
    commonMistakes: [
      "Making documents too long without a summary",
      "Using generic acknowledgement text",
      "Not specifying which document version is being acknowledged",
    ],
    nzCompliance: {
      relevant: true,
      references: ["Employment Relations Act 2000", "Health and Safety at Work Act 2015"],
      notes:
        "Employment agreements must be provided in writing. Use this step for employment agreement acknowledgement.",
    },
    relatedStepTypes: ["upload-document", "fill-form"],
    externalLinks: [
      {
        label: "Employment NZ - Employment agreements",
        url: "https://www.employment.govt.nz/starting-employment/employment-agreements/",
      },
    ],
  },
  "upload-document": {
    title: "Upload Document",
    icon: UploadCloud,
    color: "from-emerald-500 to-teal-600",
    summary: "Request employees to upload required documents",
    whenToUse:
      "Use when you need employees to provide copies of identification, certificates, qualifications, or other documents required for employment.",
    employeeSees:
      "A file upload area with clear instructions on what to upload and accepted file formats. Progress indicator during upload.",
    managerSees: "The uploaded document with metadata (upload date, file type, size).",
    estimatedTime: "3-5 minutes",
    bestPractices: [
      "Clearly specify what document is required",
      "List accepted file formats",
      "Provide examples of acceptable documents",
      "Set reasonable file size limits",
    ],
    commonMistakes: [
      "Not specifying document requirements clearly",
      "Accepting too few file formats",
      "Not providing guidance on document quality (resolution, readability)",
    ],
    nzCompliance: {
      relevant: true,
      references: ["Immigration Act 2009"],
      notes:
        "Right to work verification requires appropriate identification. Keep copies securely stored per Privacy Act 2020.",
    },
    relatedStepTypes: ["acknowledge-document", "collect-document"],
    externalLinks: [
      {
        label: "Immigration NZ - Work rights",
        url: "https://www.immigration.govt.nz/employ-migrants/hire-right",
      },
    ],
  },
  "collect-document": {
    title: "Collect Document",
    icon: UploadCloud,
    color: "from-cyan-500 to-blue-600",
    summary: "Collect an existing document from employee",
    whenToUse:
      "Use when managers or HR need to collect physical documents and mark them as received. Useful for original documents that need to be sighted.",
    employeeSees: "A status indicator showing whether the document has been collected.",
    managerSees:
      "A checklist to mark documents as collected with notes field for any issues.",
    estimatedTime: "1-2 minutes",
    bestPractices: [
      "List exactly what original documents are needed",
      "Specify when and where to present documents",
      "Include contact details for questions",
    ],
    relatedStepTypes: ["upload-document"],
  },
  "fill-form": {
    title: "Fill Form",
    icon: FileEdit,
    color: "from-purple-500 to-violet-600",
    summary: "Have employees complete a form",
    whenToUse:
      "Use when you need to collect specific information through a custom form. Good for emergency contacts, dietary requirements, or any structured data collection.",
    employeeSees: "An interactive form with fields to complete. Validation messages for errors.",
    managerSees: "The completed form responses, exportable if needed.",
    estimatedTime: "5-15 minutes depending on form length",
    bestPractices: [
      "Only ask for information you actually need",
      "Use appropriate field types (date picker for dates, etc.)",
      "Group related fields together",
      "Mark optional fields clearly",
    ],
    commonMistakes: [
      "Asking for the same information twice",
      "Not explaining why information is needed",
      "Creating overly long forms",
    ],
    relatedStepTypes: ["payroll-setup", "welcome-survey"],
  },
  instructions: {
    title: "Welcome/Instructions",
    icon: Info,
    color: "from-amber-500 to-orange-600",
    summary: "Display welcome message or instructions",
    whenToUse:
      "Use to welcome new hires, provide important information, or give context before other steps. No action required from the employee other than reading.",
    employeeSees: "A welcome message or instruction card with a continue button.",
    estimatedTime: "1-2 minutes",
    bestPractices: [
      "Keep welcome messages warm and personal",
      "Include key contacts and resources",
      "Set expectations for the onboarding process",
      "Use formatting to highlight important information",
    ],
    relatedStepTypes: ["acknowledge-document"],
  },
  "training-assignment": {
    title: "Assign Training",
    icon: ShieldCheck,
    color: "from-rose-500 to-pink-600",
    summary: "Assign training modules to complete",
    whenToUse:
      "Use to assign required learning modules. Can link to external training platforms or internal resources.",
    employeeSees: "A checklist of training modules with links and completion tracking.",
    managerSees: "Training completion status and dates for each module.",
    estimatedTime: "Variable - depends on training content",
    bestPractices: [
      "Prioritize mandatory training first",
      "Set realistic deadlines",
      "Include links to training materials",
      "Distinguish between mandatory and optional training",
    ],
    nzCompliance: {
      relevant: true,
      references: ["Health and Safety at Work Act 2015"],
      notes: "H&S training is a legal requirement. Document completion for audit purposes.",
    },
    relatedStepTypes: ["compliance-training"],
    externalLinks: [
      {
        label: "WorkSafe NZ - Worker training",
        url: "https://worksafe.govt.nz/managing-health-and-safety/businesses/worker-engagement-and-participation/",
      },
    ],
  },
  "compliance-training": {
    title: "Compliance Training",
    icon: ShieldCheck,
    color: "from-red-500 to-rose-600",
    summary: "Complete mandatory compliance training",
    whenToUse:
      "Use for legally required or policy-mandated training. Creates a compliance audit trail.",
    employeeSees: "Compliance course checklist with progress indicators and deadlines.",
    managerSees: "Compliance status dashboard with completion dates.",
    estimatedTime: "30-60 minutes for typical compliance modules",
    bestPractices: [
      "Set clear deadlines",
      "Send reminder notifications",
      "Track completion for compliance audits",
      "Update training regularly to reflect law changes",
    ],
    nzCompliance: {
      relevant: true,
      references: ["Health and Safety at Work Act 2015", "Privacy Act 2020"],
      notes:
        "HSWA requires workers to be trained on health and safety. Privacy Act training recommended for those handling personal information.",
    },
    relatedStepTypes: ["training-assignment"],
  },
  "equipment-checklist": {
    title: "Equipment Checklist",
    icon: Wrench,
    color: "from-slate-500 to-gray-600",
    summary: "Track equipment provisioning",
    whenToUse:
      "Use to track equipment and assets issued to the new hire. Creates an asset management record.",
    employeeSees: "A checklist of equipment items with confirmation checkboxes.",
    managerSees: "Equipment issue status with serial numbers and notes.",
    estimatedTime: "5-10 minutes",
    bestPractices: [
      "Include all standard equipment for the role",
      "Track serial numbers for IT assets",
      "Include return conditions in notes",
      "Add PPE requirements where applicable",
    ],
    relatedStepTypes: ["system-access"],
  },
  "system-access": {
    title: "System Access",
    icon: KeySquare,
    color: "from-indigo-500 to-blue-600",
    summary: "Manage system access provisioning",
    whenToUse:
      "Use to track system access and credentials provisioning. IT can mark systems as provisioned.",
    employeeSees: "A list of systems with access status and any credentials or instructions.",
    managerSees: "Access provisioning checklist with status and notes.",
    estimatedTime: "5-10 minutes for employee, variable for IT provisioning",
    bestPractices: [
      "List all required systems for the role",
      "Include links to password reset/setup",
      "Note any special access requirements",
      "Track provisioning completion",
    ],
    relatedStepTypes: ["equipment-checklist"],
  },
  "manager-checkin": {
    title: "Manager Check-in",
    icon: CalendarClock,
    color: "from-teal-500 to-cyan-600",
    summary: "Schedule manager check-in meetings",
    whenToUse:
      "Use to schedule and track regular check-ins during probation or onboarding period.",
    employeeSees: "A timeline of scheduled check-ins with dates and agenda topics.",
    managerSees: "Check-in schedule with completion status and notes from each meeting.",
    estimatedTime: "2-5 minutes to review, meetings vary",
    bestPractices: [
      "Schedule check-ins at key milestones (day 1, week 1, month 1, etc.)",
      "Provide agenda or discussion topics",
      "Allow for rescheduling",
      "Document outcomes",
    ],
    nzCompliance: {
      relevant: true,
      references: ["Employment Relations Act 2000"],
      notes:
        "Regular check-ins during trial period help ensure fair process if employment issues arise.",
    },
    relatedStepTypes: ["probation-goals", "buddy-introduction"],
  },
  "buddy-introduction": {
    title: "Buddy Introduction",
    icon: UserRoundPlus,
    color: "from-green-500 to-emerald-600",
    summary: "Introduce to assigned buddy",
    whenToUse:
      "Use to facilitate introduction to an onboarding buddy who can help with informal questions and cultural integration.",
    employeeSees: "Buddy contact information, photo, role, and introduction notes.",
    estimatedTime: "2-5 minutes to review, ongoing relationship",
    bestPractices: [
      "Choose buddies who are enthusiastic volunteers",
      "Match by team, interests, or background where possible",
      "Provide buddy training or guidelines",
      "Set expectations for both parties",
    ],
    relatedStepTypes: ["manager-checkin"],
  },
  "payroll-setup": {
    title: "Payroll Setup",
    icon: Wallet,
    color: "from-yellow-500 to-amber-600",
    summary: "Collect payroll information",
    whenToUse:
      "Essential for NZ employers. Collect IRD numbers, tax codes, bank details, and KiwiSaver preferences.",
    employeeSees: "A secure form for entering sensitive payroll and tax information.",
    managerSees: "Confirmation that payroll details have been submitted (not the actual values).",
    estimatedTime: "5-10 minutes",
    bestPractices: [
      "Explain why each piece of information is needed",
      "Link to IRD for tax code help",
      "Validate IRD numbers in real-time",
      "Encrypt sensitive data at rest",
    ],
    nzCompliance: {
      relevant: true,
      references: ["Tax Administration Act 1994", "KiwiSaver Act 2006", "Income Tax Act 2007"],
      notes:
        "IRD number collection is mandatory. KiwiSaver auto-enrolment applies to new employees aged 18-65.",
    },
    relatedStepTypes: ["fill-form"],
    externalLinks: [
      {
        label: "IRD - Tax codes",
        url: "https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-codes-for-individuals",
      },
      {
        label: "KiwiSaver information",
        url: "https://www.kiwisaver.govt.nz/",
      },
    ],
  },
  "benefits-enrollment": {
    title: "Benefits Enrollment",
    icon: HeartPulse,
    color: "from-pink-500 to-rose-600",
    summary: "Enroll in employee benefits",
    whenToUse: "Use to guide employees through benefit selections like health insurance, wellness programs, or other perks.",
    employeeSees: "Links to benefit portals with enrollment guidance and deadlines.",
    estimatedTime: "10-20 minutes depending on options",
    bestPractices: [
      "Clearly explain each benefit option",
      "Include enrollment deadlines",
      "Provide comparison information",
      "Note any waiting periods",
    ],
    relatedStepTypes: ["payroll-setup"],
  },
  "probation-goals": {
    title: "Probation Goals",
    icon: Target,
    color: "from-violet-500 to-purple-600",
    summary: "Set probation period goals",
    whenToUse: "Use to set and track goals for the probation period. Helps set clear expectations.",
    employeeSees: "A list of goals and milestones for the probation period with progress tracking.",
    managerSees: "Goal progress and notes for each milestone.",
    estimatedTime: "10-15 minutes initial setup, ongoing tracking",
    bestPractices: [
      "Set SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)",
      "Include both performance and learning goals",
      "Review regularly during check-ins",
      "Document progress",
    ],
    nzCompliance: {
      relevant: true,
      references: ["Employment Relations Act 2000"],
      notes:
        "Clear goals during trial period support fair process. Document any performance concerns promptly.",
    },
    relatedStepTypes: ["manager-checkin"],
  },
  "welcome-survey": {
    title: "Welcome Survey",
    icon: Smile,
    color: "from-orange-500 to-red-600",
    summary: "Collect feedback on onboarding",
    whenToUse:
      "Use to gather feedback on the onboarding experience. Helps improve the process for future hires.",
    employeeSees: "A survey form to provide feedback on their onboarding experience.",
    estimatedTime: "5-10 minutes",
    bestPractices: [
      "Keep surveys concise",
      "Include both rating scales and open-ended questions",
      "Send at appropriate timing (e.g., end of week 1, end of month 1)",
      "Act on feedback received",
    ],
    relatedStepTypes: ["fill-form"],
  },
  "journey-automation": {
    title: "Journey Automation",
    icon: Workflow,
    color: "from-blue-600 to-indigo-700",
    summary: "Trigger automated workflows",
    whenToUse:
      "Use to trigger automated workflows based on step completion. Good for complex onboarding with conditional paths.",
    employeeSees: "Progress indicators for automated processes running in the background.",
    estimatedTime: "Automatic - no employee time required",
    bestPractices: [
      "Test automations thoroughly before going live",
      "Include error handling",
      "Monitor automation success rates",
      "Keep employees informed of what's happening",
    ],
    relatedStepTypes: [],
  },
};

interface StepTypeHelpProps {
  stepType: string;
  trigger?: React.ReactNode;
  showAsDialog?: boolean;
}

export function StepTypeHelp({ stepType, trigger, showAsDialog = false }: StepTypeHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const help = STEP_TYPE_HELP[stepType];

  if (!help) {
    return null;
  }

  const Icon = help.icon;

  const content = (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-none",
            help.color
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">{help.title}</h3>
          <p className="text-sm text-muted-foreground">{help.summary}</p>
          {help.nzCompliance?.relevant && (
            <Badge className="mt-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs">
              <Star className="w-3 h-3 mr-1" />
              NZ Compliance Relevant
            </Badge>
          )}
        </div>
      </div>

      {/* When to use */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            When to use
          </span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-400">{help.whenToUse}</p>
      </div>

      {/* What people see */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Employee sees
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">{help.employeeSees}</p>
        </div>
        {help.managerSees && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Manager sees
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">{help.managerSees}</p>
          </div>
        )}
      </div>

      {/* Estimated time */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Estimated time: {help.estimatedTime}</span>
      </div>

      {/* Best practices */}
      {help.bestPractices.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Best practices
          </h4>
          <ul className="space-y-1">
            {help.bestPractices.map((practice, index) => (
              <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <span className="text-emerald-500 mt-1">•</span>
                {practice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common mistakes */}
      {help.commonMistakes && help.commonMistakes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Common mistakes to avoid
          </h4>
          <ul className="space-y-1">
            {help.commonMistakes.map((mistake, index) => (
              <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* NZ Compliance */}
      {help.nzCompliance?.relevant && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            NZ Compliance
          </h4>
          {help.nzCompliance.notes && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-2">
              {help.nzCompliance.notes}
            </p>
          )}
          {help.nzCompliance.references && (
            <div className="flex flex-wrap gap-1">
              {help.nzCompliance.references.map((ref, index) => (
                <Badge key={index} variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                  {ref}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* External links */}
      {help.externalLinks && help.externalLinks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Helpful links
          </h4>
          <div className="space-y-1">
            {help.externalLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (showAsDialog) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="h-8 w-8"
        >
          {trigger || <HelpCircle className="w-4 h-4" />}
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Step Type Help</DialogTitle>
              <DialogDescription>
                Learn how to use this step type effectively
              </DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {trigger || <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[500px] overflow-y-auto p-4" side="right">
        {content}
      </PopoverContent>
    </Popover>
  );
}

// Compact help button for use in step cards
export function StepTypeHelpButton({ stepType }: { stepType: string }) {
  const help = STEP_TYPE_HELP[stepType];
  if (!help) return null;

  return (
    <StepTypeHelp
      stepType={stepType}
      trigger={
        <HelpCircle className="w-4 h-4 text-slate-400 hover:text-indigo-500 transition-colors" />
      }
    />
  );
}

export default StepTypeHelp;

