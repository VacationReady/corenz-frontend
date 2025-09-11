/**
 * Automation Rule Evaluator
 * 
 * Handles evaluation of automation rules, including trigger matching
 * and condition checking to determine if actions should be executed.
 */

import { prisma } from "@/lib/prisma";
import { AutomationTriggerType } from "@prisma/client";
import {
  TriggerHandler,
  TriggerEvaluationResult,
  ConditionEvaluator,
  ConditionEvaluationResult,
  ConditionEvaluationContext,
  JobLogger,
  DocumentExpiryTriggerData,
  FormSubmissionTriggerData,
  OnboardingStepCompletedTriggerData,
  EmployeeCreatedTriggerData,
} from "./types";

export class AutomationRuleEvaluator {
  private triggerHandlers: Map<AutomationTriggerType, TriggerHandler>;
  private conditionEvaluators: Map<string, ConditionEvaluator>;
  private logger: JobLogger;

  constructor(logger?: JobLogger) {
    this.logger = logger || this.createDefaultLogger();
    this.triggerHandlers = new Map();
    this.conditionEvaluators = new Map();
    
    this.initializeTriggerHandlers();
    this.initializeConditionEvaluators();
  }

  /**
   * Evaluate if a trigger should fire for a given rule
   */
  async evaluateTrigger(
    triggerType: AutomationTriggerType,
    triggerConfig: any,
    companyId: string
  ): Promise<TriggerEvaluationResult> {
    const handler = this.triggerHandlers.get(triggerType);
    if (!handler) {
      throw new Error(`No handler found for trigger type: ${triggerType}`);
    }

    try {
      if (!handler.validateConfig(triggerConfig)) {
        throw new Error(`Invalid trigger configuration for type: ${triggerType}`);
      }

      const result = await handler.evaluate(triggerConfig, companyId);
      
      this.logger.debug(`Trigger evaluation completed`, {
        triggerType,
        companyId,
        matches: result.matches,
        entityCount: result.matchingEntities.length,
      });

      return result;
    } catch (error) {
      this.logger.error("Trigger evaluation failed", error as Error, {
        triggerType,
        companyId,
        triggerConfig,
      });
      throw error;
    }
  }

  /**
   * Evaluate all conditions for a rule
   */
  async evaluateConditions(
    conditions: any[],
    context: ConditionEvaluationContext
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions means always pass
    }

    try {
      const results = await Promise.all(
        conditions.map(async (condition) => {
          const evaluator = this.conditionEvaluators.get(condition.type);
          if (!evaluator) {
            this.logger.warn(`No evaluator found for condition type: ${condition.type}`);
            return { matches: false, reason: "Unknown condition type" };
          }

          if (!evaluator.validateConfig(condition.config)) {
            this.logger.warn(`Invalid condition configuration`, {
              type: condition.type,
              config: condition.config,
            });
            return { matches: false, reason: "Invalid configuration" };
          }

          return await evaluator.evaluate(condition.config, context);
        })
      );

      // All conditions must pass (AND logic)
      const allMatch = results.every((result) => result.matches);

      this.logger.debug(`Condition evaluation completed`, {
        conditionCount: conditions.length,
        allMatch,
        results: results.map((r, i) => ({
          condition: i,
          matches: r.matches,
          reason: r.reason,
        })),
      });

      return allMatch;
    } catch (error) {
      this.logger.error("Condition evaluation failed", error as Error, {
        conditions,
        context,
      });
      return false;
    }
  }

  /**
   * Initialize trigger handlers
   */
  private initializeTriggerHandlers(): void {
    // Document expiry trigger
    this.triggerHandlers.set(AutomationTriggerType.DOCUMENT_EXPIRING, {
      type: AutomationTriggerType.DOCUMENT_EXPIRING,
      validateConfig: (config) => {
        return typeof config.daysBefore === "number" && config.daysBefore > 0;
      },
      evaluate: async (config, companyId) => {
        const daysBefore = config.daysBefore;
        const documentTypes = config.documentTypes || [];
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysBefore);

        const whereClause: any = {
          employee: {
            companyId,
            isActive: true,
          },
          expiryDate: {
            gte: new Date(),
            lte: expiryDate,
          },
        };

        // Filter by document types if specified
        if (documentTypes.length > 0) {
          whereClause.typeOfCheck = { in: documentTypes };
        }

        const expiringDocs = await prisma.employmentCheck.findMany({
          where: whereClause,
          include: {
            employee: {
              include: {
                user: true,
              },
            },
          },
        });

        return {
          matches: expiringDocs.length > 0,
          matchingEntities: expiringDocs.map((doc) => ({
            type: "document_expiry",
            data: {
              employmentCheckId: doc.id,
              employeeId: doc.employeeId,
              documentType: doc.typeOfCheck,
              expiryDate: doc.expiryDate,
              daysBefore,
            } as DocumentExpiryTriggerData,
          })),
          metadata: {
            daysBefore,
            documentTypes,
            expiringCount: expiringDocs.length,
          },
        };
      },
    });

    // Form submission trigger
    this.triggerHandlers.set(AutomationTriggerType.FORM_SUBMITTED, {
      type: AutomationTriggerType.FORM_SUBMITTED,
      validateConfig: (config) => {
        return typeof config.formId === "string" && config.formId.length > 0;
      },
      evaluate: async (config, companyId) => {
        const { formId, timeWindowHours = 24 } = config;
        
        const since = new Date();
        since.setHours(since.getHours() - timeWindowHours);

        const recentSubmissions = await prisma.formSubmission.findMany({
          where: {
            formId,
            employee: {
              companyId,
            },
            submittedAt: {
              gte: since,
            },
          },
          include: {
            employee: {
              include: {
                user: true,
              },
            },
            form: true,
          },
        });

        return {
          matches: recentSubmissions.length > 0,
          matchingEntities: recentSubmissions.map((submission) => ({
            type: "form_submission",
            data: {
              formId: submission.formId,
              employeeId: submission.employeeId,
              submissionId: submission.id,
              submittedAt: submission.submittedAt,
              formData: submission.data,
            } as FormSubmissionTriggerData,
          })),
          metadata: {
            formId,
            timeWindowHours,
            submissionCount: recentSubmissions.length,
          },
        };
      },
    });

    // Onboarding step completion trigger
    this.triggerHandlers.set(AutomationTriggerType.ONBOARDING_STEP_COMPLETED, {
      type: AutomationTriggerType.ONBOARDING_STEP_COMPLETED,
      validateConfig: (config) => {
        return !config.stepType || typeof config.stepType === "string";
      },
      evaluate: async (config, companyId) => {
        const { stepType, timeWindowHours = 24 } = config;
        
        const since = new Date();
        since.setHours(since.getHours() - timeWindowHours);

        const whereClause: any = {
          status: "completed",
          onboardingInstance: {
            employee: {
              companyId,
              isActive: true,
            },
          },
          completedAt: {
            gte: since,
          },
        };

        // Filter by step type if specified
        if (stepType) {
          whereClause.step = {
            type: stepType,
          };
        }

        const completedSteps = await prisma.onboardingStepInstance.findMany({
          where: whereClause,
          include: {
            step: true,
            onboardingInstance: {
              include: {
                employee: {
                  include: {
                    user: true,
                  },
                },
                template: true,
              },
            },
          },
        });

        return {
          matches: completedSteps.length > 0,
          matchingEntities: completedSteps.map((stepInstance) => ({
            type: "onboarding_step_completed",
            data: {
              stepInstanceId: stepInstance.id,
              stepId: stepInstance.stepId,
              employeeId: stepInstance.onboardingInstance.employeeId,
              templateId: stepInstance.onboardingInstance.templateId,
              stepType: stepInstance.step.type,
              completedAt: stepInstance.completedAt!,
            } as OnboardingStepCompletedTriggerData,
          })),
          metadata: {
            stepType,
            timeWindowHours,
            completedCount: completedSteps.length,
          },
        };
      },
    });

    // Employee creation trigger
    this.triggerHandlers.set(AutomationTriggerType.EMPLOYEE_CREATED, {
      type: AutomationTriggerType.EMPLOYEE_CREATED,
      validateConfig: () => true, // No specific config needed
      evaluate: async (config, companyId) => {
        const { timeWindowHours = 24 } = config;
        
        const since = new Date();
        since.setHours(since.getHours() - timeWindowHours);

        const newEmployees = await prisma.employee.findMany({
          where: {
            companyId,
            isActive: true,
            user: {
              createdAt: {
                gte: since,
              },
            },
          },
          include: {
            user: true,
            department: true,
            jobRole: true,
          },
        });

        return {
          matches: newEmployees.length > 0,
          matchingEntities: newEmployees.map((employee) => ({
            type: "employee_created",
            data: {
              employeeId: employee.id,
              userId: employee.userId,
              departmentId: employee.departmentId,
              jobRoleId: employee.jobRoleId,
              createdAt: employee.user.createdAt,
            } as EmployeeCreatedTriggerData,
          })),
          metadata: {
            timeWindowHours,
            newEmployeeCount: newEmployees.length,
          },
        };
      },
    });
  }

  /**
   * Initialize condition evaluators
   */
  private initializeConditionEvaluators(): void {
    // Role condition
    this.conditionEvaluators.set("role", {
      type: "role",
      validateConfig: (config) => {
        return config.operator && config.value && Array.isArray(config.value);
      },
      evaluate: async (config, context) => {
        if (!context.employee) {
          return { matches: false, reason: "Employee data not available" };
        }

        const { operator, value } = config;
        const employeeRole = context.employee.user?.role;

        let matches = false;
        switch (operator) {
          case "equals":
            matches = value.length === 1 && value[0] === employeeRole;
            break;
          case "not_equals":
            matches = value.length === 1 && value[0] !== employeeRole;
            break;
          case "in":
            matches = value.includes(employeeRole);
            break;
          default:
            return { matches: false, reason: "Unknown operator" };
        }

        return {
          matches,
          reason: matches ? undefined : `Role ${employeeRole} does not match condition`,
        };
      },
    });

    // Department condition
    this.conditionEvaluators.set("department", {
      type: "department",
      validateConfig: (config) => {
        return config.operator && config.value && Array.isArray(config.value);
      },
      evaluate: async (config, context) => {
        if (!context.employee) {
          return { matches: false, reason: "Employee data not available" };
        }

        const { operator, value } = config;
        const employeeDepartmentId = context.employee.departmentId;

        if (!employeeDepartmentId) {
          return { matches: false, reason: "Employee has no department assigned" };
        }

        let matches = false;
        switch (operator) {
          case "equals":
            matches = value.length === 1 && value[0] === employeeDepartmentId;
            break;
          case "not_equals":
            matches = value.length === 1 && value[0] !== employeeDepartmentId;
            break;
          case "in":
            matches = value.includes(employeeDepartmentId);
            break;
          default:
            return { matches: false, reason: "Unknown operator" };
        }

        return {
          matches,
          reason: matches ? undefined : `Department ${employeeDepartmentId} does not match condition`,
        };
      },
    });

    // Job role condition
    this.conditionEvaluators.set("jobRole", {
      type: "jobRole",
      validateConfig: (config) => {
        return config.operator && config.value && Array.isArray(config.value);
      },
      evaluate: async (config, context) => {
        if (!context.employee) {
          return { matches: false, reason: "Employee data not available" };
        }

        const { operator, value } = config;
        const employeeJobRoleId = context.employee.jobRoleId;

        if (!employeeJobRoleId) {
          return { matches: false, reason: "Employee has no job role assigned" };
        }

        let matches = false;
        switch (operator) {
          case "equals":
            matches = value.length === 1 && value[0] === employeeJobRoleId;
            break;
          case "not_equals":
            matches = value.length === 1 && value[0] !== employeeJobRoleId;
            break;
          case "in":
            matches = value.includes(employeeJobRoleId);
            break;
          default:
            return { matches: false, reason: "Unknown operator" };
        }

        return {
          matches,
          reason: matches ? undefined : `Job role ${employeeJobRoleId} does not match condition`,
        };
      },
    });

    // Date window condition
    this.conditionEvaluators.set("dateWindow", {
      type: "dateWindow",
      validateConfig: (config) => {
        return config.startDate || config.endDate;
      },
      evaluate: async (config, context) => {
        const { startDate, endDate } = config;
        const now = new Date();

        let matches = true;

        if (startDate) {
          const start = new Date(startDate);
          matches = matches && now >= start;
        }

        if (endDate) {
          const end = new Date(endDate);
          matches = matches && now <= end;
        }

        return {
          matches,
          reason: matches ? undefined : "Current date is outside the specified window",
        };
      },
    });
  }

  /**
   * Create a default logger if none provided
   */
  private createDefaultLogger(): JobLogger {
    return {
      info: (message: string, data?: any) => {
        console.log(`[AutomationEvaluator] ${message}`, data ? JSON.stringify(data) : "");
      },
      warn: (message: string, data?: any) => {
        console.warn(`[AutomationEvaluator] ${message}`, data ? JSON.stringify(data) : "");
      },
      error: (message: string, error?: Error, data?: any) => {
        console.error(`[AutomationEvaluator] ${message}`, {
          error: error?.message,
          stack: error?.stack,
          data,
        });
      },
      debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(`[AutomationEvaluator] ${message}`, data ? JSON.stringify(data) : "");
        }
      },
    };
  }
}
