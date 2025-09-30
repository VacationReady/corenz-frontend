/**
 * Comprehensive test endpoint for the workflow execution engine
 * Tests all components: triggers, conditions, actions, delays, branches, loops
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { workflowEngine } from "@/lib/workflows/WorkflowExecutionEngine";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const testType = body.testType || "comprehensive";

    let results: any = {
      timestamp: new Date(),
      testType,
      tests: [],
    };

    switch (testType) {
      case "triggers":
        results.tests = await testTriggers(session.user.companyId);
        break;
      case "conditions":
        results.tests = await testConditions(session.user.companyId);
        break;
      case "actions":
        results.tests = await testActions(session.user.companyId);
        break;
      case "comprehensive":
        results.tests = [
          ...(await testTriggers(session.user.companyId)),
          ...(await testConditions(session.user.companyId)),
          ...(await testActions(session.user.companyId)),
          ...(await testComplexWorkflows(session.user.companyId)),
        ];
        break;
      default:
        return NextResponse.json({ error: "Invalid test type" }, { status: 400 });
    }

    // Calculate summary
    const summary = {
      total: results.tests.length,
      passed: results.tests.filter((t: any) => t.passed).length,
      failed: results.tests.filter((t: any) => !t.passed).length,
      successRate: 
        results.tests.length > 0
          ? ((results.tests.filter((t: any) => t.passed).length / results.tests.length) * 100).toFixed(1)
          : 0,
    };

    return NextResponse.json({
      ...results,
      summary,
    });
  } catch (error: any) {
    console.error("Test execution error:", error);
    return NextResponse.json(
      { error: error.message || "Test execution failed" },
      { status: 500 }
    );
  }
}

async function testTriggers(companyId: string): Promise<any[]> {
  const tests = [];

  // Test 1: Employee Created Trigger
  tests.push(await runTest("Employee Created Trigger", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Employee Created",
      triggerType: "EMPLOYEE_CREATED",
      triggerConfig: {},
      actions: [{
        type: "create_task",
        config: {
          title: "Test task for new employee",
          assigneeType: "hr",
        },
      }],
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "EMPLOYEE_CREATED",
      employeeId: "test-employee-id",
    });

    await cleanup(testWorkflow.id);
    return result.success;
  }));

  // Test 2: Scheduled Trigger
  tests.push(await runTest("Scheduled Trigger", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Scheduled",
      triggerType: "SCHEDULED",
      triggerConfig: {
        schedule: "0 9 * * *",
      },
      actions: [{
        type: "send_notification",
        config: {
          channels: ["email"],
          recipientType: "hr",
          subject: "Daily reminder",
          message: "This is a test",
        },
      }],
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "SCHEDULED",
      scheduledTime: new Date(),
    });

    await cleanup(testWorkflow.id);
    return result.success;
  }));

  // Test 3: Webhook Trigger
  tests.push(await runTest("Webhook Trigger", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Webhook",
      triggerType: "WEBHOOK",
      triggerConfig: {
        webhookKey: "test-key-123",
      },
      actions: [{
        type: "update_field",
        config: {
          field: "status",
          value: "webhook-triggered",
        },
      }],
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "WEBHOOK",
      payload: { test: "data" },
    });

    await cleanup(testWorkflow.id);
    return result.success;
  }));

  return tests;
}

async function testConditions(companyId: string): Promise<any[]> {
  const tests = [];

  // Create test employee
  const testEmployee = await prisma.employee.create({
    data: {
      id: uuidv4(),
      companyId,
      firstName: "Test",
      lastName: "Employee",
      email: `test-${Date.now()}@example.com`,
      contractType: "PERMANENT",
      startDate: new Date(),
    },
  });

  // Test 1: Department Condition
  tests.push(await runTest("Department Condition", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Department Condition",
      triggerType: "MANUAL",
      workflowDefinition: {
        nodes: [
          {
            id: "trigger-1",
            type: "trigger",
            position: { x: 0, y: 0 },
            data: { config: { triggerType: "MANUAL" } },
          },
          {
            id: "condition-1",
            type: "condition",
            position: { x: 0, y: 100 },
            data: {
              config: {
                conditionType: "department",
                operator: "equals",
                value: [testEmployee.departmentId],
              },
            },
          },
          {
            id: "action-1",
            type: "action",
            position: { x: 0, y: 200 },
            data: {
              config: {
                actionType: "create_task",
                title: "Condition passed",
              },
            },
          },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "condition-1" },
          { id: "e2", source: "condition-1", target: "action-1" },
        ],
      },
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      employeeId: testEmployee.id,
    });

    await cleanup(testWorkflow.id);
    return result.success;
  }));

  // Test 2: Probation Status Condition
  tests.push(await runTest("Probation Status Condition", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Probation Condition",
      workflowDefinition: {
        nodes: [
          {
            id: "trigger-1",
            type: "trigger",
            position: { x: 0, y: 0 },
            data: { config: { triggerType: "MANUAL" } },
          },
          {
            id: "condition-1",
            type: "condition",
            position: { x: 0, y: 100 },
            data: {
              config: {
                conditionType: "probationStatus",
                status: "in_probation",
              },
            },
          },
          {
            id: "action-1",
            type: "action",
            position: { x: 0, y: 200 },
            data: {
              config: {
                actionType: "send_notification",
                channels: ["email"],
                recipientType: "manager",
                subject: "Probation check",
                message: "Employee is in probation",
              },
            },
          },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "condition-1" },
          { id: "e2", source: "condition-1", target: "action-1" },
        ],
      },
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      employeeId: testEmployee.id,
    });

    await cleanup(testWorkflow.id);
    return result.success;
  }));

  // Cleanup test employee
  await prisma.employee.delete({ where: { id: testEmployee.id } });

  return tests;
}

async function testActions(companyId: string): Promise<any[]> {
  const tests = [];

  // Test 1: Send Notification Action
  tests.push(await runTest("Send Notification Action", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Send Notification",
      triggerType: "MANUAL",
      actions: [{
        type: "send_notification",
        config: {
          channels: ["email"],
          recipientType: "hr",
          subject: "Test Notification",
          message: "This is a test notification from the workflow engine",
        },
      }],
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "MANUAL",
    });

    await cleanup(testWorkflow.id);
    return result.success;
  }));

  // Test 2: Create Task Action
  tests.push(await runTest("Create Task Action", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Create Task",
      triggerType: "MANUAL",
      actions: [{
        type: "create_task",
        config: {
          title: "Test Task {{timestamp}}",
          description: "This task was created by the workflow engine",
          assigneeType: "hr",
          dueDays: 7,
          priority: "HIGH",
        },
      }],
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "MANUAL",
      timestamp: new Date().toISOString(),
    });

    // Verify task was created
    const task = await prisma.actionItem.findFirst({
      where: {
        companyId,
        title: { contains: "Test Task" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (task) {
      await prisma.actionItem.delete({ where: { id: task.id } });
    }

    await cleanup(testWorkflow.id);
    return result.success && !!task;
  }));

  // Test 3: Webhook Action
  tests.push(await runTest("Webhook Action", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Webhook Action",
      triggerType: "MANUAL",
      actions: [{
        type: "webhook",
        config: {
          url: "https://webhook.site/test",
          method: "POST",
          includeContext: true,
        },
      }],
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "MANUAL",
      testData: { foo: "bar" },
    });

    await cleanup(testWorkflow.id);
    return result.success;
  }));

  return tests;
}

async function testComplexWorkflows(companyId: string): Promise<any[]> {
  const tests = [];

  // Test 1: Workflow with Delay
  tests.push(await runTest("Workflow with Delay", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Delay",
      workflowDefinition: {
        nodes: [
          {
            id: "trigger-1",
            type: "trigger",
            position: { x: 0, y: 0 },
            data: { config: { triggerType: "MANUAL" } },
          },
          {
            id: "delay-1",
            type: "delay",
            position: { x: 0, y: 100 },
            data: {
              config: {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 1,
              },
            },
          },
          {
            id: "action-1",
            type: "action",
            position: { x: 0, y: 200 },
            data: {
              config: {
                actionType: "create_task",
                title: "Task after delay",
              },
            },
          },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "delay-1" },
          { id: "e2", source: "delay-1", target: "action-1" },
        ],
      },
    });

    const startTime = Date.now();
    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "MANUAL",
    });
    const duration = Date.now() - startTime;

    await cleanup(testWorkflow.id);
    return result.success && duration >= 1000; // Should take at least 1 second
  }));

  // Test 2: Workflow with Branch
  tests.push(await runTest("Workflow with Branch", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Branch",
      workflowDefinition: {
        nodes: [
          {
            id: "trigger-1",
            type: "trigger",
            position: { x: 0, y: 0 },
            data: { config: { triggerType: "MANUAL" } },
          },
          {
            id: "branch-1",
            type: "branch",
            position: { x: 0, y: 100 },
            data: {
              config: {
                type: "parallel",
              },
            },
          },
          {
            id: "action-1",
            type: "action",
            position: { x: -100, y: 200 },
            data: {
              config: {
                actionType: "create_task",
                title: "Branch 1 task",
              },
            },
          },
          {
            id: "action-2",
            type: "action",
            position: { x: 100, y: 200 },
            data: {
              config: {
                actionType: "create_task",
                title: "Branch 2 task",
              },
            },
          },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "branch-1" },
          { id: "e2", source: "branch-1", target: "action-1" },
          { id: "e3", source: "branch-1", target: "action-2" },
        ],
      },
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "MANUAL",
    });

    await cleanup(testWorkflow.id);
    // Should execute both branches
    return result.success && result.logs.filter((l: any) => l.status === "completed").length >= 4;
  }));

  // Test 3: Workflow with Loop
  tests.push(await runTest("Workflow with Loop", async () => {
    const testWorkflow = await createTestWorkflow(companyId, {
      name: "Test Loop",
      workflowDefinition: {
        nodes: [
          {
            id: "trigger-1",
            type: "trigger",
            position: { x: 0, y: 0 },
            data: { config: { triggerType: "MANUAL" } },
          },
          {
            id: "loop-1",
            type: "loop",
            position: { x: 0, y: 100 },
            data: {
              config: {
                iterations: 3,
              },
            },
          },
          {
            id: "action-1",
            type: "action",
            position: { x: 0, y: 200 },
            data: {
              config: {
                actionType: "create_task",
                title: "Loop iteration {{loopIndex}}",
              },
            },
          },
        ],
        edges: [
          { id: "e1", source: "trigger-1", target: "loop-1" },
          { id: "e2", source: "loop-1", target: "action-1" },
        ],
      },
    });

    const result = await workflowEngine.executeWorkflow(testWorkflow.id, {
      triggerType: "MANUAL",
    });

    await cleanup(testWorkflow.id);
    // Should execute action 3 times
    return result.success && result.logs.filter((l: any) => l.nodeId === "action-1").length === 3;
  }));

  return tests;
}

async function runTest(name: string, testFn: () => Promise<boolean>): Promise<any> {
  const startTime = Date.now();
  let passed = false;
  let error = null;

  try {
    passed = await testFn();
  } catch (e: any) {
    error = e.message;
    passed = false;
  }

  const duration = Date.now() - startTime;

  return {
    name,
    passed,
    duration,
    error,
    timestamp: new Date(),
  };
}

async function createTestWorkflow(companyId: string, data: any): Promise<any> {
  return await prisma.automationRule.create({
    data: {
      id: uuidv4(),
      companyId,
      name: data.name || "Test Workflow",
      description: "Automated test workflow",
      isActive: true,
      triggerType: data.triggerType || "MANUAL",
      triggerConfig: data.triggerConfig || {},
      conditions: data.conditions || [],
      actions: data.actions || [],
      workflowDefinition: data.workflowDefinition || {
        nodes: [],
        edges: [],
      },
      version: 1,
    },
  });
}

async function cleanup(workflowId: string): Promise<void> {
  try {
    await prisma.automationRule.delete({
      where: { id: workflowId },
    });
  } catch (e) {
    // Ignore cleanup errors
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Workflow Engine Test Suite",
    endpoints: {
      comprehensive: "POST /api/automation-rules/test { testType: 'comprehensive' }",
      triggers: "POST /api/automation-rules/test { testType: 'triggers' }",
      conditions: "POST /api/automation-rules/test { testType: 'conditions' }",
      actions: "POST /api/automation-rules/test { testType: 'actions' }",
    },
    description: "Run comprehensive tests on the workflow execution engine",
  });
}
