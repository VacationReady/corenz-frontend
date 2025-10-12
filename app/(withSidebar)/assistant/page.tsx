"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { ReactNode, ComponentType } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  Plus,
  Loader2,
  AlertCircle,
  Table,
  Workflow,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  Bell,
  Target,
  ArrowRight,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  Database,
  Edit,
  Mail,
  BarChart3,
  Settings,
  Briefcase,
  Shield,
  Download,
  Upload,
  X,
  Map as MapIcon,
} from "lucide-react";
import { toast } from "sonner";
import { WorkflowCanvas } from "@/(withSidebar)/settings/automation-rules/components/WorkflowCanvas";
import { PageShell } from "@/components/ui/PageShell";
import { createPortal } from "react-dom";
import DataVisualization from "@/components/ai/DataVisualization";

type MessageRole = "user" | "assistant" | "system";
type ActionType = "query" | "workflow" | "field" | "info";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  actionType?: ActionType;
  result?: any;
  isLoading?: boolean;
  suggestions?: string[];
  summary?: string;
  requiresConfirmation?: boolean;
  preview?: any;
  undoable?: boolean;
  undoId?: string;
  chartConfig?: {
    type: "bar" | "pie" | "line";
    data: any[];
    title?: string;
    description?: string;
    xKey?: string;
    yKey?: string;
    labelKey?: string;
    valueKey?: string;
    colors?: string[];
  };
}

const CAPABILITY_CATEGORIES = [
  {
    id: "insights",
    title: "What do you want to know about your people?",
    icon: <Users className="w-6 h-6" />,
    gradient: "from-blue-500 to-cyan-500",
    examples: [
      "How many employees don't have IRD numbers?",
      "Show me employees starting in the next 30 days",
      "Which departments have the highest turnover?",
      "Who hasn't completed their onboarding forms?",
      "List all employees with contracts expiring this quarter",
    ],
  },
  {
    id: "csv-import",
    title: "Need help with CSV imports?",
    icon: <Upload className="w-6 h-6" />,
    gradient: "from-green-500 to-emerald-500",
    examples: [
      "Help me with CSV import",
      "Show me a CSV template",
      "What fields can I import in CSV?",
      "CSV import is failing - help me fix it",
      "Map my CSV fields to system fields",
      "What's the format for dates in CSV?",
      "How do I import employee data?",
      "CSV template with personal info fields",
    ],
  },
  {
    id: "workflows",
    title: "What workflow can I build today?",
    icon: <Zap className="w-6 h-6" />,
    gradient: "from-purple-500 to-pink-500",
    examples: [
      "Alert HR 60 days before contracts expire",
      "Send reminder to managers 5 days before probation ends",
      "Welcome new Engineering hires with IT setup form",
      "Notify manager when employee leave balance is low",
      "Create review task for employees after 90 days",
      "Send birthday wishes to employees automatically",
    ],
    bulkExamples: [
      "I have a Christmas shutdown can you book that off?",
      "Book everyone off for the holiday period",
      "Company shutdown for end of year",
      "Office closed for annual break",
      "Mass leave booking for all staff",
      "Bulk holiday request for everyone",
    ],
    reportExamples: [
      "Create a monthly employee report for Sales",
      "Generate a performance dashboard for managers",
      "Show me attendance data for this quarter",
      "Build a turnover report for last year",
      "Make a headcount summary for HR",
      "Display leave analytics by department",
    ],
    emailExamples: [
      "Email monthly report in PDF to all managers",
      "Send Excel attendance data to HR team",
      "Email CSV export to accounting department",
      "Send performance report PDF to executives",
      "Email leave summary to department heads",
      "Send turnover report Excel to HR director",
    ],
    hrExamples: [
      "Add new employee John Smith as Sales Manager",
      "Request 5 days annual leave for Sarah Johnson",
      "Onboard new Marketing Manager starting Monday",
      "Upload employment contracts with expiry alerts",
      "Set up leave approval workflow for managers",
      "Create monthly employee report for HR team",
    ],
    discovery: [
      "What triggers can I use to start workflows?",
      "How do I filter employees in my workflows?",
      "What actions are available for automation?",
      "How do I handle errors in workflows?",
      "Can I run multiple actions simultaneously?",
      "What advanced node types are available?",
    ],
  },
  {
    id: "customise",
    title: "How can I customise employee data?",
    icon: <Plus className="w-6 h-6" />,
    gradient: "from-emerald-500 to-teal-500",
    examples: [
      "Add a 'T-Shirt Size' dropdown to personal info",
      "Create a 'Dietary Requirements' text field",
      "Add 'Preferred Pronouns' to employee profiles",
      "Add 'LinkedIn Profile' URL field",
      "Create a 'Parking Space' field",
    ],
  },
  {
    id: "trends",
    title: "What trends should I be tracking?",
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: "from-amber-500 to-orange-500",
    examples: [
      "Show leave request patterns by department",
      "Track onboarding completion rates",
      "Find employees with upcoming anniversaries",
      "Analyze document expiry trends",
      "Which forms have the lowest completion rates?",
    ],
  },
  {
    id: "compliance",
    title: "What compliance checks can you run?",
    icon: <Shield className="w-6 h-6" />,
    gradient: "from-red-500 to-rose-500",
    examples: [
      "Run a compliance sweep on all employees",
      "Check who has expiring visas",
      "Find employees missing required documents",
      "Verify IRD number compliance",
      "Check contract expiry dates",
    ],
  },
  {
    id: "analytics",
    title: "What analytics can you provide?",
    icon: <BarChart3 className="w-6 h-6" />,
    gradient: "from-indigo-500 to-blue-500",
    examples: [
      "Give me a turnover report",
      "Show diversity statistics by department",
      "Summarize workforce trends",
      "Analyze hiring patterns",
      "Calculate average tenure by role",
    ],
  },
];

const QUICK_ACTIONS = [
  {
    label: "Compliance Check",
    icon: <Shield className="w-4 h-4" />,
    prompt: "Run a compliance sweep on all employees",
    type: "query" as ActionType,
    color: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
  },
  {
    label: "Turnover Report",
    icon: <BarChart3 className="w-4 h-4" />,
    prompt: "Give me a turnover report",
    type: "query" as ActionType,
    color: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20",
  },
  {
    label: "CSV Import Help",
    icon: <Upload className="w-4 h-4" />,
    prompt: "Help me with CSV import",
    type: "query" as ActionType,
    color: "bg-green-500/10 text-green-600 hover:bg-green-500/20",
  },
  {
    label: "Contract Expiry Alert",
    icon: <Bell className="w-4 h-4" />,
    prompt: "Create a workflow that alerts HR 60 days before contracts expire",
    type: "workflow" as ActionType,
    color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
  },
];

const AI_CAPABILITIES = [
  {
    category: "📊 Data Queries & Insights",
    icon: <Database className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-500",
    capabilities: [
      { action: "Count employees by any criteria", example: "How many employees in Sales without IRD?" },
      { action: "Find specific employees", example: "Show me all managers in Auckland" },
      { action: "Analyze leave patterns", example: "Which department takes the most leave?" },
      { action: "Check compliance gaps", example: "Who hasn't completed their onboarding?" },
      { action: "Track contract expiries", example: "List contracts expiring in Q1" },
      { action: "View document status", example: "Who has expiring visas?" },
      { action: "Calculate statistics", example: "Average salary by department" },
      { action: "Identify trends", example: "Show turnover rate by month" },
    ],
  },
  {
    category: "📁 CSV Import & Data Management",
    icon: <Upload className="w-5 h-5" />,
    color: "from-green-500 to-emerald-500",
    capabilities: [
      { action: "CSV import guidance", example: "Help me with CSV import" },
      { action: "Generate CSV templates", example: "Show me a CSV template with personal info" },
      { action: "Field mapping assistance", example: "Map my CSV fields to system fields" },
      { action: "Error troubleshooting", example: "Why is my CSV import failing?" },
      { action: "Data format guidance", example: "What's the correct date format for CSV?" },
      { action: "Import validation", example: "Check my CSV data before importing" },
      { action: "Bulk import strategies", example: "How do I import 1000 employees efficiently?" },
      { action: "Import history tracking", example: "Show me my recent CSV imports" },
    ],
  },
  {
    category: "✏️ Modify Employee Data",
    icon: <Edit className="w-5 h-5" />,
    color: "from-emerald-500 to-teal-500",
    capabilities: [
      { action: "Update bank details", example: "Change Parj Sangha's bank account to 12-3456-0123456-00" },
      { action: "Change contact info", example: "Update Sarah's email to sarah@newdomain.com" },
      { action: "Modify job details", example: "Move James to Engineering department" },
      { action: "Update salary", example: "Increase John's salary to $85,000" },
      { action: "Change manager", example: "Assign Lisa as Mike's new manager" },
      { action: "Update location", example: "Move all Engineering to WFH" },
      { action: "Bulk updates", example: "Set all Sales team to Auckland office" },
      { action: "Fix missing data", example: "Add IRD numbers for everyone without one" },
    ],
  },
  {
    category: "📅 Leave & Time Management",
    icon: <Calendar className="w-5 h-5" />,
    color: "from-purple-500 to-pink-500",
    capabilities: [
      { action: "Book holiday leave", example: "Book leave for James Garner from Dec 20-27" },
      { action: "Check leave balances", example: "How many days does Sarah have left?" },
      { action: "Approve leave requests", example: "Approve all pending leave for this week" },
      { action: "Cancel leave", example: "Cancel John's leave for next Monday" },
      { action: "Adjust leave balances", example: "Give Engineering team 2 extra days" },
      { action: "Create leave policies", example: "Add 'Study Leave' with 5 days per year" },
      { action: "Block out periods", example: "Block Christmas week for everyone" },
      { action: "Check coverage", example: "Who's working next Friday?" },
    ],
  },
  {
    category: "⚡ Workflows & Automation",
    icon: <Zap className="w-5 h-5" />,
    color: "from-amber-500 to-orange-500",
    capabilities: [
      { action: "Create alert workflows", example: "Alert HR 60 days before contracts expire" },
      { action: "Build onboarding flows", example: "Create 30-day onboarding for Customer Success" },
      { action: "Set up reminders", example: "Remind managers about probation reviews" },
      { action: "Automate notifications", example: "Email employees on their work anniversary" },
      { action: "Schedule tasks", example: "Create review tasks 90 days after start date" },
      { action: "Compliance checks", example: "Alert if documents expire in 30 days" },
      { action: "Birthday wishes", example: "Send birthday emails automatically" },
      { action: "Escalation workflows", example: "Escalate if form not completed in 7 days" },
    ],
  },
  {
    category: "➕ Customise System",
    icon: <Plus className="w-5 h-5" />,
    color: "from-rose-500 to-pink-500",
    capabilities: [
      { action: "Add custom fields", example: "Add 'T-Shirt Size' dropdown to personal info" },
      { action: "Create new forms", example: "Build a 'Remote Work Request' form" },
      { action: "Add leave categories", example: "Create 'Volunteer Day' leave type" },
      { action: "Set up departments", example: "Add Customer Success department" },
      { action: "Create job roles", example: "Add 'Senior Product Designer' role" },
      { action: "Modify form fields", example: "Make emergency contact required" },
      { action: "Add validation rules", example: "Validate IRD number format" },
      { action: "Customise options", example: "Add 'Wellington' to office locations" },
    ],
  },
  {
    category: "📧 Communications",
    icon: <Mail className="w-5 h-5" />,
    color: "from-indigo-500 to-purple-500",
    capabilities: [
      { action: "Email employees", example: "Email all Sales about policy change" },
      { action: "Email managers", example: "Send probation reminder to all managers" },
      { action: "Schedule emails", example: "Email CEO a headcount report every Monday" },
      { action: "Send bulk messages", example: "Notify everyone about system maintenance" },
      { action: "Reminder emails", example: "Remind employees to update bank details" },
      { action: "Welcome emails", example: "Send welcome email to new starters" },
      { action: "Follow-up emails", example: "Email if onboarding not complete" },
      { action: "Custom templates", example: "Create offer letter template" },
    ],
  },
  {
    category: "📊 Reports & Exports",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "from-cyan-500 to-blue-500",
    capabilities: [
      { action: "Generate reports", example: "Create turnover report by department" },
      { action: "Schedule reports", example: "Email CEO headcount report every 30 days" },
      { action: "Export to Excel", example: "Export all employees to Excel" },
      { action: "Compliance reports", example: "Generate visa expiry report" },
      { action: "Custom analytics", example: "Show leave trends for last 6 months" },
      { action: "Salary reports", example: "Create salary breakdown by role" },
      { action: "Attendance reports", example: "Who had the most absences?" },
      { action: "Performance data", example: "Export review scores to CSV" },
    ],
  },
  {
    category: "👥 Employee Lifecycle",
    icon: <Users className="w-5 h-5" />,
    color: "from-green-500 to-emerald-500",
    capabilities: [
      { action: "Onboard new employees", example: "Set up onboarding for Sarah starting Monday" },
      { action: "Start offboarding", example: "Begin offboarding process for John" },
      { action: "Promote employees", example: "Promote James to Senior Developer" },
      { action: "Transfer departments", example: "Move Sarah from Sales to Marketing" },
      { action: "Probation reviews", example: "Schedule 90-day review for new starters" },
      { action: "Performance reviews", example: "Create quarterly review tasks" },
      { action: "Contract renewals", example: "Prepare contract renewal for Lisa" },
      { action: "Exit interviews", example: "Schedule exit interview for departing employee" },
    ],
  },
  {
    category: "🛡️ Compliance & Risk",
    icon: <Shield className="w-5 h-5" />,
    color: "from-red-500 to-rose-500",
    capabilities: [
      { action: "Run compliance sweeps", example: "Check all visa expiries" },
      { action: "Find missing documents", example: "Who hasn't submitted required forms?" },
      { action: "Verify tax compliance", example: "Check IRD number completion" },
      { action: "Contract expiry checks", example: "Show contracts expiring this quarter" },
      { action: "Audit missing data", example: "Find incomplete employee profiles" },
      { action: "Track policy acknowledgments", example: "Who hasn't acknowledged the new policy?" },
      { action: "Identify compliance risks", example: "Run comprehensive compliance check" },
      { action: "Document verification", example: "Check which employees are missing ID documents" },
    ],
  },
  {
    category: "📈 Analytics & Insights",
    icon: <BarChart3 className="w-5 h-5" />,
    color: "from-indigo-500 to-blue-500",
    capabilities: [
      { action: "Turnover analysis", example: "Show me turnover rates by department" },
      { action: "Diversity reports", example: "Give me diversity statistics" },
      { action: "Workforce trends", example: "Summarize hiring patterns" },
      { action: "Tenure analysis", example: "Calculate average tenure" },
      { action: "Compensation benchmarks", example: "Compare salaries by role" },
      { action: "Leave usage patterns", example: "Analyze leave trends" },
      { action: "Growth metrics", example: "Show headcount growth over time" },
      { action: "Department analytics", example: "Breakdown by department" },
    ],
  },
  {
    category: "📢 Targeted Communications",
    icon: <Mail className="w-5 h-5" />,
    color: "from-pink-500 to-rose-500",
    capabilities: [
      { action: "Email by role", example: "Email all managers about new policy" },
      { action: "Department announcements", example: "Send update to Engineering team" },
      { action: "Conditional messaging", example: "Email everyone without IRD numbers" },
      { action: "Scheduled campaigns", example: "Send monthly safety reminders" },
      { action: "Policy announcements", example: "Roll out WFH policy to all staff" },
      { action: "Group notifications", example: "Notify Sales about training" },
      { action: "Bulk communications", example: "Send reminder to all contractors" },
      { action: "Targeted reminders", example: "Email those with missing documents" },
    ],
  },
  {
    category: "🔐 Permissions & Security",
    icon: <Shield className="w-5 h-5" />,
    color: "from-slate-500 to-gray-500",
    capabilities: [
      { action: "Grant admin access", example: "Make Sarah an admin" },
      { action: "Update permissions", example: "Give managers access to salary data" },
      { action: "Create permission profiles", example: "Create 'HR Coordinator' profile" },
      { action: "Audit user actions", example: "Show me what John changed last week" },
      { action: "Review access logs", example: "Who viewed salary data?" },
      { action: "Lock accounts", example: "Disable access for departing employees" },
      { action: "Reset passwords", example: "Send password reset to new users" },
      { action: "Two-factor auth", example: "Enable 2FA for all admins" },
    ],
  },
  {
    category: "⚙️ System Configuration",
    icon: <Settings className="w-5 h-5" />,
    color: "from-orange-500 to-red-500",
    capabilities: [
      { action: "Change settings", example: "Change probation period to 120 days" },
      { action: "Update company info", example: "Change company name to Acme Inc" },
      { action: "Modify accrual rates", example: "Change annual leave to 25 days" },
      { action: "Set up holidays", example: "Add King's Birthday as public holiday" },
      { action: "Configure notifications", example: "Send Slack alerts for urgent tasks" },
      { action: "Branding updates", example: "Upload new company logo" },
      { action: "Integration setup", example: "Connect to Xero payroll" },
      { action: "Backup settings", example: "Export all system settings" },
    ],
  },
];

const KNOWN_NAME_KEYS = ["name", "fullName", "displayName", "firstName", "lastName"];

const KNOWN_DEPARTMENT_KEYS = ["department", "Department.name", "team", "division"];

const KNOWN_ROLE_KEYS = ["jobTitle", "role", "position", "title"];

const KNOWN_STATUS_KEYS = ["status", "employmentStatus", "state", "Stage", "type"];

const KNOWN_START_KEYS = ["startDate", "employmentStartDate", "hireDate", "joinDate", "start", "commencementDate"];

const HUMANIZED_KEY_OVERRIDES: Record<string, string> = {
  employeeCount: "Employees",
  totalSalary: "Total Salary",
  averageSalary: "Average Salary",
  maxSalary: "Highest Salary",
  minSalary: "Lowest Salary",
  missingCount: "Missing Records",
  expiringSoon: "Expiring Soon",
};

type MetricDefinition = {
  label: string;
  value: string;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
};

function extractReadableSummary(summary?: string, message?: string): string | undefined {
  if (summary && summary.trim().length > 0) {
    return summary.trim();
  }
  if (!message) return undefined;

  const firstMeaningfulLine = message
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstMeaningfulLine) return undefined;

  return firstMeaningfulLine.replace(/^[#>*`\-\d\.\s]+/, "").trim();
}

function flattenRecord(record: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};

  if (!record || typeof record !== "object") {
    if (prefix) {
      result[prefix] = record;
    }
    return result;
  }

  Object.entries(record).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenRecord(value, nextKey));
    } else {
      result[nextKey] = value;
    }
  });

  return result;
}

function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function deriveValueFromKeys(record: any, keys: string[]): string | undefined {
  if (!record) return undefined;

  for (const key of keys) {
    if (key.includes(".")) {
      const parts = key.split(".");
      let value = record;
      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = (value as any)[part];
        } else {
          value = undefined;
          break;
        }
      }
      if (value !== undefined && value !== null) {
        return String(value);
      }
    } else if (record[key] !== undefined && record[key] !== null) {
      const currentValue = record[key];
      if (typeof currentValue === "string") {
        if (key === "lastName" && record.firstName) {
          return `${record.firstName} ${currentValue}`;
        }
        return currentValue;
      }
      if (typeof currentValue === "number") {
        return currentValue.toString();
      }
    }
  }

  return undefined;
}

function deriveName(record: any): string | undefined {
  const name = deriveValueFromKeys(record, KNOWN_NAME_KEYS);
  if (name) return name;

  if (record?.User) {
    const fromUser = deriveValueFromKeys(record.User, ["fullName", "name", "firstName"]);
    if (fromUser) {
      const last = record.User.lastName ? ` ${record.User.lastName}` : "";
      return `${fromUser}${last}`.trim();
    }
  }

  return undefined;
}

function deriveDepartment(record: any): string | undefined {
  const department = deriveValueFromKeys(record, KNOWN_DEPARTMENT_KEYS);
  if (department) return department;

  if (record?.Department?.name) {
    return record.Department.name;
  }

  return undefined;
}

function deriveRole(record: any): string | undefined {
  return deriveValueFromKeys(record, KNOWN_ROLE_KEYS);
}

function deriveStatus(record: any): string | undefined {
  return deriveValueFromKeys(record, KNOWN_STATUS_KEYS)?.replace(/_/g, " ");
}

function deriveStartDate(record: any): Date | undefined {
  for (const key of KNOWN_START_KEYS) {
    if (record?.[key]) {
      const date = new Date(record[key]);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return undefined;
}

function formatDateLabel(date?: Date): string | undefined {
  if (!date) return undefined;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function humanizeKey(key: string): string {
  if (HUMANIZED_KEY_OVERRIDES[key]) {
    return HUMANIZED_KEY_OVERRIDES[key];
  }

  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getMetricIconForKey(key: string): ComponentType<{ className?: string }> {
  if (/salary|cost|budget|amount/i.test(key)) {
    return BarChart3;
  }
  if (/average|mean|median/i.test(key)) {
    return TrendingUp;
  }
  if (/count|total|employees|people/i.test(key)) {
    return Users;
  }
  if (/expir|upcoming|due/i.test(key)) {
    return Calendar;
  }
  return Target;
}

export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [workflowEditMode, setWorkflowEditMode] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const capabilitiesButtonRef = useRef<HTMLButtonElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [undoInProgress, setUndoInProgress] = useState<string | null>(null);

  // Latest result insight panel state (from main)
  const [latestResult, setLatestResult] = useState<any>(null);
  const [latestResultMeta, setLatestResultMeta] = useState<{
    summary?: string;
    suggestions?: string[];
    actionType?: ActionType;
    prompt?: string;
    timestamp: number;
    message?: string;
  } | null>(null);

  const hasLatestResult = latestResult !== null && latestResult !== undefined;
  const isArrayResult = Array.isArray(latestResult);

  const readableSummary = useMemo(
    () => extractReadableSummary(latestResultMeta?.summary, latestResultMeta?.message),
    [latestResultMeta]
  );

  const arrayPreview = useMemo(() => {
    if (!Array.isArray(latestResult))
      return [] as {
        name: string;
        role?: string;
        department?: string;
        status?: string;
        startDateLabel?: string;
      }[];

    return latestResult.slice(0, 5).map((item, index) => {
      const name = deriveName(item) || `Result ${index + 1}`;
      const role = deriveRole(item);
      const department = deriveDepartment(item);
      const status = deriveStatus(item);
      const startDateLabel = formatDateLabel(deriveStartDate(item));

      return {
        name,
        role: role || undefined,
        department: department || undefined,
        status: status || undefined,
        startDateLabel: startDateLabel || undefined,
      };
    });
  }, [latestResult]);

  const arrayMetrics = useMemo(() => {
    if (!Array.isArray(latestResult)) return [] as MetricDefinition[];

    const metrics: MetricDefinition[] = [];
    const departmentSet = new Set<string>();
    const statusCounts = new Map<string, number>();
    let upcomingStarts = 0;
    const now = new Date();

    latestResult.forEach((item) => {
      const department = deriveDepartment(item);
      if (department) {
        departmentSet.add(department);
      }

      const status = deriveStatus(item);
      if (status) {
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      }

      const startDate = deriveStartDate(item);
      if (startDate) {
        const diffDays = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 60) {
          upcomingStarts += 1;
        }
      }
    });

    metrics.push({
      label: "Total People",
      value: latestResult.length.toLocaleString(),
      helper: "Records in this view",
      icon: Users,
    });

    if (departmentSet.size > 0) {
      metrics.push({
        label: "Departments",
        value: departmentSet.size.toLocaleString(),
        helper: "Represented",
        icon: Briefcase,
      });
    }

    if (upcomingStarts > 0) {
      metrics.push({
        label: "Upcoming Starts",
        value: upcomingStarts.toLocaleString(),
        helper: "Next 60 days",
        icon: Calendar,
      });
    }

    if (statusCounts.size > 0) {
      const [topStatus, topCount] = Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      metrics.push({
        label: "Top Status",
        value: topCount.toLocaleString(),
        helper: topStatus,
        icon: CheckCircle,
      });
    }

    return metrics.slice(0, 4);
  }, [latestResult]);

  const aggregateMetrics = useMemo(() => {
    if (!latestResult || Array.isArray(latestResult) || typeof latestResult !== "object") {
      return [] as MetricDefinition[];
    }

    return Object.entries(latestResult)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .map(([key, value]) => ({
        label: humanizeKey(key),
        value: Number(value).toLocaleString(),
        icon: getMetricIconForKey(key),
        helper: undefined,
      }))
      .slice(0, 6);
  }, [latestResult]);

  const aggregateDetails = useMemo(() => {
    if (!latestResult || Array.isArray(latestResult) || typeof latestResult !== "object") {
      return [] as { label: string; value: string }[];
    }

    return Object.entries(latestResult)
      .filter(([, value]) => typeof value === "string" || typeof value === "boolean" || value === null || value === undefined)
      .map(([key, value]) => ({
        label: humanizeKey(key),
        value: value === null || value === undefined ? "—" : String(value),
      }))
      .slice(0, 6);
  }, [latestResult]);

  const primitiveResult = useMemo(() => {
    if (!hasLatestResult) return undefined;
    if (Array.isArray(latestResult)) return undefined;

    if (typeof latestResult === "number") {
      return latestResult.toLocaleString();
    }
    if (typeof latestResult === "boolean") {
      return latestResult ? "Yes" : "No";
    }
    if (typeof latestResult === "string") {
      return latestResult;
    }

    return undefined;
  }, [hasLatestResult, latestResult]);

  const followUpSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    (latestResultMeta?.suggestions || []).forEach((item) => {
      if (item) suggestions.add(item);
    });

    if ((latestResultMeta?.actionType || "") === "query") {
      suggestions.add("Can you break this down by department?");
      suggestions.add("Who should follow up with these employees?");
    }

    if (Array.isArray(latestResult) && latestResult.length > 0) {
      suggestions.add("Show me more details for the next group");
    }

    return Array.from(suggestions).slice(0, 3);
  }, [latestResult, latestResultMeta]);

  const shouldShowFollowUps = followUpSuggestions.length > 0 || latestResultMeta?.actionType === "query";

  const insightTitle = useMemo(() => {
    if (!latestResultMeta?.prompt) return "Latest Insight";
    const trimmed = latestResultMeta.prompt.trim();
    if (trimmed.length === 0) return "Latest Insight";
    const maxLength = 80;
    const label = trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
    return `Results for “${label}”`;
  }, [latestResultMeta?.prompt]);

  const lastUpdatedLabel = useMemo(() => {
    if (!latestResultMeta?.timestamp) return undefined;
    const date = new Date(latestResultMeta.timestamp);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [latestResultMeta]);

  const handlePrefillPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleExportResult = () => {
    if (!hasLatestResult) return;

    try {
      if (typeof window === "undefined") return;

      let blob: Blob;
      let filename = `ai-result-${new Date().toISOString().slice(0, 10)}`;

      if (Array.isArray(latestResult)) {
        const rows = latestResult.map((item) => flattenRecord(item));
        const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

        if (headers.length === 0) {
          blob = new Blob([JSON.stringify(latestResult, null, 2)], {
            type: "application/json;charset=utf-8;",
          });
          filename += ".json";
        } else {
          const csvLines = [headers.join(",")];
          rows.forEach((row) => {
            const line = headers.map((header) => escapeCsvValue(row[header])).join(",");
            csvLines.push(line);
          });
          blob = new Blob([csvLines.join("\n")], {
            type: "text/csv;charset=utf-8;",
          });
          filename += ".csv";
        }
      } else {
        const content = typeof latestResult === "string" ? latestResult : JSON.stringify(latestResult, null, 2);
        blob = new Blob([content], {
          type: "application/json;charset=utf-8;",
        });
        filename += ".json";
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Export ready—check your downloads.");
    } catch (error) {
      toast.error("Couldn't export results. Please try again.");
      console.error("Export error", error);
    }
  };

  // Track if component is mounted (for portal)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (showCapabilities && capabilitiesButtonRef.current) {
      const rect = capabilitiesButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showCapabilities]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // File upload handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploadedFiles((prev) => [...prev, ...files]);

    // Auto-trigger conversation about the files
    const fileNames = files.map((f) => f.name).join(", ");
    const message =
      files.length === 1
        ? `I've uploaded ${files[0].name}. What should I do with it?`
        : `I've uploaded ${files.length} files: ${fileNames}. What should I do with them?`;

    setTimeout(() => handleSendMessage(message), 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const createAssistantMessage = (data: any): Message => ({
    id: `assistant-${Date.now()}`,
    role: "assistant",
    content: data.message || "",
    timestamp: new Date(),
    actionType: data.actionType,
    result: data.result,
    suggestions: data.suggestions,
    summary: data.summary,
    requiresConfirmation: data.requiresConfirmation,
    preview: data.preview,
    undoable: data.undoable,
    undoId: data.undoId,
    chartConfig: data.chartConfig,
  });

  const buildFriendlyErrorMessage = (error: any) => {
    const rawMessage =
      typeof error?.message === "string" ? error.message : typeof error === "string" ? error : "";
    const errorMsg = rawMessage.toLowerCase();

    if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
      const resetTime = new Date(Date.now() + 3600000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        friendlyMessage: `🕐 **You're using AI Assistant really well!**

We've hit our hourly limit to keep costs manageable. This resets at ${resetTime}.

**What you can do now:**
✅ Save your current conversation
✅ Check out the Workflow Library (no limits!)
✅ Come back in an hour to continue

*Tip: You can ask up to 100 questions per hour.*`,
        toastMessage: "Rate limit reached - take a quick break!",
      };
    }

    if (errorMsg.includes("api key") || errorMsg.includes("401") || errorMsg.includes("403")) {
      return {
        friendlyMessage: `🔑 **Hmm, there's a setup issue...**

The AI features haven't been fully configured yet. This is quick to fix!

**What needs to happen:**
✅ An admin needs to add the OpenAI API key
✅ Takes about 5 minutes to set up

*Want to set this up? Check the SETUP_AI_ASSISTANT.md guide or contact your IT team.*`,
        toastMessage: "Something went wrong - try refreshing",
      };
    }

    if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
      return {
        friendlyMessage: `🌐 **Connection hiccup...**

It looks like there's a network issue. This usually fixes itself!

**Try these:**
✅ Check your internet connection
✅ Refresh the page
✅ Try your question again

*Still having issues? Contact support.*`,
        toastMessage: "Something went wrong - try refreshing",
      };
    }

    return {
      friendlyMessage: `😅 **Oops, something unexpected happened!**

Don't worry - your data is safe. This is likely a temporary glitch.

**What to try:**
✅ Rephrase your question
✅ Try a simpler query first
✅ Refresh the page

*Error details for support: ${rawMessage}*`,
      toastMessage: "Something went wrong - try refreshing",
    };
  };

  const handleSendMessage = async (messageText: string = input) => {
    if (!messageText.trim() || isProcessing) return;

    // Hide welcome screen once user starts chatting
    setShowWelcome(false);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    // Add loading message
    const loadingMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "Thinking...",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Unified orchestrator endpoint
      let res;

      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        formData.append("message", messageText);
        uploadedFiles.forEach((file, idx) => {
          formData.append(`file_${idx}`, file);
        });

        res = await fetch("/api/ai/chat", {
          method: "POST",
          body: formData,
        });

        // Clear uploaded files after sending
        setUploadedFiles([]);
      } else {
        res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageText }),
        });
      }

      const data = await res.json();

      // Handle errors from API
      if (!data?.success) {
        // Handle clarification needed for workflows
        if (data.error === "CLARIFICATION_NEEDED" || data.error === "BULK_ACTION_CLARIFICATION_NEEDED" || data.error === "REPORT_CLARIFICATION_NEEDED" || data.error === "EMAIL_DELIVERY_CLARIFICATION_NEEDED" || data.error === "EMPLOYEE_MANAGEMENT_CLARIFICATION_NEEDED" || data.error === "LEAVE_MANAGEMENT_CLARIFICATION_NEEDED" || data.error === "ONBOARDING_CLARIFICATION_NEEDED" || data.error === "DOCUMENT_MANAGEMENT_CLARIFICATION_NEEDED" || data.error === "APPROVAL_WORKFLOW_CLARIFICATION_NEEDED") {
          // Remove loading message and add clarification response
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== loadingMessage.id);
            return [
              ...filtered,
              createAssistantMessage({
                message: data.clarification,
                actionType: "info",
              }),
            ];
          });
          return;
        }
        throw new Error(data?.message || data?.error || "Request failed");
      }

      // Workflows show in visual editor
      if (data.actionType === "workflow" && data.result) {
        setGeneratedWorkflow(data.result);
      }

      // Update latest result panel ONLY for query results (not confirmations or single updates)
      const shouldUpdatePanel = 
        data.actionType === "query" || 
        data.actionType === "compliance_sweep" || 
        data.actionType === "analytics_digest" ||
        (Array.isArray(data.result) && data.result.length > 0);
      
      // Don't update panel for simple confirmations like "yes"
      const isSimpleConfirmation = /^(yes|no|yep|nope|ya|nah|ok|okay|confirm|cancel)$/i.test(messageText.trim());
      
      if (shouldUpdatePanel && !isSimpleConfirmation) {
        setLatestResult(data.result ?? null);
        setLatestResultMeta({
          summary: data.summary,
          suggestions: data.suggestions,
          actionType: data.actionType,
          prompt: messageText,
          timestamp: Date.now(),
          message: data.message,
        });
      }

      // Remove loading message and add response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [
          ...filtered,
          createAssistantMessage({
            ...data,
            actionType: (data.actionType as ActionType) || "info",
          }),
        ];
      });
    } catch (error: any) {
      const { friendlyMessage, toastMessage } = buildFriendlyErrorMessage(error);

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: friendlyMessage,
            timestamp: new Date(),
          },
        ];
      });

      // Still show toast but friendlier
      toast.error(toastMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = async (undoId?: string) => {
    if (!undoId || isProcessing || undoInProgress) return;

    setIsProcessing(true);
    setUndoInProgress(undoId);

    const loadingMessage: Message = {
      id: `assistant-undo-${Date.now()}`,
      role: "assistant",
      content: "Reverting change...",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo", undoId }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || data.error || "Undo failed");
      }

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [...filtered, createAssistantMessage(data)];
      });
    } catch (error: any) {
      const { friendlyMessage, toastMessage } = buildFriendlyErrorMessage(error);

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: friendlyMessage,
            timestamp: new Date(),
          },
        ];
      });

      toast.error(toastMessage);
    } finally {
      setIsProcessing(false);
      setUndoInProgress(null);
    }
  };

  const formatLabel = (label: string) =>
    label
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/(^|\s)([a-z])/g, (_, space, char) => `${space}${char.toUpperCase()}`);

  const formatPrimitiveValue = (value: any) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    return String(value);
  };

  const renderPreviewContent = (preview: any): ReactNode => {
    if (preview === null || preview === undefined) {
      return <span className="text-sm text-foreground">—</span>;
    }

    const renderChanges = (changes: any[]): ReactNode => {
      if (!Array.isArray(changes) || changes.length === 0) return null;

      return (
        <div className="space-y-2">
          {changes.slice(0, 5).map((change, idx) => {
            const { name, displayCurrent, displayNew, currentValue, newValue, change: delta, ...rest } = change || {};

            return (
              <div key={`${name || idx}-${idx}`} className="rounded-md border border-muted/40 bg-muted/30 p-2">
                {name && <div className="text-sm font-medium text-foreground">{name}</div>}
                {(displayCurrent !== undefined || currentValue !== undefined) && (
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Current</span>
                    <span className="font-medium text-foreground">
                      {formatPrimitiveValue(displayCurrent ?? currentValue)}
                    </span>
                  </div>
                )}
                {(displayNew !== undefined || newValue !== undefined) && (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>New</span>
                    <span className="font-medium text-foreground">{formatPrimitiveValue(displayNew ?? newValue)}</span>
                  </div>
                )}
                {delta !== undefined && (
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>Change</span>
                    <span className="font-medium text-foreground">{formatPrimitiveValue(delta)}</span>
                  </div>
                )}
                {Object.entries(rest || {})
                  .filter(([key]) => key !== "employeeId")
                  .map(([key, value]) => (
                    <div key={key} className="mt-1 flex flex-col rounded-md border border-muted/30 bg-background/60 px-2 py-1 text-[11px]">
                      <span className="font-semibold uppercase tracking-wide text-muted-foreground">{formatLabel(key)}</span>
                      <div className="text-xs text-foreground">
                        {typeof value === "object" && value !== null ? renderPreviewContent(value) : formatPrimitiveValue(value)}
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}
          {changes.length > 5 && <div className="text-xs text-muted-foreground">+{changes.length - 5} more changes</div>}
        </div>
      );
    };

    if (Array.isArray(preview)) {
      return (
        <div className="space-y-2">
          {preview.map((item, idx) => (
            <div key={idx} className="rounded-md border border-muted/40 bg-muted/30 p-2 text-sm text-foreground">
              {typeof item === "object" && item !== null ? (
                <div className="grid gap-1">
                  {Object.entries(item).map(([key, value]) => (
                    <div key={key} className="flex flex-col rounded-md border border-muted/30 bg-background/60 px-2 py-1 text-xs">
                      <span className="font-semibold uppercase tracking-wide text-muted-foreground">{formatLabel(key)}</span>
                      <div className="text-sm text-foreground">
                        {typeof value === "object" && value !== null ? renderPreviewContent(value) : formatPrimitiveValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span>{formatPrimitiveValue(item)}</span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (typeof preview === "object") {
      const previewObj = preview as Record<string, any>;

      if (Array.isArray(previewObj.changes)) {
        const { changes, ...rest } = previewObj;

        return (
          <div className="space-y-3">
            {Object.keys(rest).length > 0 && (
              <div className="grid gap-2">
                {Object.entries(rest).map(([key, value]) => (
                  <div key={key} className="flex flex-col rounded-md border border-muted/40 bg-muted/20 p-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatLabel(key)}</span>
                    <div className="text-sm text-foreground mt-1">
                      {typeof value === "object" && value !== null ? renderPreviewContent(value) : formatPrimitiveValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Changes</div>
              {renderChanges(changes)}
            </div>
          </div>
        );
      }

      if (Array.isArray(previewObj.fields)) {
        const { fields, ...rest } = previewObj;

        return (
          <div className="space-y-3">
            {Object.keys(rest).length > 0 && (
              <div className="grid gap-2">
                {Object.entries(rest).map(([key, value]) => (
                  <div key={key} className="flex flex-col rounded-md border border-muted/40 bg-muted/20 p-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatLabel(key)}</span>
                    <div className="text-sm text-foreground mt-1">
                      {typeof value === "object" && value !== null ? renderPreviewContent(value) : formatPrimitiveValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Fields</div>
              <ul className="space-y-1 text-sm text-foreground">
                {fields.map((field: any, idx: number) => (
                  <li key={idx} className="flex items-center justify-between gap-2 rounded-md border border-muted/30 bg-muted/20 px-2 py-1">
                    <span className="font-medium">{field?.label || `Field ${idx + 1}`}</span>
                    {field?.type && (
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {formatPrimitiveValue(field.type)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      }

      return (
        <div className="grid gap-2">
          {Object.entries(previewObj).map(([key, value]) => (
            <div key={key} className="flex flex-col rounded-md border border-muted/40 bg-muted/20 p-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatLabel(key)}</span>
              <div className="text-sm text-foreground mt-1">
                {typeof value === "object" && value !== null ? renderPreviewContent(value) : formatPrimitiveValue(value)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-sm text-foreground">{formatPrimitiveValue(preview)}</span>;
  };

  const renderPreviewCard = (preview: any): ReactNode => {
    if (!preview) return null;

    return (
      <div className="rounded-lg border border-muted bg-background p-3 shadow-sm" role="region" aria-label="Proposed changes preview" tabIndex={0}>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Preview</div>
        <div className="space-y-2 text-sm text-foreground" aria-live="polite">
          {renderPreviewContent(preview)}
        </div>
      </div>
    );
  };

  const _detectActionType = (text: string): ActionType => {
    const lower = text.toLowerCase();
    if (lower.includes("how many") || lower.includes("show me") || lower.includes("list") || lower.includes("find") || lower.includes("count")) {
      return "query";
    }
    if (lower.includes("workflow") || lower.includes("automat") || lower.includes("alert") || lower.includes("remind") || lower.includes("trigger")) {
      return "workflow";
    }
    if (lower.includes("add field") || lower.includes("create field") || lower.includes("new field") || lower.includes("custom field")) {
      return "field";
    }
    
    // Check for workflow capability discovery questions
    if (lower.includes("what triggers") || lower.includes("trigger types") || lower.includes("what actions") || 
        lower.includes("action types") || lower.includes("how do i filter") || lower.includes("conditions") ||
        lower.includes("error handling") || lower.includes("parallel") || lower.includes("simultaneously") ||
        lower.includes("node capabilities") || lower.includes("workflow features")) {
      return "workflow";
    }
    
    // Check for bulk action requests
    if (lower.includes("christmas shutdown") || lower.includes("holiday shutdown") || lower.includes("company shutdown") ||
        lower.includes("book") && (lower.includes("everyone") || lower.includes("all")) && lower.includes("off") ||
        lower.includes("mass leave") || lower.includes("bulk leave") || lower.includes("everyone off") ||
        lower.includes("office closed") || lower.includes("company holiday") || lower.includes("annual shutdown")) {
      return "workflow";
    }
    
    // Check for email delivery requests
    if (lower.includes("email") && (lower.includes("report") || lower.includes("pdf") || lower.includes("excel") || lower.includes("csv")) ||
        lower.includes("send") && (lower.includes("report") || lower.includes("pdf") || lower.includes("excel") || lower.includes("csv")) ||
        lower.includes("attach") && lower.includes("report") || lower.includes("email") && lower.includes("attachment") ||
        lower.includes("email") && lower.includes("to") && (lower.includes("manager") || lower.includes("hr") || lower.includes("team") || lower.includes("department")) ||
        lower.includes("via") && lower.includes("email") || lower.includes("email") && lower.includes("format")) {
      return "workflow";
    }
    
    // Check for employee management requests
    if (lower.includes("add") && lower.includes("employee") || lower.includes("hire") && lower.includes("employee") ||
        lower.includes("new") && lower.includes("employee") || lower.includes("create") && lower.includes("employee") ||
        lower.includes("employee") && lower.includes("profile") || lower.includes("update") && lower.includes("employee") ||
        lower.includes("edit") && lower.includes("employee") || lower.includes("employee") && lower.includes("information") ||
        lower.includes("employee") && lower.includes("details") || lower.includes("employee") && lower.includes("management") ||
        lower.includes("manage") && lower.includes("employees") || lower.includes("employee") && lower.includes("directory") ||
        lower.includes("find") && lower.includes("employee") || lower.includes("search") && lower.includes("employee")) {
      return "workflow";
    }
    
    // Check for leave management requests
    if (lower.includes("leave") && lower.includes("request") || lower.includes("request") && lower.includes("leave") ||
        lower.includes("book") && lower.includes("leave") || lower.includes("apply") && lower.includes("leave") ||
        lower.includes("holiday") && lower.includes("request") || lower.includes("time") && lower.includes("off") ||
        lower.includes("vacation") && lower.includes("request") || lower.includes("sick") && lower.includes("leave") ||
        lower.includes("approve") && lower.includes("leave") || lower.includes("reject") && lower.includes("leave") ||
        lower.includes("leave") && lower.includes("approval") || lower.includes("leave") && lower.includes("balance") ||
        lower.includes("leave") && lower.includes("entitlement") || lower.includes("leave") && lower.includes("policy") ||
        lower.includes("leave") && lower.includes("calendar") || lower.includes("leave") && lower.includes("management")) {
      return "workflow";
    }
    
    // Check for onboarding/offboarding requests
    if (lower.includes("onboard") && lower.includes("employee") || lower.includes("employee") && lower.includes("onboarding") ||
        lower.includes("new") && lower.includes("hire") || lower.includes("welcome") && lower.includes("employee") ||
        lower.includes("onboarding") && lower.includes("process") || lower.includes("onboarding") && lower.includes("workflow") ||
        lower.includes("offboard") && lower.includes("employee") || lower.includes("employee") && lower.includes("offboarding") ||
        lower.includes("exit") && lower.includes("interview") || lower.includes("departure") || lower.includes("leaving") && lower.includes("employee") ||
        lower.includes("resignation") || lower.includes("termination") || lower.includes("offboarding") && lower.includes("process")) {
      return "workflow";
    }
    
    // Check for document management requests
    if (lower.includes("upload") && lower.includes("document") || lower.includes("document") && lower.includes("upload") ||
        lower.includes("add") && lower.includes("document") || lower.includes("create") && lower.includes("document") ||
        lower.includes("document") && lower.includes("management") || lower.includes("manage") && lower.includes("documents") ||
        lower.includes("document") && lower.includes("types") || lower.includes("document") && lower.includes("categories") ||
        lower.includes("document") && lower.includes("expiry") || lower.includes("expiry") && lower.includes("alert") ||
        lower.includes("document") && lower.includes("expiration") || lower.includes("expired") && lower.includes("document") ||
        lower.includes("document") && lower.includes("compliance") || lower.includes("policy") && lower.includes("document") ||
        lower.includes("employee") && lower.includes("documents") || lower.includes("contract") && lower.includes("document")) {
      return "workflow";
    }
    
    // Check for approval workflow requests
    if (lower.includes("approval") && lower.includes("workflow") || lower.includes("workflow") && lower.includes("approval") ||
        lower.includes("approve") && lower.includes("workflow") || lower.includes("approval") && lower.includes("process") ||
        lower.includes("multi") && lower.includes("level") && lower.includes("approval") || lower.includes("approval") && lower.includes("chain") ||
        lower.includes("pending") && lower.includes("approval") || lower.includes("approval") && lower.includes("queue") ||
        lower.includes("approval") && lower.includes("status") || lower.includes("approval") && lower.includes("rules") ||
        lower.includes("approval") && lower.includes("policy") || lower.includes("approval") && lower.includes("matrix")) {
      return "workflow";
    }
    
    // Check for report requests
    if (lower.includes("create") && lower.includes("report") || lower.includes("generate") && lower.includes("report") ||
        lower.includes("make") && lower.includes("report") || lower.includes("build") && lower.includes("report") ||
        lower.includes("show") && lower.includes("report") || lower.includes("report") && (lower.includes("on") || lower.includes("about") || lower.includes("for")) ||
        lower.includes("analytics") || lower.includes("dashboard") || lower.includes("summary") && lower.includes("report") ||
        lower.includes("monthly") && lower.includes("report") || lower.includes("quarterly") && lower.includes("report") ||
        lower.includes("annual") && lower.includes("report") || lower.includes("weekly") && lower.includes("report") ||
        lower.includes("daily") && lower.includes("report") || lower.includes("employee") && lower.includes("report") ||
        lower.includes("hr") && lower.includes("report") || lower.includes("performance") && lower.includes("report") ||
        lower.includes("attendance") && lower.includes("report") || lower.includes("leave") && lower.includes("report") ||
        lower.includes("payroll") && lower.includes("report") || lower.includes("turnover") && lower.includes("report") ||
        lower.includes("headcount") && lower.includes("report") || lower.includes("export") && lower.includes("data") ||
        lower.includes("download") && lower.includes("report") || lower.includes("view") && lower.includes("data") ||
        lower.includes("display") && lower.includes("data") || lower.includes("visualize") && lower.includes("data") ||
        lower.includes("chart") && lower.includes("data") || lower.includes("graph") && lower.includes("data")) {
      return "workflow";
    }
    
    return "info";
  };

  const _handleQuery = async (prompt: string) => {
    const res = await fetch("/api/ai/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: prompt }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Query failed");
    }

    // Create plain English summary
    let summary = "";
    if (data.count !== undefined) {
      if (data.count === 0) {
        summary = "✅ Great news! No issues found.";
      } else if (data.count === 1) {
        summary = `✅ Found 1 result`;
      } else {
        summary = `✅ Found ${data.count} results`;
      }
    }

    let content = `${summary ? summary + "\n\n" : ""}${data.explanation}`;

    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      content += `\n\nShowing ${Math.min(data.data.length, 10)} of ${data.data.length} total records.`;
    }

    // Generate follow-up suggestions based on query type
    const suggestions = generateFollowUpSuggestions(prompt, data);

    return { content, result: data, suggestions, summary };
  };

  const generateFollowUpSuggestions = (prompt: string, _data: any): string[] => {
    const lower = prompt.toLowerCase();
    const suggestions: string[] = [];

    // Context-aware suggestions based on the query
    if (lower.includes("ird") || lower.includes("tax")) {
      suggestions.push("Create a reminder workflow for missing IRD numbers");
      suggestions.push("Show me their departments");
      suggestions.push("Export this list to share with payroll");
    } else if (lower.includes("contract") || lower.includes("expir")) {
      suggestions.push("Create an alert workflow 60 days before contracts expire");
      suggestions.push("Show me which departments are affected");
      suggestions.push("Email these employees to discuss renewal");
    } else if (lower.includes("start") || lower.includes("new")) {
      suggestions.push("Create onboarding workflow for new starters");
      suggestions.push("Show me their assigned managers");
      suggestions.push("Add welcome task for new employees");
    } else if (lower.includes("leave") || lower.includes("absence")) {
      suggestions.push("Show me leave patterns by department");
      suggestions.push("Check which teams might be understaffed");
      suggestions.push("Create coverage workflow for team absences");
    } else {
      // Generic helpful suggestions
      suggestions.push("Create a workflow to automate this");
      suggestions.push("Show me more details");
      suggestions.push("Export this data");
    }

    return suggestions.slice(0, 3); // Max 3 suggestions
  };

  const _handleWorkflow = async (prompt: string) => {
    // Check if this is a discovery question about workflow capabilities
    const isDiscoveryQuery = prompt.toLowerCase().includes('what triggers') || 
                            prompt.toLowerCase().includes('what actions') ||
                            prompt.toLowerCase().includes('how do i filter') ||
                            prompt.toLowerCase().includes('error handling') ||
                            prompt.toLowerCase().includes('parallel') ||
                            prompt.toLowerCase().includes('node capabilities');
    
    if (isDiscoveryQuery) {
      // Handle discovery queries
      const res = await fetch("/api/ai/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover", prompt }),
      });

      const data = await res.json();

      if (data.success) {
        return {
          content: data.response,
          actionType: "info" as ActionType,
          suggestions: data.suggestions,
        };
      } else {
        return {
          content: data.response || "I'd be happy to help you learn about workflow capabilities! You can ask me about triggers, actions, conditions, error handling, parallel processing, or any other workflow topics.",
          actionType: "info" as ActionType,
        };
      }
    }
    
    // Handle regular workflow generation
    const res = await fetch("/api/ai/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", prompt }),
    });

    const data = await res.json();

    if (!data.success) {
      // Handle clarification needed
      if (data.error === "CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      // Handle bulk action clarification needed
      if (data.error === "BULK_ACTION_CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      // Handle report clarification needed
      if (data.error === "REPORT_CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      // Handle email delivery clarification needed
      if (data.error === "EMAIL_DELIVERY_CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      // Handle employee management clarification needed
      if (data.error === "EMPLOYEE_MANAGEMENT_CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      // Handle leave management clarification needed
      if (data.error === "LEAVE_MANAGEMENT_CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      // Handle onboarding clarification needed
      if (data.error === "ONBOARDING_CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      // Handle document management clarification needed
      if (data.error === "DOCUMENT_MANAGEMENT_CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      // Handle approval workflow clarification needed
      if (data.error === "APPROVAL_WORKFLOW_CLARIFICATION_NEEDED") {
        return {
          content: data.clarification,
          actionType: "info" as ActionType,
        };
      }
      throw new Error(data.error || "Workflow generation failed");
    }

    setGeneratedWorkflow(data.workflow);

    return {
      content: `✅ **Workflow Generated!**\n\n**${data.workflow.name}**\n\n${data.explanation || data.workflow.description}\n\n**Workflow Details:**\n• **Category:** ${data.workflow.category || 'Custom'}\n• **Time Saved:** ${data.workflow.estimatedTime || 'Varies per execution'}\n• **Nodes:** ${data.workflow.nodes?.length || 0} steps\n• **Connections:** ${data.workflow.edges?.length || 0} links\n\nI've created a visual workflow on the right. Review it and click "Save Workflow" when ready.`,
      result: data.workflow,
    };
  };

  const _handleField = async (prompt: string) => {
    const res = await fetch("/api/ai/field", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        description: prompt,
        section: "custom",
      }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Field generation failed");
    }

    return {
      content: `✅ **Field Created!**\n\n${data.message}\n\n**Field Details:**\n- Label: ${data.field.label}\n- Type: ${data.field.type}\n- Form: ${data.formId}\n\nYou can find it in the employee's personal information screen.`,
      result: data.field,
    };
  };

  const handleSaveWorkflow = async () => {
    if (!generatedWorkflow) return;

    try {
      const res = await fetch("/api/ai/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          workflow: generatedWorkflow,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Workflow saved! Check Automation Rules to activate it.");
        setGeneratedWorkflow(null);
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch (error) {
      toast.error("Error saving workflow");
    }
  };

  // Check if AI is enabled - only ADMIN and SUPER_ADMIN can access
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) {
    return (
      <PageShell title="AI Assistant" icon={<Bot className="w-6 h-6" />}>
        <div className="flex items-center justify-center h-96">
          <Card className="p-6 max-w-md text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground">AI Assistant features are only available to administrators.</p>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="AI Assistant"
      description="Natural language HR automation powered by AI"
      icon={<Bot className="w-6 h-6" />}
      action={
        <>
          <Button
            ref={capabilitiesButtonRef}
            size="sm"
            onClick={() => setShowCapabilities(!showCapabilities)}
            className="gap-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            What can I do?
            <ChevronDown className={`w-4 h-4 transition-transform ${showCapabilities ? "rotate-180" : ""}`} />
          </Button>

          {/* Render dropdown via portal to escape stacking context */}
          {isMounted &&
            showCapabilities &&
            createPortal(
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/20 z-[9998]" onClick={() => setShowCapabilities(false)} />
                {/* Dropdown */}
                <div
                  className="fixed w-[600px] max-h-[calc(100vh-200px)] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999]"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    right: `${dropdownPosition.right}px`,
                  }}
                >
                  <div className="sticky top-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white p-4 rounded-t-xl z-10">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Assistant Capabilities
                    </h3>
                    <p className="text-sm text-white/90 mt-1">
                      Click any example to try it instantly •{" "}
                      {AI_CAPABILITIES.reduce((sum, cat) => sum + cat.capabilities.length, 0)} actions available
                    </p>
                  </div>

                  <div className="p-4 space-y-3">
                    {AI_CAPABILITIES.map((category, idx) => (
                      <div key={idx} className="pb-3 border-b last:border-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center text-white shadow-md flex-shrink-0`}
                          >
                            {category.icon}
                          </div>
                          <h4 className="font-semibold text-sm flex-1">{category.category}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {category.capabilities.length}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {category.capabilities.map((cap, capIdx) => (
                            <button
                              key={capIdx}
                              onClick={() => {
                                handleSendMessage(cap.example);
                                setShowCapabilities(false);
                              }}
                              className="text-left p-2 rounded-lg hover:bg-muted transition-colors group"
                            >
                              <div className="flex items-start gap-2">
                                <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs text-foreground group-hover:text-primary transition-colors">
                                    {cap.action}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5 italic truncate">
                                    &ldquo;{cap.example}&rdquo;
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="sticky bottom-0 bg-gradient-to-t from-muted/90 to-transparent p-4 text-center rounded-b-xl backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>Pro tip:</strong> You can also type naturally - AI understands context!
                    </p>
                  </div>
                </div>
              </>,
              document.body
            )}
        </>
      }
    >
      <div className="flex h-[calc(100vh-10rem)] gap-4 max-w-[1800px] mx-auto">
        {/* Left: Chat Interface */}
        <div
          className="w-1/2 flex flex-col min-h-0 h-full relative"
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-primary animate-bounce" />
                <p className="text-lg font-semibold text-primary">Drop your document here</p>
                <p className="text-sm text-muted-foreground mt-2">I&apos;ll help you assign it to an employee</p>
              </div>
            </div>
          )}

          <div className="flex flex-col h-full border rounded-lg bg-card shadow-sm">
            {/* Welcome Screen */}
            {showWelcome && messages.length === 0 ? (
              <div className="flex-1 overflow-y-auto p-4">
                {/* Hero Section */}
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 mb-2 shadow-lg">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-lg font-bold mb-1 bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Welcome to AI Assistant
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Ask questions, build workflows, and customise your system in plain English.
                  </p>
                </div>

                {/* Capability Cards */}
                <div className="space-y-2.5 mb-3">
                  {CAPABILITY_CATEGORIES.map((category) => (
                    <div
                      key={category.id}
                      className="group border rounded-lg p-3 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white shadow-sm`}
                        >
                          {category.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[13px] mb-1.5 group-hover:text-primary transition-colors leading-tight">
                            {category.title}
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {category.examples.slice(0, 2).map((example, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(example)}
                                className="text-[10px] px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 transition-colors group/btn"
                                title={example}
                              >
                                <span className="block max-w-[200px] truncate">{example}</span>
                              </button>
                            ))}
                            {/* Show bulk action examples for workflow category */}
                            {category.id === "workflows" && category.bulkExamples && (
                              <>
                                <div className="w-full border-t border-muted/30 my-1"></div>
                                <div className="w-full text-[9px] text-muted-foreground mb-1">🎄 Bulk Actions:</div>
                                {category.bulkExamples.slice(0, 2).map((bulkExample, idx) => (
                                  <button
                                    key={`bulk-${idx}`}
                                    onClick={() => handleSendMessage(bulkExample)}
                                    className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors group/btn"
                                    title={bulkExample}
                                  >
                                    <span className="block max-w-[180px] truncate">{bulkExample}</span>
                                  </button>
                                ))}
                              </>
                            )}
                            
                            {/* Show HR examples for workflow category */}
                            {category.id === "workflows" && category.hrExamples && (
                              <>
                                <div className="w-full border-t border-muted/30 my-1"></div>
                                <div className="w-full text-[9px] text-muted-foreground mb-1">👥 HR Operations:</div>
                                {category.hrExamples.slice(0, 2).map((hrExample, idx) => (
                                  <button
                                    key={`hr-${idx}`}
                                    onClick={() => handleSendMessage(hrExample)}
                                    className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors group/btn"
                                    title={hrExample}
                                  >
                                    <span className="block max-w-[180px] truncate">{hrExample}</span>
                                  </button>
                                ))}
                              </>
                            )}
                            
                            {/* Show email delivery examples for workflow category */}
                            {category.id === "workflows" && category.emailExamples && (
                              <>
                                <div className="w-full border-t border-muted/30 my-1"></div>
                                <div className="w-full text-[9px] text-muted-foreground mb-1">📧 Email Delivery:</div>
                                {category.emailExamples.slice(0, 2).map((emailExample, idx) => (
                                  <button
                                    key={`email-${idx}`}
                                    onClick={() => handleSendMessage(emailExample)}
                                    className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors group/btn"
                                    title={emailExample}
                                  >
                                    <span className="block max-w-[180px] truncate">{emailExample}</span>
                                  </button>
                                ))}
                              </>
                            )}
                            
                            {/* Show report examples for workflow category */}
                            {category.id === "workflows" && category.reportExamples && (
                              <>
                                <div className="w-full border-t border-muted/30 my-1"></div>
                                <div className="w-full text-[9px] text-muted-foreground mb-1">📊 Reports & Analytics:</div>
                                {category.reportExamples.slice(0, 2).map((reportExample, idx) => (
                                  <button
                                    key={`report-${idx}`}
                                    onClick={() => handleSendMessage(reportExample)}
                                    className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors group/btn"
                                    title={reportExample}
                                  >
                                    <span className="block max-w-[180px] truncate">{reportExample}</span>
                                  </button>
                                ))}
                              </>
                            )}
                            
                            {/* Show discovery examples for workflow category */}
                            {category.id === "workflows" && category.discovery && (
                              <>
                                <div className="w-full border-t border-muted/30 my-1"></div>
                                <div className="w-full text-[9px] text-muted-foreground mb-1">💡 Learn about capabilities:</div>
                                {category.discovery.slice(0, 2).map((discovery, idx) => (
                                  <button
                                    key={`discovery-${idx}`}
                                    onClick={() => handleSendMessage(discovery)}
                                    className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors group/btn"
                                    title={discovery}
                                  >
                                    <span className="block max-w-[180px] truncate">{discovery}</span>
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Start Tips */}
                <div className="border-t pt-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-medium">Pro Tips</span>
                  </div>
                  <ul className="text-[10px] text-muted-foreground space-y-1">
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 text-primary" />
                      <span>Be specific for best results</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 text-primary" />
                      <span>Ask follow-ups to refine</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ArrowRight className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 text-primary" />
                      <span>Fields added instantly!</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Messages */
              <div className="flex-1 p-4 space-y-4 overflow-auto">
                {messages.map((msg) => {
                  const isAssistant = msg.role === "assistant";

                  return (
                    <div key={msg.id} className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] ${isAssistant ? "space-y-2" : ""}`}>
                        <div className={`rounded-lg p-3 ${isAssistant ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                          {msg.isLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Thinking...</span>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                          )}
                        </div>

                        {isAssistant && !msg.isLoading && (
                          <div className="space-y-2">
                            {msg.chartConfig && (
                              <div className="mt-2">
                                <DataVisualization config={msg.chartConfig} />
                              </div>
                            )}

                            {msg.preview && <div>{renderPreviewCard(msg.preview)}</div>}

                            {msg.requiresConfirmation && (
                              <div className="flex flex-wrap gap-2" role="group" aria-label="Confirm or cancel proposed action">
                                <Button
                                  size="sm"
                                  onClick={() => handleSendMessage("yes")}
                                  disabled={isProcessing}
                                  aria-label="Confirm this action"
                                  type="button"
                                  autoFocus
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendMessage("no")}
                                  disabled={isProcessing}
                                  aria-label="Cancel this action"
                                  type="button"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}

                            {msg.undoable && msg.undoId && (
                              <div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUndo(msg.undoId)}
                                  disabled={isProcessing || undoInProgress === msg.undoId}
                                  aria-label="Undo this change"
                                  type="button"
                                >
                                  {undoInProgress === msg.undoId ? (
                                    <span className="flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Undoing...
                                    </span>
                                  ) : (
                                    "Undo"
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Quick Actions Bar */}
            {!showWelcome && (
              <div className="border-t p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Quick Actions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action.label}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendMessage(action.prompt)}
                      disabled={isProcessing}
                      className={`text-xs ${action.color}`}
                    >
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </Button>
                  ))}
                </div>
                
                {/* CSV Import Assistant */}
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-800">CSV Import Assistant</span>
                  </div>
                  <p className="text-xs text-green-700 mb-2">
                    Get help with importing employee data, generating templates, and troubleshooting import issues.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendMessage("Help me with CSV import")}
                      disabled={isProcessing}
                      className="text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    >
                      <Upload className="w-3 h-3" />
                      <span className="ml-1">Import Help</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendMessage("Show me a CSV template")}
                      disabled={isProcessing}
                      className="text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="ml-1">Get Template</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendMessage("Help me map my CSV fields")}
                      disabled={isProcessing}
                      className="text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    >
                      <MapIcon className="w-3 h-3" />
                      <span className="ml-1">Field Mapping</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-4 bg-gradient-to-r from-background via-primary/5 to-background">
              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Uploaded Files</span>
                    <Button variant="ghost" size="sm" onClick={() => setUploadedFiles([])} className="h-6 text-xs">
                      Clear all
                    </Button>
                  </div>
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(idx)} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {showWelcome && !uploadedFiles.length && (
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="w-4 h-4 text-primary animate-pulse" />
                  <span className="font-medium">Type your question here or click an example above</span>
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleSendMessage()}
                    placeholder={
                      showWelcome ? "Type here: 'How many employees don't have IRD numbers?'" : "Ask anything..."
                    }
                    className="w-full rounded-lg border-2 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-sm transition-all"
                    disabled={isProcessing}
                    autoFocus
                  />
                  {input && (
                    <Badge variant="secondary" className="absolute right-14 top-1/2 -translate-y-1/2 text-xs">
                      Press Enter ↵
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isProcessing || !input.trim()}
                  size="sm"
                  className="px-4 py-3 bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results/Preview */}
        <div className="w-1/2 min-h-0">
          <Card className="h-full flex flex-col overflow-hidden min-h-0">
            {generatedWorkflow ? (
              <>
                <div className="p-6 border-b bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-purple-600 text-white shadow-md">
                          <Workflow className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{generatedWorkflow.name}</h3>
                          <Badge variant="secondary" className="mt-0.5 text-xs">
                            AI Generated
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {generatedWorkflow.description}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          {generatedWorkflow.nodes?.filter((n: any) => n.type === 'trigger').length || 0} Trigger
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          {generatedWorkflow.nodes?.filter((n: any) => n.type === 'condition').length || 0} Conditions
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-700">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          {generatedWorkflow.nodes?.filter((n: any) => n.type === 'action').length || 0} Actions
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          {generatedWorkflow.nodes?.filter((n: any) => n.type === 'delay').length || 0} Delays
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-700">
                          <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                          {generatedWorkflow.nodes?.filter((n: any) => n.type === 'branch').length || 0} Branches
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setWorkflowEditMode(!workflowEditMode)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        {workflowEditMode ? "Preview Mode" : "Edit Mode"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setGeneratedWorkflow(null)}>
                        Clear
                      </Button>
                      <Button size="sm" onClick={handleSaveWorkflow} className="bg-gradient-to-r from-primary to-purple-600">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Workflow
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <WorkflowCanvas
                    workflow={generatedWorkflow}
                    onWorkflowChange={setGeneratedWorkflow}
                    onSave={handleSaveWorkflow}
                    onTest={() => {}}
                    isValid={true}
                    isDirty={false}
                    aiPreviewMode={!workflowEditMode}
                  />
                </div>
              </>
            ) : hasLatestResult ? (
              <div className="flex-1 relative overflow-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 opacity-60" />
                <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                <div className="relative z-10 h-full flex flex-col gap-6 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                        <Sparkles className="w-4 h-4" />
                        Latest Insight
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{insightTitle}</h3>
                      {readableSummary && <p className="text-sm text-muted-foreground max-w-2xl">{readableSummary}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {lastUpdatedLabel && (
                        <Badge variant="secondary" className="text-xs">
                          Updated {lastUpdatedLabel}
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" className="gap-2" onClick={handleExportResult}>
                        <Download className="w-4 h-4" />
                        Quick Export
                      </Button>
                    </div>
                  </div>

                  {isArrayResult ? (
                    <>
                      {arrayMetrics.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {arrayMetrics.map((metric, idx) => {
                            const Icon = metric.icon;
                            return (
                              <div key={`${metric.label}-${idx}`} className="rounded-xl border bg-white/70 backdrop-blur-sm p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase text-muted-foreground tracking-wide">
                                      {metric.label}
                                    </div>
                                    <div className="text-lg font-semibold text-foreground">{metric.value}</div>
                                    {metric.helper && <div className="text-xs text-muted-foreground">{metric.helper}</div>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm">
                        <div className="border-b px-4 py-3 flex items-center justify-between">
                          <div className="font-semibold text-sm flex items-center gap-2">
                            <Table className="w-4 h-4 text-primary" />
                            Top People
                          </div>
                          {Array.isArray(latestResult) && latestResult.length > arrayPreview.length && (
                            <Badge variant="secondary" className="text-xs">
                              Showing {arrayPreview.length} of {latestResult.length}
                            </Badge>
                          )}
                        </div>
                        <div className="divide-y">
                          {arrayPreview.length > 0 ? (
                            arrayPreview.map((person, idx) => {
                              const details = [person.role, person.department, person.status].filter(Boolean).join(" • ");
                              return (
                                <div key={`${person.name}-${idx}`} className="px-4 py-3 text-left text-sm">
                                  <div className="font-medium text-foreground">{person.name}</div>
                                  {details && <div className="text-xs text-muted-foreground mt-1">{details}</div>}
                                  {person.startDateLabel && (
                                    <div className="text-xs text-muted-foreground mt-1">Start: {person.startDateLabel}</div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No people found for this view.</div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {aggregateMetrics.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {aggregateMetrics.map((metric, idx) => {
                            const Icon = metric.icon;
                            return (
                              <div key={`${metric.label}-${idx}`} className="rounded-xl border bg-white/70 backdrop-blur-sm p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs uppercase text-muted-foreground tracking-wide">{metric.label}</div>
                                    <div className="text-lg font-semibold text-foreground">{metric.value}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {aggregateDetails.length > 0 && (
                        <div className="rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm">
                          <div className="border-b px-4 py-3 font-semibold text-sm flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            Key Details
                          </div>
                          <div className="divide-y text-sm">
                            {aggregateDetails.map((detail, idx) => (
                              <div key={`${detail.label}-${idx}`} className="flex items-center justify-between px-4 py-3">
                                <div className="text-xs font-medium uppercase text-muted-foreground tracking-wide">{detail.label}</div>
                                <div className="text-sm text-foreground text-right max-w-[60%] break-words">{detail.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {primitiveResult && (
                        <div className="rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm p-6 text-center">
                          <div className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Result</div>
                          <div className="text-3xl font-bold text-foreground">{primitiveResult}</div>
                        </div>
                      )}
                    </>
                  )}

                  {shouldShowFollowUps && (
                    <div className="mt-auto border rounded-xl bg-white/80 backdrop-blur-sm shadow-sm p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold">Quick follow-ups</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {followUpSuggestions.map((suggestion, idx) => (
                          <Button
                            key={`${suggestion}-${idx}`}
                            variant="outline"
                            size="sm"
                            className="text-xs h-auto py-2 px-3 border-dashed"
                            onClick={() => handlePrefillPrompt(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto py-2 px-3"
                          onClick={() => handlePrefillPrompt("Can you summarise next steps for HR?")}
                        >
                          Ask follow-up
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-50" />
                <div className="absolute inset-0 bg-grid-pattern opacity-5" />

                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 mb-6 shadow-2xl animate-pulse">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    AI-Powered HR Intelligence
                  </h3>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Your questions become insights. Your ideas become workflows. Your needs become features.
                  </p>

                  <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                    <button
                      onClick={() => handleSendMessage("Show me all employees")}
                      className="group text-center p-4 rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-lg cursor-pointer"
                    >
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Table className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold mb-2">Data Queries</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Instant answers about your people, leave, and documents
                      </p>
                    </button>
                    <button
                      onClick={() => handleSendMessage("I want to create a workflow")}
                      className="group text-center p-4 rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-lg cursor-pointer"
                    >
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Workflow className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold mb-2">Workflows</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Build automation visually from plain English</p>
                    </button>
                    <button
                      onClick={() => handleSendMessage("I want to add a custom field")}
                      className="group text-center p-4 rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-lg cursor-pointer"
                    >
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Plus className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold mb-2">Custom Fields</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Extend your system without code or migrations</p>
                    </button>
                  </div>

                  <div className="mt-10 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="w-4 h-4" />
                      <span>Results will appear here</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
                      <span>💬 Type in the chat box on the left to get started</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
