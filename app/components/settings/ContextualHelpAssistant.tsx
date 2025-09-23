"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Video,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
// Removed framer-motion dependency for compatibility

interface Suggestion {
  id: string;
  title: string;
  description: string;
  action?: () => void;
  link?: string;
  icon?: React.ReactNode;
}

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  url: string;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: Suggestion[];
  articles?: HelpArticle[];
  helpful?: boolean;
}

interface ContextualHelpAssistantProps {
  pageContext?: string;
  userRole?: string;
  className?: string;
}

// Context-aware help content
const contextualHelp: Record<string, {
  quickActions: Suggestion[];
  commonQuestions: string[];
  relatedArticles: HelpArticle[];
}> = {
  "/settings/leave-policies": {
    quickActions: [
      {
        id: "create-policy",
        title: "Create your first leave policy",
        description: "Set up annual leave in 3 minutes",
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        id: "import-template",
        title: "Use a template",
        description: "Start with industry-standard settings",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        id: "watch-tutorial",
        title: "Watch tutorial",
        description: "5-minute video walkthrough",
        icon: <Video className="h-4 w-4" />,
      },
    ],
    commonQuestions: [
      "How do I set different leave for part-time employees?",
      "What's the difference between accrual and entitlement?",
      "How do service-length tiers work?",
      "Can I have different policies per department?",
    ],
    relatedArticles: [
      {
        id: "1",
        title: "Leave Policy Best Practices",
        category: "Guide",
        readTime: "5 min",
        url: "/help/leave-policies",
      },
      {
        id: "2",
        title: "Configuring Accrual Rules",
        category: "Tutorial",
        readTime: "3 min",
        url: "/help/accrual",
      },
    ],
  },
  "/settings/automation-rules": {
    quickActions: [
      {
        id: "simple-automation",
        title: "Create simple automation",
        description: "Document expiry reminder",
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        id: "test-mode",
        title: "Enable test mode",
        description: "Try automations safely",
        icon: <HelpCircle className="h-4 w-4" />,
      },
    ],
    commonQuestions: [
      "What triggers are available?",
      "How do I test an automation before activating?",
      "Can I send notifications to multiple channels?",
      "How do conditions work?",
    ],
    relatedArticles: [
      {
        id: "3",
        title: "Automation Rules Guide",
        category: "Guide",
        readTime: "7 min",
        url: "/help/automation",
      },
    ],
  },
};

export function ContextualHelpAssistant({
  pageContext = "/settings",
  userRole = "hr",
  className,
}: ContextualHelpAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentContext = contextualHelp[pageContext] || contextualHelp["/settings"];

  useEffect(() => {
    // Check if user has seen the assistant before
    const hasSeenAssistant = localStorage.getItem("hasSeenHelpAssistant");
    if (!hasSeenAssistant && pageContext !== "/settings") {
      setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem("hasSeenHelpAssistant", "true");
      }, 2000);
    }
  }, [pageContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage = generateResponse(message, pageContext);
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const generateResponse = (query: string, context: string): Message => {
    const lowerQuery = query.toLowerCase();
    
    // Context-aware responses
    if (lowerQuery.includes("leave") || lowerQuery.includes("holiday")) {
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: "I can help you set up leave policies! Here are some options:",
        timestamp: new Date(),
        suggestions: [
          {
            id: "1",
            title: "Create Basic Leave Policy",
            description: "Set up annual leave with standard settings",
            action: () => window.location.href = "/settings/leave-policies/new",
          },
          {
            id: "2",
            title: "Import Template",
            description: "Use a pre-configured template for your industry",
          },
          {
            id: "3",
            title: "View Examples",
            description: "See how other companies configure leave",
          },
        ],
        articles: currentContext.relatedArticles,
      };
    }

    if (lowerQuery.includes("automat") || lowerQuery.includes("workflow")) {
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: "Automation can save you hours every week! Let me guide you:",
        timestamp: new Date(),
        suggestions: [
          {
            id: "1",
            title: "Document Expiry Automation",
            description: "Send reminders before documents expire",
          },
          {
            id: "2",
            title: "Onboarding Automation",
            description: "Automate new employee tasks",
          },
          {
            id: "3",
            title: "View All Templates",
            description: "Browse pre-built automation templates",
          },
        ],
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: "assistant",
      content: "I'm here to help! What would you like to configure? You can ask me about leave policies, automation rules, permissions, or any other HR settings.",
      timestamp: new Date(),
      suggestions: currentContext.quickActions,
    };
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, helpful } : msg
      )
    );
  };

  return (
    <>
      {/* Floating Assistant Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "bg-primary text-primary-foreground",
            "rounded-full p-4 shadow-lg",
            "hover:shadow-xl hover:scale-110 transition-all duration-200",
            "flex items-center gap-2",
            "animate-in fade-in zoom-in duration-300",
            className
          )}
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Open help assistant</span>
          {/* Pulse animation for attention */}
          <span className="absolute -top-1 -right-1 h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </button>
      )}

      {/* Assistant Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-96 max-h-[600px]",
            "bg-background border rounded-lg shadow-2xl",
            "flex flex-col",
            "animate-in fade-in slide-in-from-bottom-5 duration-300",
            isMinimized && "max-h-[60px]",
            className
          )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot className="h-5 w-5 text-primary" />
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">HR Assistant</h3>
                  <p className="text-xs text-muted-foreground">Always here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Quick Actions */}
                {messages.length === 0 && (
                  <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">QUICK ACTIONS</span>
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Suggested
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {currentContext.quickActions.slice(0, 3).map((action) => (
                        <button
                          key={action.id}
                          onClick={action.action}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">{action.icon}</div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{action.title}</p>
                              <p className="text-xs text-muted-foreground">{action.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Ask me anything about HR settings!
                      </p>
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">POPULAR QUESTIONS</p>
                        {currentContext.commonQuestions.slice(0, 3).map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickQuestion(question)}
                            className="block w-full text-left p-2 text-xs rounded-lg hover:bg-muted transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-2",
                        message.type === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.type === "assistant" && (
                        <Bot className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] space-y-2",
                          message.type === "user" ? "bg-primary text-primary-foreground rounded-lg p-3" : ""
                        )}
                      >
                        <p className={cn(
                          "text-sm",
                          message.type === "assistant" ? "text-foreground" : ""
                        )}>
                          {message.content}
                        </p>

                        {/* Suggestions */}
                        {message.suggestions && (
                          <div className="space-y-2 mt-3">
                            {message.suggestions.map((suggestion) => (
                              <button
                                key={suggestion.id}
                                onClick={suggestion.action}
                                className="w-full text-left p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                              >
                                <p className="text-xs font-medium">{suggestion.title}</p>
                                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Related Articles */}
                        {message.articles && (
                          <div className="space-y-2 mt-3">
                            <p className="text-xs font-medium text-muted-foreground">RELATED ARTICLES</p>
                            {message.articles.map((article) => (
                              <a
                                key={article.id}
                                href={article.url}
                                target="_blank"
                                className="block p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-medium">{article.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {article.category} • {article.readTime}
                                    </p>
                                  </div>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Feedback */}
                        {message.type === "assistant" && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Was this helpful?</span>
                            <button
                              onClick={() => handleFeedback(message.id, true)}
                              className={cn(
                                "p-1 rounded hover:bg-muted",
                                message.helpful === true && "text-green-600"
                              )}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleFeedback(message.id, false)}
                              className={cn(
                                "p-1 rounded hover:bg-muted",
                                message.helpful === false && "text-red-600"
                              )}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      {message.type === "user" && (
                        <User className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-2">
                      <Bot className="h-6 w-6 text-primary mt-1" />
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1"
                      disabled={isTyping}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!inputValue.trim() || isTyping}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Powered by AI • Available 24/7
                  </p>
                </div>
              </>
            )}
          </div>
        )}
    </>
  );
}
