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
  Check,
  AlertCircle,
  Code,
  Table,
  Workflow,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { WorkflowCanvas } from "@/app/(withSidebar)/settings/automation-rules/components/WorkflowCanvas";
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

const QUICK_ACTIONS = [
  {
    label: "Employees without IRD",
    icon: <Search className="w-4 h-4" />,
    prompt: "How many employees don't have IRD numbers?",
    type: "query" as ActionType,
  },
  {
    label: "Contract Expiry Workflow",
    icon: <Zap className="w-4 h-4" />,
    prompt:
      "Create a workflow that alerts HR 60 days before contracts expire",
    type: "workflow" as ActionType,
  },
  {
    label: "Add Custom Field",
    icon: <Plus className="w-4 h-4" />,
    prompt: "Add a 'Favourite Colour' field to personal information",
    type: "field" as ActionType,
  },
];

export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm your AI HR Assistant. I can help you with:

📊 **Data Queries**: Ask about employee data, leave requests, documents, etc.
⚡ **Workflow Creation**: Describe a workflow and I'll build it for you
➕ **Custom Fields**: Add new fields to employee forms without coding
🔍 **System Insights**: Analyze trends and generate reports

What would you like to do today?`,
      timestamp: new Date(),
      actionType: "info",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (messageText: string = input) => {
    if (!messageText.trim() || isProcessing) return;

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
      description="Natural language HR automation"
      icon={<Bot className="w-6 h-6" />}
    >
      <div className="flex h-[calc(100vh-12rem)] gap-4">
        {/* Left: Chat Interface */}
        <div className="w-1/2 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
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

            {/* Quick Actions */}
            <div className="border-t p-3 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(action.prompt)}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask me anything about your HR data..."
                  className="flex-1 rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isProcessing}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isProcessing || !input.trim()}
                  size="sm"
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
          <Card className="h-full flex flex-col">
            {generatedWorkflow ? (
              <>
                <div className="p-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">
                      {generatedWorkflow.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {generatedWorkflow.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGeneratedWorkflow(null)}
                    >
                      Clear
                    </Button>
                    <Button size="sm" onClick={handleSaveWorkflow}>
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Sparkles className="w-16 h-16 mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">
                  AI-Powered HR Assistant
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask questions, generate workflows, or add custom fields. Results will appear here.
                </p>

                <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-lg">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Table className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-sm font-medium mb-1">Data Queries</h4>
                    <p className="text-xs text-muted-foreground">
                      Ask about employees, leave, documents
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Workflow className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-sm font-medium mb-1">Workflows</h4>
                    <p className="text-xs text-muted-foreground">
                      Generate automation from description
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-sm font-medium mb-1">Custom Fields</h4>
                    <p className="text-xs text-muted-foreground">
                      Add fields without coding
                    </p>
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

