/**
 * Automation Test Simulator
 * 
 * Provides dry-run execution of workflows with mock clients for notifications,
 * tasks, and integrations. Executes the full workflow logic without side effects.
 */

import { prisma } from "@/lib/prisma";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import type { ActionExecutionContext, JobLogger } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface TestRunConfig {
  workflowId?: string;
  workflowDefinition?: {
    nodes: any[];
    edges: any[];
  };
  triggerType: string;
  triggerConfig: any;
  conditions?: any[];
  actions?: any[];
  skipDelays?: boolean;
  inputOverrides?: {
    employeeId?: string;
    formSubmissionId?: string;
    [key: string]: any;
  };
}

export interface TestStepLog {
  stepId: string;
  nodeId: string;
  nodeType: "trigger" | "condition" | "action" | "delay" | "branch" | "loop";
  status: "pending" | "running" | "success" | "failed" | "skipped";
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number;
  details?: any;
  error?: string;
  message?: string;
}

export interface TestRunResult {
  sessionId: string;
  status: "pending" | "running" | "completed" | "failed";
  steps: TestStepLog[];
  outputs: {
    notifications: MockNotification[];
    tasks: MockTask[];
    webhooks: MockWebhook[];
    fieldUpdates: MockFieldUpdate[];
  };
  summary?: {
    totalSteps: number;
    successSteps: number;
    failedSteps: number;
    duration: number;
    triggeredAt: Date;
    completedAt?: Date;
  };
  error?: string;
}

export interface MockNotification {
  id: string;
  simulated: true;
  channel: string;
  recipientType: string;
  recipients: string[];
  subject: string;
  message: string;
  timestamp: Date;
}

export interface MockTask {
  id: string;
  simulated: true;
  title: string;
  description?: string;
  assignedTo: string;
  dueDate?: Date;
  timestamp: Date;
}

export interface MockWebhook {
  id: string;
  simulated: true;
  url: string;
  method: string;
  payload: any;
  timestamp: Date;
}

export interface MockFieldUpdate {
  id: string;
  simulated: true;
  employeeId: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

// ============================================================================
// TEST SIMULATOR CLASS
// ============================================================================

export class AutomationTestSimulator {
  private sessions: Map<string, TestRunResult> = new Map();
  private emitters: Map<string, EventEmitter> = new Map();

  /**
   * Start a test run and return session ID
   */
  async startTestRun(
    config: TestRunConfig,
    companyId: string,
    userId: string
  ): Promise<string> {
    const sessionId = uuidv4();
    const emitter = new EventEmitter();
    
    const initialResult: TestRunResult = {
      sessionId,
      status: "pending",
      steps: [],
      outputs: {
        notifications: [],
        tasks: [],
        webhooks: [],
        fieldUpdates: [],
      },
    };

    this.sessions.set(sessionId, initialResult);
    this.emitters.set(sessionId, emitter);

    // Start execution asynchronously
    this.executeTest(sessionId, config, companyId, userId).catch((error) => {
      console.error(`Test execution failed for session ${sessionId}:`, error);
      this.updateSession(sessionId, { status: "failed", error: error.message });
    });

    return sessionId;
  }

  /**
   * Get test run result
   */
  getTestRun(sessionId: string): TestRunResult | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Subscribe to test run events
   */
  subscribe(sessionId: string, callback: (data: any) => void): () => void {
    const emitter = this.emitters.get(sessionId);
    if (!emitter) return () => {};

    emitter.on("update", callback);
    return () => emitter.off("update", callback);
  }

  /**
   * Execute the test workflow
   */
  private async executeTest(
    sessionId: string,
    config: TestRunConfig,
    companyId: string,
    userId: string
  ): Promise<void> {
    this.updateSession(sessionId, { status: "running" });
    const startTime = Date.now();

    try {
      // Load workflow definition
      let workflowDef = config.workflowDefinition;
      
      if (!workflowDef && config.workflowId) {
        const rule = await prisma.automationRule.findFirst({
          where: { id: config.workflowId, companyId },
        });
        
        if (!rule) {
          throw new Error("Workflow not found");
        }
        
        workflowDef = (rule.workflowDefinition as any) || {
          nodes: [],
          edges: [],
        };
      }

      // Build execution context with mock clients
      const mockContext = this.createMockContext(sessionId, companyId, config);
      
      // Execute workflow nodes
      if (workflowDef && workflowDef.nodes && workflowDef.nodes.length > 0) {
        await this.executeNodeBasedWorkflow(sessionId, workflowDef, mockContext, config);
      } else {
        // Fallback to legacy form-based workflow
        await this.executeLegacyWorkflow(sessionId, config, mockContext);
      }

      // Calculate summary
      const result = this.sessions.get(sessionId)!;
      const duration = Date.now() - startTime;
      
      this.updateSession(sessionId, {
        status: "completed",
        summary: {
          totalSteps: result.steps.length,
          successSteps: result.steps.filter((s) => s.status === "success").length,
          failedSteps: result.steps.filter((s) => s.status === "failed").length,
          duration,
          triggeredAt: new Date(startTime),
          completedAt: new Date(),
        },
      });
    } catch (error: any) {
      this.updateSession(sessionId, {
        status: "failed",
        error: error.message || "Test execution failed",
      });
    }
  }

  /**
   * Execute node-based workflow (visual canvas)
   */
  private async executeNodeBasedWorkflow(
    sessionId: string,
    workflowDef: any,
    mockContext: any,
    config: TestRunConfig
  ): Promise<void> {
    const { nodes, edges } = workflowDef;
    
    // Find trigger node
    const triggerNode = nodes.find((n: any) => n.type === "trigger");
    if (!triggerNode) {
      throw new Error("No trigger node found");
    }

    // Execute from trigger
    await this.executeNode(sessionId, triggerNode, nodes, edges, mockContext, config);
  }

  /**
   * Execute a single node and its descendants
   */
  private async executeNode(
    sessionId: string,
    node: any,
    allNodes: any[],
    edges: any[],
    mockContext: any,
    config: TestRunConfig,
    loopContext?: { index: number; total: number }
  ): Promise<boolean> {
    const stepId = `${node.id}-${Date.now()}`;
    const startTime = Date.now();

    // Add step
    this.addStep(sessionId, {
      stepId,
      nodeId: node.id,
      nodeType: node.type,
      status: "running",
      startedAt: new Date(),
      message: `Executing ${node.type} node`,
    });

    try {
      let shouldContinue = true;

      // Execute based on node type
      switch (node.type) {
        case "trigger":
          await this.executeTriggerNode(sessionId, node, mockContext);
          break;

        case "condition":
          shouldContinue = await this.executeConditionNode(
            sessionId,
            node,
            mockContext
          );
          break;

        case "action":
          await this.executeActionNode(sessionId, node, mockContext);
          break;

        case "delay":
          await this.executeDelayNode(sessionId, node, config.skipDelays || false);
          break;

        case "branch":
          await this.executeBranchNode(
            sessionId,
            node,
            allNodes,
            edges,
            mockContext,
            config
          );
          break;

        case "loop":
          await this.executeLoopNode(
            sessionId,
            node,
            allNodes,
            edges,
            mockContext,
            config
          );
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Mark as success
      this.updateStep(sessionId, stepId, {
        status: shouldContinue ? "success" : "skipped",
        finishedAt: new Date(),
        duration: Date.now() - startTime,
      });

      // Execute next nodes if not a branch/loop (they handle their own children)
      if (shouldContinue && !["branch", "loop"].includes(node.type)) {
        const nextEdges = edges.filter((e: any) => e.source === node.id);
        for (const edge of nextEdges) {
          const nextNode = allNodes.find((n: any) => n.id === edge.target);
          if (nextNode) {
            await this.executeNode(
              sessionId,
              nextNode,
              allNodes,
              edges,
              mockContext,
              config,
              loopContext
            );
          }
        }
      }

      return shouldContinue;
    } catch (error: any) {
      this.updateStep(sessionId, stepId, {
        status: "failed",
        finishedAt: new Date(),
        duration: Date.now() - startTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute trigger node
   */
  private async executeTriggerNode(
    sessionId: string,
    node: any,
    mockContext: any
  ): Promise<void> {
    const triggerType = node.data?.config?.triggerType || "MANUAL";
    
    this.updateStep(sessionId, `${node.id}-${Date.now()}`, {
      details: {
        triggerType,
        config: node.data?.config || {},
        note: "Trigger simulated - would normally match based on trigger conditions",
      },
    });
  }

  /**
   * Execute condition node
   */
  private async executeConditionNode(
    sessionId: string,
    node: any,
    mockContext: any
  ): Promise<boolean> {
    const conditionType = node.data?.config?.conditionType;
    const conditionConfig = node.data?.config || {};

    // Simulate condition evaluation
    // In a real implementation, this would check against actual employee data
    const matches = await this.evaluateCondition(
      conditionType,
      conditionConfig,
      mockContext
    );

    this.updateStep(sessionId, `${node.id}-${Date.now()}`, {
      details: {
        conditionType,
        config: conditionConfig,
        matches,
        note: matches ? "Condition passed" : "Condition failed",
      },
    });

    return matches;
  }

  /**
   * Execute action node
   */
  private async executeActionNode(
    sessionId: string,
    node: any,
    mockContext: any
  ): Promise<void> {
    const actionType = node.data?.config?.actionType || node.data?.config?.type;
    const actionConfig = node.data?.config || {};

    // Execute mock action based on type
    switch (actionType) {
      case "send_notification":
        const notification: MockNotification = {
          id: uuidv4(),
          simulated: true,
          channel: actionConfig.channels?.[0] || "email",
          recipientType: actionConfig.recipientType || "employee",
          recipients: actionConfig.recipients || ["test@example.com"],
          subject: actionConfig.subject || "Test Notification",
          message: actionConfig.message || "Test message",
          timestamp: new Date(),
        };
        this.addOutput(sessionId, "notifications", notification);
        break;

      case "create_task":
        const task: MockTask = {
          id: uuidv4(),
          simulated: true,
          title: actionConfig.title || "Test Task",
          description: actionConfig.description,
          assignedTo: actionConfig.assigneeId || "test-user",
          dueDate: actionConfig.dueDays
            ? new Date(Date.now() + actionConfig.dueDays * 24 * 60 * 60 * 1000)
            : undefined,
          timestamp: new Date(),
        };
        this.addOutput(sessionId, "tasks", task);
        break;

      case "webhook":
        const webhook: MockWebhook = {
          id: uuidv4(),
          simulated: true,
          url: actionConfig.url || "https://example.com/webhook",
          method: actionConfig.method || "POST",
          payload: actionConfig.payload || {},
          timestamp: new Date(),
        };
        this.addOutput(sessionId, "webhooks", webhook);
        break;

      case "update_field":
        const fieldUpdate: MockFieldUpdate = {
          id: uuidv4(),
          simulated: true,
          employeeId: mockContext.employeeId || "test-employee",
          field: actionConfig.field || "unknown",
          oldValue: "current-value",
          newValue: actionConfig.value,
          timestamp: new Date(),
        };
        this.addOutput(sessionId, "fieldUpdates", fieldUpdate);
        break;
    }

    this.updateStep(sessionId, `${node.id}-${Date.now()}`, {
      details: {
        actionType,
        config: actionConfig,
        note: "Action simulated - no real changes made",
      },
    });
  }

  /**
   * Execute delay node
   */
  private async executeDelayNode(
    sessionId: string,
    node: any,
    skipDelays: boolean
  ): Promise<void> {
    const config = node.data?.config || {};
    const totalMs =
      (config.days || 0) * 24 * 60 * 60 * 1000 +
      (config.hours || 0) * 60 * 60 * 1000 +
      (config.minutes || 0) * 60 * 1000 +
      (config.seconds || 0) * 1000;

    if (skipDelays) {
      this.updateStep(sessionId, `${node.id}-${Date.now()}`, {
        details: {
          originalDelay: totalMs,
          actualDelay: 0,
          note: "Delay skipped in test mode",
        },
      });
    } else {
      // Actually wait (but cap at 5 seconds for testing)
      const cappedDelay = Math.min(totalMs, 5000);
      await new Promise((resolve) => setTimeout(resolve, cappedDelay));
      
      this.updateStep(sessionId, `${node.id}-${Date.now()}`, {
        details: {
          originalDelay: totalMs,
          actualDelay: cappedDelay,
          note: cappedDelay < totalMs ? "Delay capped at 5s for testing" : "Delay completed",
        },
      });
    }
  }

  /**
   * Execute branch node
   */
  private async executeBranchNode(
    sessionId: string,
    node: any,
    allNodes: any[],
    edges: any[],
    mockContext: any,
    config: TestRunConfig
  ): Promise<void> {
    const branchType = node.data?.config?.type || "parallel";
    const childEdges = edges.filter((e: any) => e.source === node.id);
    
    if (branchType === "parallel") {
      // Execute all branches in parallel
      await Promise.all(
        childEdges.map((edge: any) => {
          const childNode = allNodes.find((n: any) => n.id === edge.target);
          if (childNode) {
            return this.executeNode(
              sessionId,
              childNode,
              allNodes,
              edges,
              mockContext,
              config
            );
          }
        })
      );
    } else {
      // Execute first branch only
      if (childEdges[0]) {
        const childNode = allNodes.find((n: any) => n.id === childEdges[0].target);
        if (childNode) {
          await this.executeNode(
            sessionId,
            childNode,
            allNodes,
            edges,
            mockContext,
            config
          );
        }
      }
    }

    this.updateStep(sessionId, `${node.id}-${Date.now()}`, {
      details: {
        branchType,
        branchCount: childEdges.length,
      },
    });
  }

  /**
   * Execute loop node
   */
  private async executeLoopNode(
    sessionId: string,
    node: any,
    allNodes: any[],
    edges: any[],
    mockContext: any,
    config: TestRunConfig
  ): Promise<void> {
    const iterations = node.data?.config?.iterations || 1;
    const childEdges = edges.filter((e: any) => e.source === node.id);

    for (let i = 0; i < iterations; i++) {
      for (const edge of childEdges) {
        const childNode = allNodes.find((n: any) => n.id === edge.target);
        if (childNode) {
          await this.executeNode(
            sessionId,
            childNode,
            allNodes,
            edges,
            { ...mockContext, loopIndex: i },
            config,
            { index: i, total: iterations }
          );
        }
      }
    }

    this.updateStep(sessionId, `${node.id}-${Date.now()}`, {
      details: {
        iterations,
        completed: iterations,
      },
    });
  }

  /**
   * Execute legacy form-based workflow
   */
  private async executeLegacyWorkflow(
    sessionId: string,
    config: TestRunConfig,
    mockContext: any
  ): Promise<void> {
    // Trigger
    this.addStep(sessionId, {
      stepId: `trigger-${Date.now()}`,
      nodeId: "trigger-legacy",
      nodeType: "trigger",
      status: "running",
      startedAt: new Date(),
    });

    this.updateStep(sessionId, `trigger-${Date.now()}`, {
      status: "success",
      finishedAt: new Date(),
      duration: 0,
      details: { triggerType: config.triggerType },
    });

    // Conditions
    if (config.conditions && config.conditions.length > 0) {
      for (let i = 0; i < config.conditions.length; i++) {
        const condition = config.conditions[i];
        const stepId = `condition-${i}-${Date.now()}`;
        
        this.addStep(sessionId, {
          stepId,
          nodeId: `condition-${i}`,
          nodeType: "condition",
          status: "running",
          startedAt: new Date(),
        });

        const matches = await this.evaluateCondition(
          condition.type,
          condition.config,
          mockContext
        );

        this.updateStep(sessionId, stepId, {
          status: matches ? "success" : "skipped",
          finishedAt: new Date(),
          duration: 0,
          details: { condition, matches },
        });

        if (!matches) break; // Stop if condition fails
      }
    }

    // Actions
    if (config.actions && config.actions.length > 0) {
      for (let i = 0; i < config.actions.length; i++) {
        const action = config.actions[i];
        const stepId = `action-${i}-${Date.now()}`;
        
        this.addStep(sessionId, {
          stepId,
          nodeId: `action-${i}`,
          nodeType: "action",
          status: "running",
          startedAt: new Date(),
        });

        await this.executeActionNode(
          sessionId,
          { id: `action-${i}`, data: { config: action.config }, type: "action" },
          mockContext
        );

        this.updateStep(sessionId, stepId, {
          status: "success",
          finishedAt: new Date(),
          duration: 0,
          details: { action },
        });
      }
    }
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    conditionType: string,
    config: any,
    context: any
  ): Promise<boolean> {
    // For testing, we simulate condition evaluation
    // In production, this would check actual employee data
    
    switch (conditionType) {
      case "department":
      case "jobRole":
      case "role":
        return true; // Simulate pass for common conditions
      
      case "dateWindow":
        const now = new Date();
        const start = config.startDate ? new Date(config.startDate) : null;
        const end = config.endDate ? new Date(config.endDate) : null;
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
      
      default:
        return true; // Default to passing
    }
  }

  /**
   * Create mock execution context
   */
  private createMockContext(
    sessionId: string,
    companyId: string,
    config: TestRunConfig
  ): any {
    return {
      companyId,
      employeeId: config.inputOverrides?.employeeId || `test-employee-${sessionId}`,
      triggerData: config.inputOverrides || {},
      sessionId,
      isMock: true,
    };
  }

  /**
   * Helper methods for managing session state
   */
  private updateSession(
    sessionId: string,
    updates: Partial<TestRunResult>
  ): void {
    const current = this.sessions.get(sessionId);
    if (!current) return;

    const updated = { ...current, ...updates };
    this.sessions.set(sessionId, updated);
    
    const emitter = this.emitters.get(sessionId);
    if (emitter) {
      emitter.emit("update", updated);
    }
  }

  private addStep(sessionId: string, step: TestStepLog): void {
    const current = this.sessions.get(sessionId);
    if (!current) return;

    current.steps.push(step);
    this.updateSession(sessionId, { steps: current.steps });
  }

  private updateStep(
    sessionId: string,
    stepId: string,
    updates: Partial<TestStepLog>
  ): void {
    const current = this.sessions.get(sessionId);
    if (!current) return;

    const stepIndex = current.steps.findIndex((s) => s.stepId === stepId);
    if (stepIndex === -1) return;

    current.steps[stepIndex] = { ...current.steps[stepIndex], ...updates };
    this.updateSession(sessionId, { steps: current.steps });
  }

  private addOutput(
    sessionId: string,
    outputType: keyof TestRunResult["outputs"],
    output: any
  ): void {
    const current = this.sessions.get(sessionId);
    if (!current) return;

    current.outputs[outputType].push(output);
    this.updateSession(sessionId, { outputs: current.outputs });
  }

  /**
   * Cleanup old sessions (call periodically)
   */
  cleanupOldSessions(maxAgeMs: number = 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [sessionId, result] of this.sessions.entries()) {
      const age = now - (result.summary?.triggeredAt?.getTime() || now);
      if (age > maxAgeMs) {
        this.sessions.delete(sessionId);
        const emitter = this.emitters.get(sessionId);
        if (emitter) {
          emitter.removeAllListeners();
          this.emitters.delete(sessionId);
        }
      }
    }
  }
}

// Global singleton instance
export const testSimulator = new AutomationTestSimulator();

// Cleanup old sessions every 10 minutes
if (typeof window === "undefined") {
  setInterval(() => {
    testSimulator.cleanupOldSessions();
  }, 10 * 60 * 1000);
}

