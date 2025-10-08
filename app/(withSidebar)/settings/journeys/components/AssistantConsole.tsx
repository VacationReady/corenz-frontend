"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  Send,
  Sparkles,
  MessageSquare,
  Zap,
  Clock,
  Users,
  Target,
  BarChart3,
  GitBranch,
  Play,
  Minimize2,
  Maximize2,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Bot,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface JourneyTemplate {
  id: string;
  name: string;
  description?: string;
  persona?: string;
  duration?: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  category?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  phases: JourneyPhase[];
  metricBindings: MetricBinding[];
  experiments: ExperimentVariant[];
}

interface JourneyPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  duration?: number;
  phaseType: "SEQUENTIAL" | "PARALLEL" | "CONDITIONAL";
  experienceBlocks: ExperienceBlock[];
}

interface ExperienceBlock {
  id: string;
  name: string;
  description?: string;
  blockType: "TASK" | "FORM" | "COMMUNICATION" | "TRAINING" | "APPROVAL" | "AUTOMATION" | "MILESTONE" | "SURVEY" | "DOCUMENT" | "MEETING";
  order: number;
  estimatedDuration?: number;
  slaHours?: number;
  responsibleRole?: string;
}

interface MetricBinding {
  id: string;
  metricName: string;
  metricType: "COMPLETION_RATE" | "SATISFACTION_SCORE" | "TIME_TO_COMPLETE" | "ENGAGEMENT_SCORE" | "RETENTION_RATE" | "CUSTOM";
  targetValue?: number;
  currentValue?: number;
}

interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  trafficAllocation: number;
  isControl: boolean;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
}

interface AssistantConsoleProps {
  journey: JourneyTemplate | null;
  onJourneyUpdate: (journey: JourneyTemplate) => void;
  onClose: () => void;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: Array<{
    id: string;
    label: string;
    type: "primary" | "secondary";
    action: () => void;
  }>;
  suggestions?: string[];
}

const PROMPT_SUGGESTIONS = [
  "Add a pulse survey after Week 4",
  "Create an A/B test for the welcome email",
  "Generate morale boost ideas for the Growth phase",
  "Summarize readiness risks in this journey",
  "Suggest improvements based on feedback",
  "Create a decision gateway for role clarity",
];

export function AssistantConsole({ journey, onJourneyUpdate, onClose }: AssistantConsoleProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: journey 
        ? `I'm here to help you optimize "${journey.name}". I can suggest improvements, create experiments, generate content, and help you iterate based on real-time data. What would you like to work on?`
        : "Welcome to Journey Designer! I can help you create and optimize employee journey experiences. What would you like to build?",
      timestamp: new Date(),
      suggestions: journey ? [
        "Analyze current performance",
        "Suggest improvements",
        "Create an experiment",
        "Add engagement touchpoints"
      ] : [
        "Create a new hire journey",
        "Build a performance review process", 
        "Design leadership development path",
        "Set up offboarding workflow"
      ]
    }
  ]);
  
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call the existing AI chat endpoint
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          context: {
            mode: "journey_designer",
            journey: journey ? {
              id: journey.id,
              name: journey.name,
              status: journey.status,
              phases: journey.phases.length,
            } : null,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: "assistant",
          content: data.message || "I understand. Let me help you with that.",
          timestamp: new Date(),
          actions: data.actions?.map((action: any, index: number) => ({
            id: `action-${index}`,
            label: action.label,
            type: action.type || "secondary",
            action: () => handleAction(action),
          })),
          suggestions: data.suggestions,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error("Failed to get AI response");
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "assistant", 
        content: "I apologize, but I'm having trouble processing your request right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: any) => {
    switch (action.type) {
      case "add_survey":
        // Add survey block to journey
        console.log("Adding survey block");
        break;
      case "create_experiment":
        // Create A/B experiment
        console.log("Creating experiment");
        break;
      case "generate_content":
        // Generate content for blocks
        console.log("Generating content");
        break;
      case "analyze_performance":
        // Show performance analysis
        console.log("Analyzing performance");
        break;
      default:
        console.log("Unknown action:", action);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  if (isMinimized) {
    return (
      <div className="flex-none h-12 border-t bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI Assistant</span>
            {isLoading && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsMinimized(false)}>
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex-none h-64 border-t bg-white flex flex-col">
        {/* Header */}
        <div className="flex-none border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-primary/10 rounded">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm">AI Journey Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  {journey ? `Optimizing "${journey.name}"` : "Ready to help design your journey"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setMessages([messages[0]])}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear conversation</p>
                </TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="sm" onClick={() => setIsMinimized(true)}>
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.type === "assistant" && (
                    <div className="flex-none">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex-1 max-w-[80%] space-y-2",
                    message.type === "user" && "flex flex-col items-end"
                  )}>
                    <Card className={cn(
                      message.type === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-gray-50"
                    )}>
                      <CardContent className="p-3">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    {message.actions && (
                      <div className="flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                          <Button
                            key={action.id}
                            variant={action.type === "primary" ? "primary" : "outline"}
                            size="sm"
                            onClick={action.action}
                            className="text-xs"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
                      {message.type === "assistant" && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {message.type === "user" && (
                    <div className="flex-none">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-none">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <Card className="bg-gray-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="flex-none border-t p-4">
          <div className="space-y-3">
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Field */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={journey ? "Ask me to optimize your journey..." : "Describe the journey you want to create..."}
                  disabled={isLoading}
                  className="pr-10"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ⏎
                </div>
              </div>
              <Button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
