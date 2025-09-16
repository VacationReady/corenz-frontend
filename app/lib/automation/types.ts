/**
 * Automation Worker System Types
 *
 * Core types and interfaces for the automation worker system.
 * Provides type safety for triggers, actions, and job processing.
 */

import { AutomationTriggerType, AutomationJobStatus } from "@prisma/client";

// ============================================================================
// JOB SYSTEM TYPES
// ============================================================================

export interface AutomationJob {
  id: string;
  ruleId: string;
  companyId: string;
  triggerData: any;
  status: AutomationJobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  executionLog: any | null;
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobExecutionContext {
  jobId: string;
  ruleId: string;
  companyId: string;
  triggerData: any;
  attempt: number;
  logger: JobLogger;
}

export interface JobLogger {
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: Error, data?: any) => void;
  debug: (message: string, data?: any) => void;
}

// ============================================================================
// TRIGGER TYPES
// ============================================================================

export interface TriggerEvaluationResult {
  matches: boolean;
  matchingEntities: any[];
  metadata?: any;
}

export interface TriggerHandler {
  type: AutomationTriggerType;
  evaluate: (
    triggerConfig: any,
    companyId: string,
  ) => Promise<TriggerEvaluationResult>;
  validateConfig: (config: any) => boolean;
}

// Document expiry trigger data
export interface DocumentExpiryTriggerData {
  employmentCheckId: string;
  employeeId: string;
  documentType: string;
  expiryDate: Date;
  daysBefore: number;
}

// Form submission trigger data
export interface FormSubmissionTriggerData {
  formId: string;
  employeeId: string;
  submissionId: string;
  submittedAt: Date;
  formData: any;
}

// Onboarding step completion trigger data
export interface OnboardingStepCompletedTriggerData {
  stepInstanceId: string;
  stepId: string;
  employeeId: string;
  templateId: string;
  stepType: string;
  completedAt: Date;
}

// Employee creation trigger data
export interface EmployeeCreatedTriggerData {
  employeeId: string;
  userId: string;
  departmentId?: string;
  jobRoleId?: string;
  createdAt: Date;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface ActionExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface ActionExecutor {
  type: string;
  execute: (
    config: any,
    context: ActionExecutionContext,
  ) => Promise<ActionExecutionResult>;
  validateConfig: (config: any) => boolean;
}

export interface ActionExecutionContext {
  companyId: string;
  triggerData: any;
  employeeId?: string;
  logger: JobLogger;
}

// Task creation action config
export interface CreateTaskActionConfig {
  title: string;
  description?: string;
  assigneeType: "employee" | "manager" | "hr" | "specific";
  assigneeId?: string;
  dueDays?: number;
}

// Notification action config
export interface SendNotificationActionConfig {
  channels: ("email" | "slack" | "teams")[];
  recipientType: "employee" | "manager" | "hr" | "specific";
  recipients?: string[];
  subject: string;
  message: string;
}

// Onboarding template action config
export interface StartOnboardingActionConfig {
  templateId: string;
}

// Field update action config
export interface UpdateFieldActionConfig {
  field: string;
  value: any;
}

// ============================================================================
// CONDITION TYPES
// ============================================================================

export interface ConditionEvaluationResult {
  matches: boolean;
  reason?: string;
}

export interface ConditionEvaluator {
  type: string;
  evaluate: (
    config: any,
    context: ConditionEvaluationContext,
  ) => Promise<ConditionEvaluationResult>;
  validateConfig: (config: any) => boolean;
}

export interface ConditionEvaluationContext {
  companyId: string;
  triggerData: any;
  employeeId?: string;
  employee?: any;
}

// ============================================================================
// WORKER CONFIGURATION
// ============================================================================

export interface WorkerConfig {
  maxConcurrentJobs: number;
  pollIntervalMs: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  jobTimeoutMs: number;
  enableMetrics: boolean;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerResetTimeMs: number;
}

export interface WorkerMetrics {
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  jobsRetried: number;
  averageExecutionTime: number;
  lastProcessedAt?: Date;
  isHealthy: boolean;
  circuitBreakerOpen: boolean;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
  enabled: boolean;
  maxJobsPerMinute: number;
  maxJobsPerHour: number;
  burstLimit: number;
}

export interface RateLimitState {
  currentMinuteJobs: number;
  currentHourJobs: number;
  currentBurst: number;
  lastResetMinute: Date;
  lastResetHour: Date;
}

