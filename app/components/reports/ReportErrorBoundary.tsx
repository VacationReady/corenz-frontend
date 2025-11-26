"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft, 
  Bug,
  Wifi,
  Clock,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Report Error Boundary
 * 
 * A specialized error boundary for the reporting system that provides:
 * - User-friendly error messages with recovery options
 * - Automatic error classification (network, timeout, auth, etc.)
 * - Retry functionality with exponential backoff
 * - Error reporting to console (can be extended for analytics)
 * - Detailed technical info for debugging
 */

interface ReportErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI when error state is triggered */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Called when user clicks retry */
  onRetry?: () => void;
  /** Called when user clicks back/exit */
  onExit?: () => void;
  /** Custom error message override */
  customMessage?: string;
  /** Show technical details by default */
  showTechnicalDetails?: boolean;
}

interface ReportErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType;
  retryCount: number;
  isRetrying: boolean;
  showDetails: boolean;
  copiedToClipboard: boolean;
}

type ErrorType = 
  | "network" 
  | "timeout" 
  | "auth" 
  | "permission" 
  | "validation" 
  | "server" 
  | "unknown";

interface ErrorConfig {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  color: string;
  canRetry: boolean;
  suggestions: string[];
}

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  network: {
    icon: Wifi,
    title: "Connection Problem",
    description: "We couldn't reach the server. Please check your internet connection and try again.",
    color: "text-amber-600 dark:text-amber-400",
    canRetry: true,
    suggestions: [
      "Check your internet connection",
      "Try refreshing the page",
      "If the problem persists, contact support",
    ],
  },
  timeout: {
    icon: Clock,
    title: "Request Timed Out",
    description: "The report is taking longer than expected to generate. This might happen with large datasets.",
    color: "text-orange-600 dark:text-orange-400",
    canRetry: true,
    suggestions: [
      "Try reducing the date range or number of fields",
      "Apply more specific filters to reduce data volume",
      "If this persists, the report may need to be scheduled",
    ],
  },
  auth: {
    icon: Shield,
    title: "Session Expired",
    description: "Your session has expired or you've been logged out. Please sign in again.",
    color: "text-blue-600 dark:text-blue-400",
    canRetry: false,
    suggestions: [
      "Click 'Sign In' to refresh your session",
      "Your report configuration will be preserved",
    ],
  },
  permission: {
    icon: Shield,
    title: "Access Denied",
    description: "You don't have permission to access this report or the underlying data.",
    color: "text-rose-600 dark:text-rose-400",
    canRetry: false,
    suggestions: [
      "Contact your administrator for access",
      "Check if you have the required role",
      "Some reports may be restricted to certain teams",
    ],
  },
  validation: {
    icon: AlertTriangle,
    title: "Invalid Configuration",
    description: "There's an issue with the report configuration. Please review your selections.",
    color: "text-amber-600 dark:text-amber-400",
    canRetry: false,
    suggestions: [
      "Check that all required fields are selected",
      "Verify filter values are valid",
      "Try removing recently added filters",
    ],
  },
  server: {
    icon: Bug,
    title: "Server Error",
    description: "Something went wrong on our end. Our team has been notified.",
    color: "text-rose-600 dark:text-rose-400",
    canRetry: true,
    suggestions: [
      "Wait a moment and try again",
      "If the problem persists, contact support",
      "Include the error ID when reporting",
    ],
  },
  unknown: {
    icon: HelpCircle,
    title: "Something Went Wrong",
    description: "An unexpected error occurred while generating the report.",
    color: "text-gray-600 dark:text-gray-400",
    canRetry: true,
    suggestions: [
      "Try refreshing the page",
      "Clear your browser cache",
      "Contact support if this continues",
    ],
  },
};

function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    name.includes("networkerror")
  ) {
    return "network";
  }

  // Timeout errors
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("aborted")
  ) {
    return "timeout";
  }

  // Auth errors (401)
  if (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("session") ||
    message.includes("login")
  ) {
    return "auth";
  }

  // Permission errors (403)
  if (
    message.includes("403") ||
    message.includes("forbidden") ||
    message.includes("permission") ||
    message.includes("access denied")
  ) {
    return "permission";
  }

  // Validation errors (400, 422)
  if (
    message.includes("400") ||
    message.includes("422") ||
    message.includes("validation") ||
    message.includes("invalid")
  ) {
    return "validation";
  }

  // Server errors (5xx)
  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("server error") ||
    message.includes("internal")
  ) {
    return "server";
  }

  return "unknown";
}

function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

export class ReportErrorBoundary extends Component<
  ReportErrorBoundaryProps,
  ReportErrorBoundaryState
> {
  private errorId: string = "";

  constructor(props: ReportErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "unknown",
      retryCount: 0,
      isRetrying: false,
      showDetails: props.showTechnicalDetails ?? false,
      copiedToClipboard: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ReportErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorType: classifyError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.errorId = generateErrorId();
    
    // Log error details
    console.error("[ReportErrorBoundary] Error caught:", {
      errorId: this.errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType: this.state.errorType,
    });

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = async (): Promise<void> => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    // Exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
    await new Promise((resolve) => setTimeout(resolve, delay));

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));

    this.props.onRetry?.();
  };

  handleExit = (): void => {
    this.props.onExit?.();
  };

  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    
    const errorDetails = {
      errorId: this.errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      this.setState({ copiedToClipboard: true });
      setTimeout(() => this.setState({ copiedToClipboard: false }), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, errorType, retryCount, isRetrying, showDetails, copiedToClipboard } = this.state;
    const { children, fallback, customMessage } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const config = ERROR_CONFIGS[errorType];
      const Icon = config.icon;
      const maxRetries = 3;
      const canRetryMore = config.canRetry && retryCount < maxRetries;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg"
          >
            <div className="glass-premium rounded-3xl p-8 shadow-premium text-center">
              {/* Error Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
                className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6",
                  errorType === "network" && "bg-amber-100 dark:bg-amber-900/30",
                  errorType === "timeout" && "bg-orange-100 dark:bg-orange-900/30",
                  errorType === "auth" && "bg-blue-100 dark:bg-blue-900/30",
                  errorType === "permission" && "bg-rose-100 dark:bg-rose-900/30",
                  errorType === "validation" && "bg-amber-100 dark:bg-amber-900/30",
                  errorType === "server" && "bg-rose-100 dark:bg-rose-900/30",
                  errorType === "unknown" && "bg-gray-100 dark:bg-gray-800/50"
                )}
              >
                <Icon className={cn("w-10 h-10", config.color)} />
              </motion.div>

              {/* Error Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold text-foreground mb-2"
              >
                {config.title}
              </motion.h3>

              {/* Error Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-muted-foreground mb-6"
              >
                {customMessage || config.description}
              </motion.p>

              {/* Error ID */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                <p className="text-xs text-muted-foreground">
                  Error ID: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{this.errorId}</code>
                </p>
              </motion.div>

              {/* Suggestions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-left bg-muted/50 rounded-xl p-4 mb-6"
              >
                <p className="text-sm font-medium text-foreground mb-2">Suggestions:</p>
                <ul className="space-y-1.5">
                  {config.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                {canRetryMore && (
                  <Button
                    onClick={this.handleRetry}
                    disabled={isRetrying}
                    className="bg-gradient-to-r from-primary to-blue-600 rounded-xl h-11 px-6 w-full sm:w-auto"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again {retryCount > 0 && `(${maxRetries - retryCount} left)`}
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={this.handleExit}
                  className="rounded-xl h-11 px-6 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </motion.div>

              {/* Technical Details Toggle */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-6 pt-6 border-t border-border/50"
              >
                <button
                  onClick={this.toggleDetails}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto transition-colors"
                >
                  {showDetails ? (
                    <>
                      Hide technical details
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Show technical details
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="text-left bg-gray-900 dark:bg-gray-950 rounded-xl p-4 relative">
                        <button
                          onClick={this.handleCopyError}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          title="Copy error details"
                        >
                          {copiedToClipboard ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <pre className="text-xs text-gray-300 font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                          <code>
                            {JSON.stringify(
                              {
                                errorId: this.errorId,
                                type: errorType,
                                message: error?.message,
                                stack: error?.stack?.split("\n").slice(0, 5).join("\n"),
                              },
                              null,
                              2
                            )}
                          </code>
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Functional wrapper for easier hook integration
 */
export function withReportErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<ReportErrorBoundaryProps, "children">
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ReportErrorBoundary {...boundaryProps}>
      <WrappedComponent {...props} />
    </ReportErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithReportErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithErrorBoundary;
}

export default ReportErrorBoundary;

