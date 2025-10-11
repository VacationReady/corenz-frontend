/**
 * Response Formatter Utility
 * Transforms AI responses into structured, actionable formats with deep links and highlights
 */

export interface ResponseSection {
  title?: string;
  content: string;
  type?: "success" | "warning" | "error" | "info";
}

export interface NextStep {
  label: string;
  action?: string;
  link?: string;
  params?: Record<string, any>;
}

export interface DeepLink {
  label: string;
  path: string;
  icon?: string;
}

export interface StructuredResponseConfig {
  summary: string;
  sections?: ResponseSection[];
  data?: any;
  nextSteps?: NextStep[];
  warnings?: string[];
  tips?: string[];
  deepLinks?: DeepLink[];
  metrics?: Record<string, string | number>;
  undoable?: boolean;
  undoInstructions?: string;
}

/**
 * Formats a response into a structured, user-friendly format with markdown
 */
export function formatStructuredResponse(config: StructuredResponseConfig): string {
  let response = "";

  // Main summary with appropriate icon
  const icon = config.warnings && config.warnings.length > 0 ? "⚠️" : "✅";
  response += `${icon} **${config.summary}**\n\n`;

  // Critical warnings first
  if (config.warnings && config.warnings.length > 0) {
    response += `### ⚠️ Important Warnings\n`;
    config.warnings.forEach(warning => {
      response += `- **${warning}**\n`;
    });
    response += `\n`;
  }

  // Metrics cards
  if (config.metrics && Object.keys(config.metrics).length > 0) {
    response += `### 📊 Key Metrics\n`;
    Object.entries(config.metrics).forEach(([key, value]) => {
      response += `- **${key}**: ${value}\n`;
    });
    response += `\n`;
  }

  // Content sections
  if (config.sections && config.sections.length > 0) {
    config.sections.forEach(section => {
      if (section.title) {
        const sectionIcon = getSectionIcon(section.type);
        response += `### ${sectionIcon} ${section.title}\n`;
      }
      response += `${section.content}\n\n`;
    });
  }

  // Next steps (actionable)
  if (config.nextSteps && config.nextSteps.length > 0) {
    response += `### 🎯 Next Steps\n`;
    config.nextSteps.forEach((step, index) => {
      const linkPart = step.link ? ` → [Go](${step.link})` : "";
      response += `${index + 1}. ${step.label}${linkPart}\n`;
    });
    response += `\n`;
  }

  // Helpful tips
  if (config.tips && config.tips.length > 0) {
    response += `### 💡 Pro Tips\n`;
    config.tips.forEach(tip => {
      response += `- ${tip}\n`;
    });
    response += `\n`;
  }

  // Deep links to relevant sections
  if (config.deepLinks && config.deepLinks.length > 0) {
    response += `### 🔗 Quick Links\n`;
    config.deepLinks.forEach(link => {
      const icon = link.icon || "📌";
      response += `- ${icon} [${link.label}](/assistant?redirect=${encodeURIComponent(link.path)})\n`;
    });
    response += `\n`;
  }

  // Undo information
  if (config.undoable) {
    response += `---\n\n`;
    response += `🔄 **Undo Available**: ${config.undoInstructions || "This action can be undone within 48 hours by saying 'undo last action'"}\n`;
  }

  return response.trim();
}

function getSectionIcon(type?: string): string {
  switch (type) {
    case "success": return "✅";
    case "warning": return "⚠️";
    case "error": return "❌";
    case "info": return "ℹ️";
    default: return "📋";
  }
}

/**
 * Format a data table for display
 */
export function formatDataTable(data: any[], columns: string[]): string {
  if (!data || data.length === 0) return "No data available";

  let table = "| " + columns.join(" | ") + " |\n";
  table += "|" + columns.map(() => "---").join("|") + "|\n";

  data.slice(0, 10).forEach(row => {
    const values = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return "-";
      if (typeof value === "number") return value.toLocaleString();
      if (value instanceof Date) return value.toLocaleDateString();
      return String(value);
    });
    table += "| " + values.join(" | ") + " |\n";
  });

  if (data.length > 10) {
    table += `\n_Showing 10 of ${data.length} results_\n`;
  }

  return table;
}

/**
 * Format a comparison (before/after)
 */
export function formatComparison(before: any, after: any, label: string): string {
  return `**${label}**\n- Before: ${formatValue(before)}\n- After: ${formatValue(after)}\n`;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "_(not set)_";
  if (typeof value === "number") return value.toLocaleString();
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "boolean") return value ? "✅ Yes" : "❌ No";
  return String(value);
}

/**
 * Format a preview for confirmation
 */
export function formatPreview(config: {
  title: string;
  changes: Array<{ label: string; before: any; after: any }>;
  affectedCount?: number;
  riskLevel?: "low" | "medium" | "high";
  complianceNotes?: string[];
}): string {
  let preview = `### 👁️ ${config.title}\n\n`;

  if (config.affectedCount !== undefined) {
    preview += `**Affects**: ${config.affectedCount} ${config.affectedCount === 1 ? "person" : "people"}\n\n`;
  }

  if (config.riskLevel) {
    const riskIcon = config.riskLevel === "high" ? "🔴" : config.riskLevel === "medium" ? "🟡" : "🟢";
    preview += `**Risk Level**: ${riskIcon} ${config.riskLevel.toUpperCase()}\n\n`;
  }

  preview += `**Changes**:\n`;
  config.changes.forEach(change => {
    preview += formatComparison(change.before, change.after, change.label);
  });

  if (config.complianceNotes && config.complianceNotes.length > 0) {
    preview += `\n**Compliance Notes**:\n`;
    config.complianceNotes.forEach(note => {
      preview += `- ⚖️ ${note}\n`;
    });
  }

  return preview;
}

/**
 * Format error with helpful troubleshooting
 */
export function formatError(config: {
  error: string;
  possibleCauses?: string[];
  suggestions?: string[];
  contactSupport?: boolean;
}): string {
  let errorMsg = `### ❌ Error\n\n${config.error}\n\n`;

  if (config.possibleCauses && config.possibleCauses.length > 0) {
    errorMsg += `**Possible Causes**:\n`;
    config.possibleCauses.forEach(cause => {
      errorMsg += `- ${cause}\n`;
    });
    errorMsg += `\n`;
  }

  if (config.suggestions && config.suggestions.length > 0) {
    errorMsg += `**Try This**:\n`;
    config.suggestions.forEach(suggestion => {
      errorMsg += `- ${suggestion}\n`;
    });
    errorMsg += `\n`;
  }

  if (config.contactSupport) {
    errorMsg += `If the problem persists, please contact support with the error details above.\n`;
  }

  return errorMsg;
}

/**
 * Format progress/status update
 */
export function formatProgress(config: {
  task: string;
  current: number;
  total: number;
  status: "in_progress" | "completed" | "failed";
  details?: string;
}): string {
  const percentage = Math.round((config.current / config.total) * 100);
  const progressBar = generateProgressBar(percentage);
  
  const statusIcon = config.status === "completed" ? "✅" : 
                     config.status === "failed" ? "❌" : "⏳";

  let progress = `${statusIcon} **${config.task}**\n\n`;
  progress += `${progressBar} ${percentage}% (${config.current}/${config.total})\n`;
  
  if (config.details) {
    progress += `\n${config.details}\n`;
  }

  return progress;
}

function generateProgressBar(percentage: number, width: number = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}
