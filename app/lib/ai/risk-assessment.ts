/**
 * Risk Assessment Utility
 * Evaluates risk for bulk operations and provides safeguards
 */

export interface RiskFactor {
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  mitigation?: string;
}

export interface RiskAssessment {
  score: number; // 1-10 scale
  level: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
  requiresApproval: boolean;
  complianceNotes: string[];
  safeguards: string[];
  undoWindow: string;
  estimatedImpact: string;
}

/**
 * Calculate risk score for bulk update operations
 */
export function assessBulkUpdateRisk(params: {
  employeeCount: number;
  field: string;
  operation?: "increase" | "decrease" | "update" | "delete";
  percentage?: number;
  value?: any;
  companyId: string;
}): RiskAssessment {
  const factors: RiskFactor[] = [];
  let score = 0;

  // Factor 1: Employee count (volume risk)
  if (params.employeeCount > 100) {
    factors.push({
      description: `Large volume operation affecting ${params.employeeCount} employees`,
      severity: "high",
      mitigation: "Consider breaking into smaller batches or department-specific updates"
    });
    score += 3;
  } else if (params.employeeCount > 50) {
    factors.push({
      description: `Medium volume operation affecting ${params.employeeCount} employees`,
      severity: "medium",
      mitigation: "Review affected employees list before proceeding"
    });
    score += 2;
  } else if (params.employeeCount > 10) {
    factors.push({
      description: `Moderate scope affecting ${params.employeeCount} employees`,
      severity: "low"
    });
    score += 1;
  }

  // Factor 2: Field sensitivity
  const sensitiveFields = ["salaryAmount", "bankAccountNumber", "irdNumber", "taxCode", "role", "departmentId"];
  const highRiskFields = ["salaryAmount", "bankAccountNumber", "irdNumber"];
  
  if (highRiskFields.includes(params.field)) {
    factors.push({
      description: `High-sensitivity field: ${params.field}`,
      severity: "critical",
      mitigation: "Requires approval from finance/payroll team"
    });
    score += 4;
  } else if (sensitiveFields.includes(params.field)) {
    factors.push({
      description: `Sensitive field modification: ${params.field}`,
      severity: "high",
      mitigation: "Audit trail will capture all changes"
    });
    score += 2;
  } else {
    factors.push({
      description: `Standard field update: ${params.field}`,
      severity: "low"
    });
    score += 1;
  }

  // Factor 3: Operation type
  if (params.operation === "delete") {
    factors.push({
      description: "Destructive operation (deletion)",
      severity: "critical",
      mitigation: "Deleted data may not be fully recoverable"
    });
    score += 3;
  } else if (params.operation === "decrease") {
    factors.push({
      description: "Reductive operation (decrease)",
      severity: "medium",
      mitigation: "Verify decrease is intentional and justified"
    });
    score += 1;
  }

  // Factor 4: Percentage magnitude (for increase/decrease)
  if (params.percentage) {
    if (params.percentage > 20) {
      factors.push({
        description: `Large percentage change: ${params.percentage}%`,
        severity: "high",
        mitigation: "Verify this is not a data entry error"
      });
      score += 2;
    } else if (params.percentage > 10) {
      factors.push({
        description: `Moderate percentage change: ${params.percentage}%`,
        severity: "medium"
      });
      score += 1;
    }
  }

  // Determine risk level
  let level: "low" | "medium" | "high" | "critical";
  if (score >= 8) {
    level = "critical";
  } else if (score >= 6) {
    level = "high";
  } else if (score >= 3) {
    level = "medium";
  } else {
    level = "low";
  }

  // Compliance notes
  const complianceNotes: string[] = [];
  if (params.field === "salaryAmount") {
    complianceNotes.push("Salary changes must be documented for payroll and tax purposes");
    complianceNotes.push("Ensure changes comply with employment contracts and minimum wage laws");
    complianceNotes.push("Update may trigger payroll recalculation for current period");
  }
  if (params.field === "bankAccountNumber") {
    complianceNotes.push("Bank details changes require employee verification");
    complianceNotes.push("Notify payroll team before next pay run");
  }
  if (params.field === "irdNumber" || params.field === "taxCode") {
    complianceNotes.push("Tax changes must be reported to IRD");
    complianceNotes.push("Verify employee has provided official documentation");
  }
  if (params.field === "departmentId" || params.field === "role") {
    complianceNotes.push("Organizational changes may affect reporting structure");
    complianceNotes.push("Update may trigger workflow reassignments");
  }

  // Safeguards
  const safeguards: string[] = [
    "✅ Full audit trail maintained",
    "✅ Before/after values captured",
    "✅ Changes reversible within 48-hour window",
    "✅ Affected employees will be notified",
  ];

  if (level === "high" || level === "critical") {
    safeguards.push("⚠️ Super admin approval recommended");
  }

  if (params.employeeCount > 50) {
    safeguards.push("📧 Bulk change summary will be emailed to admin");
  }

  // Requires approval logic
  const requiresApproval = 
    level === "critical" || 
    (level === "high" && params.employeeCount > 25) ||
    highRiskFields.includes(params.field);

  // Estimated impact
  let estimatedImpact = `${params.employeeCount} employee record${params.employeeCount === 1 ? "" : "s"} will be updated`;
  if (params.field === "salaryAmount" && params.percentage) {
    const direction = params.operation === "decrease" ? "decrease" : "increase";
    estimatedImpact += ` with a ${params.percentage}% salary ${direction}`;
  }

  return {
    score,
    level,
    factors,
    requiresApproval,
    complianceNotes,
    safeguards,
    undoWindow: "48 hours",
    estimatedImpact,
  };
}

/**
 * Calculate risk for data deletion operations
 */
export function assessDeletionRisk(params: {
  recordType: string;
  recordCount: number;
  hasDependencies: boolean;
  hasAuditTrail: boolean;
}): RiskAssessment {
  const factors: RiskFactor[] = [];
  let score = 5; // Base score for deletion is already elevated

  // Volume
  if (params.recordCount > 10) {
    factors.push({
      description: `Bulk deletion of ${params.recordCount} records`,
      severity: "critical",
      mitigation: "Consider archiving instead of permanent deletion"
    });
    score += 3;
  } else {
    factors.push({
      description: `Deletion of ${params.recordCount} record(s)`,
      severity: "high"
    });
    score += 2;
  }

  // Dependencies
  if (params.hasDependencies) {
    factors.push({
      description: "Records have dependent data that will also be affected",
      severity: "critical",
      mitigation: "Review cascade effects before proceeding"
    });
    score += 3;
  }

  // Audit trail
  if (!params.hasAuditTrail) {
    factors.push({
      description: "No audit trail exists for this record type",
      severity: "high",
      mitigation: "Document reason for deletion manually"
    });
    score += 2;
  }

  return {
    score,
    level: "critical", // Deletions are always critical
    factors,
    requiresApproval: true, // Deletions always require approval
    complianceNotes: [
      "Deletion is permanent and cannot be undone",
      "Ensure compliance with data retention policies",
      "Export data for archival before deletion if required"
    ],
    safeguards: [
      "⚠️ Requires super admin approval",
      "📋 Deletion will be logged in system audit",
      "🔒 Soft delete option available for some record types"
    ],
    undoWindow: "Not available (permanent)",
    estimatedImpact: `${params.recordCount} ${params.recordType} record(s) will be permanently deleted${params.hasDependencies ? " along with dependent data" : ""}`,
  };
}

/**
 * Format risk assessment for display
 */
export function formatRiskAssessment(assessment: RiskAssessment): string {
  const levelEmoji = {
    low: "🟢",
    medium: "🟡",
    high: "🟠",
    critical: "🔴"
  };

  let output = `### ${levelEmoji[assessment.level]} Risk Assessment: ${assessment.level.toUpperCase()}\n\n`;
  output += `**Risk Score**: ${assessment.score}/10\n\n`;
  
  output += `**Impact**: ${assessment.estimatedImpact}\n\n`;

  if (assessment.factors.length > 0) {
    output += `**Risk Factors**:\n`;
    assessment.factors.forEach(factor => {
      const factorEmoji = {
        low: "ℹ️",
        medium: "⚠️",
        high: "🔶",
        critical: "🔴"
      };
      output += `${factorEmoji[factor.severity]} ${factor.description}\n`;
      if (factor.mitigation) {
        output += `  _Mitigation: ${factor.mitigation}_\n`;
      }
    });
    output += `\n`;
  }

  if (assessment.complianceNotes.length > 0) {
    output += `**Compliance & Legal**:\n`;
    assessment.complianceNotes.forEach(note => {
      output += `- ⚖️ ${note}\n`;
    });
    output += `\n`;
  }

  if (assessment.safeguards.length > 0) {
    output += `**Safeguards in Place**:\n`;
    assessment.safeguards.forEach(safeguard => {
      output += `${safeguard}\n`;
    });
    output += `\n`;
  }

  if (assessment.requiresApproval) {
    output += `🔐 **Approval Required**: This operation requires authorization from a super admin before execution.\n\n`;
  }

  output += `**Undo Window**: ${assessment.undoWindow}\n`;

  return output;
}
