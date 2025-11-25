import {
  FileCheck,
  FileSignature,
  Palmtree,
  Clock,
  UserCog,
  Users,
  ClipboardCheck,
  UserPlus,
  CheckSquare,
  ClipboardList,
  Star,
  MessageSquare,
  UserX,
  FileQuestion,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

// Icon configuration for different action item types
export interface ActionItemIconConfig {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

export const actionItemIconConfig: Record<string, ActionItemIconConfig> = {
  // Document related
  document: {
    icon: FileCheck,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  document_upload: {
    icon: FileCheck,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  signature: {
    icon: FileSignature,
    bgColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  // Leave/Holiday related
  leave: {
    icon: Palmtree,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  leave_approval: {
    icon: Palmtree,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  leave_hr_approval: {
    icon: Palmtree,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  // Timesheet related
  timesheet: {
    icon: Clock,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  timesheet_approval: {
    icon: Clock,
    bgColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  // Change requests
  change: {
    icon: UserCog,
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  // Bulk updates
  bulk_update: {
    icon: Users,
    bgColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  bulk_update_approval: {
    icon: Users,
    bgColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  // Surveys
  survey: {
    icon: ClipboardCheck,
    bgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  survey_completion: {
    icon: ClipboardCheck,
    bgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
  // Forms
  form_completion: {
    icon: FileQuestion,
    bgColor: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  // Onboarding
  onboarding: {
    icon: UserPlus,
    bgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  onboarding_task: {
    icon: UserPlus,
    bgColor: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  // Offboarding
  offboarding: {
    icon: UserX,
    bgColor: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  offboarding_task: {
    icon: UserX,
    bgColor: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  exit_interview: {
    icon: UserX,
    bgColor: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  // Performance reviews
  performance: {
    icon: Star,
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  performance_self_review: {
    icon: Star,
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  performance_manager_review: {
    icon: Star,
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  performance_peer_review: {
    icon: Star,
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  performance_360_review: {
    icon: Star,
    bgColor: "bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  // Meetings
  meeting: {
    icon: CalendarDays,
    bgColor: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  meeting_preparation: {
    icon: CalendarDays,
    bgColor: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  meeting_action_item: {
    icon: MessageSquare,
    bgColor: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  // Default task
  task: {
    icon: CheckSquare,
    bgColor: "bg-slate-100",
    iconColor: "text-slate-600",
  },
  // Generic approval
  approval: {
    icon: ClipboardList,
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
};

// Define an interface for action item-like objects
interface ActionItemLike {
  type?: string;
  title?: string;
  subtitle?: string;
  metadata?: {
    type?: string;
    source?: string;
    [key: string]: unknown;
  };
}

// Helper to get icon config based on item type and metadata
export function getActionItemIconConfig(item: ActionItemLike): ActionItemIconConfig {
  const metadata = item.metadata || {};
  const itemType = (item.type || "").toLowerCase();
  const metadataType = (metadata.type || "").toLowerCase();
  const subtitle = (item.subtitle || "").toLowerCase();
  const title = (item.title || "").toLowerCase();

  // Try exact match on metadata type first (most specific)
  const metadataKey = metadataType.replace(/ /g, "_");
  if (metadataKey && actionItemIconConfig[metadataKey]) {
    return actionItemIconConfig[metadataKey];
  }

  // Try exact match on item type
  const typeKey = itemType.replace(/ /g, "_");
  if (typeKey && actionItemIconConfig[typeKey]) {
    return actionItemIconConfig[typeKey];
  }

  // Check for specific patterns in metadata type
  if (metadataType.includes("bulk")) {
    return actionItemIconConfig.bulk_update;
  }
  if (metadataType.includes("timesheet")) {
    return actionItemIconConfig.timesheet;
  }
  if (metadataType.includes("survey")) {
    return actionItemIconConfig.survey;
  }
  if (metadataType.includes("performance") || metadataType.includes("review")) {
    return actionItemIconConfig.performance;
  }
  if (metadataType.includes("leave") || metadata.source === "leave") {
    return actionItemIconConfig.leave;
  }
  if (metadataType.includes("meeting")) {
    return actionItemIconConfig.meeting;
  }
  if (metadataType.includes("onboarding")) {
    return actionItemIconConfig.onboarding;
  }
  if (metadataType.includes("offboarding") || metadataType.includes("exit")) {
    return actionItemIconConfig.offboarding;
  }
  if (metadataType.includes("document") || metadataType.includes("upload")) {
    return actionItemIconConfig.document;
  }
  if (metadataType.includes("form")) {
    return actionItemIconConfig.form_completion;
  }

  // Check subtitle and title for context clues
  if (subtitle.includes("onboarding") || title.includes("onboarding")) {
    return actionItemIconConfig.onboarding;
  }
  if (subtitle.includes("offboarding") || title.includes("offboarding")) {
    return actionItemIconConfig.offboarding;
  }
  if (subtitle.includes("signature") || title.includes("sign")) {
    return actionItemIconConfig.signature;
  }
  if (subtitle.includes("leave") || subtitle.includes("holiday") || 
      title.includes("leave") || title.includes("holiday")) {
    return actionItemIconConfig.leave;
  }
  if (subtitle.includes("survey") || title.includes("survey")) {
    return actionItemIconConfig.survey;
  }
  if (subtitle.includes("review") || title.includes("review") || 
      subtitle.includes("performance") || title.includes("performance")) {
    return actionItemIconConfig.performance;
  }
  if (subtitle.includes("meeting") || title.includes("meeting") || title.includes("1:1") || title.includes("1-1")) {
    return actionItemIconConfig.meeting;
  }
  if (subtitle.includes("timesheet") || title.includes("timesheet")) {
    return actionItemIconConfig.timesheet;
  }

  // Fall back to base type
  switch (itemType) {
    case "signature":
      return actionItemIconConfig.signature;
    case "document":
      return actionItemIconConfig.document;
    case "change":
      return actionItemIconConfig.change;
    case "approval":
      return actionItemIconConfig.approval;
    case "task":
    default:
      return actionItemIconConfig.task;
  }
}

// Helper to get icon config from a type string directly (for admin tables)
export function getIconConfigFromType(type: string): ActionItemIconConfig {
  const normalizedType = type.toLowerCase().replace(/ /g, "_");
  
  // Direct match
  if (actionItemIconConfig[normalizedType]) {
    return actionItemIconConfig[normalizedType];
  }

  // Pattern matching
  if (normalizedType.includes("performance") || normalizedType.includes("review")) {
    return actionItemIconConfig.performance;
  }
  if (normalizedType.includes("leave")) {
    return actionItemIconConfig.leave;
  }
  if (normalizedType.includes("timesheet")) {
    return actionItemIconConfig.timesheet;
  }
  if (normalizedType.includes("survey")) {
    return actionItemIconConfig.survey;
  }
  if (normalizedType.includes("document") || normalizedType.includes("upload")) {
    return actionItemIconConfig.document;
  }
  if (normalizedType.includes("onboarding")) {
    return actionItemIconConfig.onboarding;
  }
  if (normalizedType.includes("offboarding") || normalizedType.includes("exit")) {
    return actionItemIconConfig.offboarding;
  }
  if (normalizedType.includes("meeting")) {
    return actionItemIconConfig.meeting;
  }
  if (normalizedType.includes("form")) {
    return actionItemIconConfig.form_completion;
  }
  if (normalizedType.includes("bulk")) {
    return actionItemIconConfig.bulk_update;
  }

  return actionItemIconConfig.task;
}

