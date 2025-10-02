"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Bot,
  Send,
  Sparkles,
  Search,
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
  Clock,
  BarChart3,
  Settings,
  UserPlus,
  UserMinus,
  Briefcase,
  Shield,
  Globe,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { WorkflowCanvas } from "@/(withSidebar)/settings/automation-rules/components/WorkflowCanvas";
import { PageShell } from "@/components/ui/PageShell";
import { createPortal } from "react-dom";

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
  },
  {
    id: "customize",
    title: "How can I customize employee data?",
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
];

const QUICK_ACTIONS = [
  {
    label: "Missing IRD Numbers",
    icon: <Search className="w-4 h-4" />,
    prompt: "How many employees don't have IRD numbers?",
    type: "query" as ActionType,
    color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  },
  {
    label: "Contract Expiry Alert",
    icon: <Bell className="w-4 h-4" />,
    prompt: "Create a workflow that alerts HR 60 days before contracts expire",
    type: "workflow" as ActionType,
    color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
  },
  {
    label: "Add Custom Field",
    icon: <Plus className="w-4 h-4" />,
    prompt: "Add a 'T-Shirt Size' dropdown field",
    type: "field" as ActionType,
    color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
  },
  {
    label: "Upcoming Starters",
    icon: <Calendar className="w-4 h-4" />,
    prompt: "Show me employees starting in the next 30 days",
    type: "query" as ActionType,
    color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
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
    category: "➕ Customize System",
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
      { action: "Customize options", example: "Add 'Wellington' to office locations" },
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


export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const capabilitiesButtonRef = useRef<HTMLButtonElement>(null);
  const [isMounted, setIsMounted] = useState(false);

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
      // NEW: Use unified orchestrator endpoint for intelligent routing
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await res.json();

      // Handle errors from API
      if (!data.success) {
        throw new Error(data.message || data.error || "Request failed");
      }

      // Extract response
      const response = {
        content: data.message,
        result: data.result,
        suggestions: data.suggestions,
        actionType: data.actionType || "info",
      };

      // Handle workflows (show in visual editor)
      if (data.actionType === "workflow" && data.result) {
        setGeneratedWorkflow(data.result);
      }

      // Remove loading message and add response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [
          ...filtered,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response.content,
            timestamp: new Date(),
            actionType: response.actionType,
            result: response.result,
            suggestions: response.suggestions,
            summary: data.summary,
          },
        ];
      });
    } catch (error: any) {
      // Friendly error messages for non-technical users
      let friendlyMessage = "";
      const errorMsg = error.message?.toLowerCase() || "";

      if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
        const resetTime = new Date(Date.now() + 3600000).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        friendlyMessage = `🕐 **You're using AI Assistant really well!**

We've hit our hourly limit to keep costs manageable. This resets at ${resetTime}.

**What you can do now:**
✅ Save your current conversation
✅ Check out the Workflow Library (no limits!)
✅ Come back in an hour to continue

*Tip: You can ask up to 100 questions per hour.*`;
      } else if (errorMsg.includes("api key") || errorMsg.includes("401") || errorMsg.includes("403")) {
        friendlyMessage = `🔑 **Hmm, there's a setup issue...**

The AI features haven't been fully configured yet. This is quick to fix!

**What needs to happen:**
✅ An admin needs to add the OpenAI API key
✅ Takes about 5 minutes to set up

*Want to set this up? Check the SETUP_AI_ASSISTANT.md guide or contact your IT team.*`;
      } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
        friendlyMessage = `🌐 **Connection hiccup...**

It looks like there's a network issue. This usually fixes itself!

**Try these:**
✅ Check your internet connection
✅ Refresh the page
✅ Try your question again

*Still having issues? Contact support.*`;
      } else {
        friendlyMessage = `😅 **Oops, something unexpected happened!**

Don't worry - your data is safe. This is likely a temporary glitch.

**What to try:**
✅ Rephrase your question
✅ Try a simpler query first
✅ Refresh the page

*Error details for support: ${error.message}*`;
      }

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: friendlyMessage,
            timestamp: new Date(),
            suggestions: [
              "Try the Workflow Library instead",
              "Check system status",
              "Contact support for help"
            ],
          },
        ];
      });
      
      // Still show toast but friendlier
      if (errorMsg.includes("429")) {
        toast.error("Rate limit reached - take a quick break!");
      } else {
        toast.error("Something went wrong - try refreshing");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const detectActionType = (text: string): ActionType => {
    const lower = text.toLowerCase();
    if (
      lower.includes("how many") ||
      lower.includes("show me") ||
      lower.includes("list") ||
      lower.includes("find") ||
      lower.includes("count")
    ) {
      return "query";
    }
    if (
      lower.includes("workflow") ||
      lower.includes("automat") ||
      lower.includes("alert") ||
      lower.includes("remind") ||
      lower.includes("trigger")
    ) {
      return "workflow";
    }
    if (
      lower.includes("add field") ||
      lower.includes("create field") ||
      lower.includes("new field") ||
      lower.includes("custom field")
    ) {
      return "field";
    }
    return "info";
  };

  const handleQuery = async (prompt: string) => {
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

  const generateFollowUpSuggestions = (prompt: string, data: any): string[] => {
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

  const handleWorkflow = async (prompt: string) => {
    const res = await fetch("/api/ai/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", prompt }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Workflow generation failed");
    }

    setGeneratedWorkflow(data.workflow);

    return {
      content: `✅ **Workflow Generated!**\n\n${data.workflow.name}\n\n${data.explanation || data.workflow.description}\n\nI've created a visual workflow on the right. Review it and click "Save Workflow" when ready.`,
      result: data.workflow,
    };
  };

  const handleField = async (prompt: string) => {
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

  // Check if AI is enabled
  if (!session?.user || session.user.role === "EMPLOYEE") {
    return (
      <PageShell title="AI Assistant" icon={<Bot className="w-6 h-6" />}>
        <div className="flex items-center justify-center h-96">
          <Card className="p-6 max-w-md text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground">
              AI Assistant features are only available to administrators.
            </p>
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
            <ChevronDown className={`w-4 h-4 transition-transform ${showCapabilities ? 'rotate-180' : ''}`} />
          </Button>

          {/* Render dropdown via portal to escape stacking context */}
          {isMounted && showCapabilities && createPortal(
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/20 z-[9998]" 
                onClick={() => setShowCapabilities(false)}
              />
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
                    Click any example to try it instantly • {AI_CAPABILITIES.reduce((sum, cat) => sum + cat.capabilities.length, 0)} actions available
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  {AI_CAPABILITIES.map((category, idx) => (
                    <div key={idx} className="pb-3 border-b last:border-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
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
                                  "{cap.example}"
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
        <div className="w-1/2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
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
                    Ask questions, build workflows, and customize your system in plain English.
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
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white shadow-sm`}>
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
                                <span className="block max-w-[200px] truncate">
                                  {example}
                                </span>
                              </button>
                            ))}
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
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0, maxHeight: '100%' }}>
                {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap text-sm">
                          {msg.content}
                        </div>
                        {msg.actionType && msg.role === "assistant" && (
                          <Badge
                            variant="outline"
                            className="mt-2 text-xs"
                          >
                            {msg.actionType === "query" && <Search className="w-3 h-3 mr-1" />}
                            {msg.actionType === "workflow" && <Zap className="w-3 h-3 mr-1" />}
                            {msg.actionType === "field" && <Plus className="w-3 h-3 mr-1" />}
                            {msg.actionType}
                          </Badge>
                        )}
                        {/* Show data table if query returned results */}
                        {msg.result?.data && Array.isArray(msg.result.data) && (
                          <div className="mt-2 max-h-40 overflow-auto">
                            <div className="text-xs bg-background/50 rounded p-2">
                              <pre className="text-xs">
                                {JSON.stringify(msg.result.data.slice(0, 3), null, 2)}
                              </pre>
                              {msg.result.data.length > 3 && (
                                <p className="text-muted-foreground mt-1">
                                  ...and {msg.result.data.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Follow-up suggestions */}
                        {msg.suggestions && msg.suggestions.length > 0 && !msg.isLoading && (
                          <div className="mt-4 pt-3 border-t border-muted">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="w-4 h-4 text-amber-500" />
                              <span className="text-xs font-medium text-muted-foreground">
                                You might also want to:
                              </span>
                            </div>
                            <div className="space-y-2">
                              {msg.suggestions.map((suggestion, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleSendMessage(suggestion)}
                                  disabled={isProcessing}
                                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <ArrowRight className="w-3 h-3 text-primary group-hover:translate-x-0.5 transition-transform" />
                                  <span>{suggestion}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
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
              </div>
            )}

            {/* Input */}
            <div className="border-t p-4 bg-gradient-to-r from-background via-primary/5 to-background">
              {showWelcome && (
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
                    placeholder={showWelcome ? "Type here: 'How many employees don't have IRD numbers?'" : "Ask anything..."}
                    className="w-full rounded-lg border-2 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-sm transition-all"
                    disabled={isProcessing}
                    autoFocus
                  />
                  {input && (
                    <Badge 
                      variant="secondary" 
                      className="absolute right-14 top-1/2 -translate-y-1/2 text-xs"
                    >
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
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Results/Preview */}
        <div className="w-1/2 min-h-0">
          <Card className="h-full flex flex-col overflow-hidden min-h-0">
            {generatedWorkflow ? (
              <>
                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Workflow className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">
                        {generatedWorkflow.name}
                      </h3>
                      <Badge variant="secondary" className="ml-auto">AI Generated</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {generatedWorkflow.description}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGeneratedWorkflow(null)}
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveWorkflow}
                      className="bg-gradient-to-r from-primary to-purple-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Workflow
                    </Button>
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
                  />
                </div>
              </>
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
                    <div className="group text-center p-4 rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-lg">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Table className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold mb-2">Data Queries</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Instant answers about your people, leave, and documents
                      </p>
                    </div>
                    <div className="group text-center p-4 rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-lg">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Workflow className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold mb-2">Workflows</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Build automation visually from plain English
                      </p>
                    </div>
                    <div className="group text-center p-4 rounded-xl hover:bg-white/50 transition-all duration-300 hover:shadow-lg">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Plus className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold mb-2">Custom Fields</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Extend your system without code or migrations
                      </p>
                    </div>
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

