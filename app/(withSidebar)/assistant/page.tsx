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
} from "lucide-react";
import { toast } from "sonner";
import { WorkflowCanvas } from "@/(withSidebar)/settings/automation-rules/components/WorkflowCanvas";
import { PageShell } from "@/components/ui/PageShell";

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

export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      // Determine action type from message
      const actionType = detectActionType(messageText);
      let response;

      switch (actionType) {
        case "query":
          response = await handleQuery(messageText);
          break;
        case "workflow":
          response = await handleWorkflow(messageText);
          break;
        case "field":
          response = await handleField(messageText);
          break;
        default:
          response = {
            content: "I'm not sure how to help with that. Try asking about data queries, creating workflows, or adding custom fields.",
          };
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
            actionType,
            result: response.result,
          },
        ];
      });
    } catch (error: any) {
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== loadingMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `Sorry, I encountered an error: ${error.message}`,
            timestamp: new Date(),
          },
        ];
      });
      toast.error("Something went wrong");
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

    let content = data.explanation;
    if (data.count !== undefined) {
      content += `\n\n**Result**: ${data.count}`;
    }
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      content += `\n\nFound ${data.data.length} records. View details below.`;
    }

    return { content, result: data };
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
    >
      <div className="flex h-[calc(100vh-12rem)] gap-4">
        {/* Left: Chat Interface */}
        <div className="w-1/2 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Welcome Screen */}
            {showWelcome && messages.length === 0 ? (
              <div className="flex-1 overflow-y-auto p-6">
                {/* Hero Section */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 mb-4 shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Welcome to AI Assistant
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your intelligent HR companion. Ask questions, build workflows, and customize your system—all in plain English.
                  </p>
                </div>

                {/* Capability Cards */}
                <div className="space-y-4 mb-6">
                  {CAPABILITY_CATEGORIES.map((category) => (
                    <div
                      key={category.id}
                      className="group border rounded-xl p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-white to-gray-50/50"
                    >
                      <div className="flex items-start gap-4 mb-3">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white shadow-md`}>
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                            {category.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {category.examples.slice(0, 3).map((example, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(example)}
                                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition-colors flex items-center gap-1 group/btn"
                              >
                                <MessageSquare className="w-3 h-3 opacity-50 group-hover/btn:opacity-100" />
                                {example.length > 40 ? example.slice(0, 40) + "..." : example}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Start Tips */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-medium">Pro Tips</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>Be specific: "Show employees in Sales without IRD" instead of just "show employees"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>Ask follow-up questions to refine workflows: "Make it send 60 days before instead"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>Custom fields are instant—no database changes needed!</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Messages */
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={showWelcome ? "Try: 'How many employees don't have IRD numbers?'" : "Ask anything..."}
                    className="w-full rounded-lg border px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    disabled={isProcessing}
                  />
                  {input && (
                    <Badge 
                      variant="secondary" 
                      className="absolute right-14 top-1/2 -translate-y-1/2 text-xs"
                    >
                      Press Enter
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isProcessing || !input.trim()}
                  size="sm"
                  className="px-4 py-3 bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:opacity-90 transition-opacity shadow-md"
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
        <div className="w-1/2">
          <Card className="h-full flex flex-col overflow-hidden">
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

                  <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ArrowRight className="w-4 h-4" />
                    <span>Start chatting to see results here</span>
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

