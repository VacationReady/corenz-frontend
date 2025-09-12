/**
 * Automation System Entry Point
 *
 * Main exports for the automation worker system.
 * Provides convenient access to all automation components.
 */

// Core components
export { AutomationWorker, getAutomationWorker } from "./worker";
export { AutomationJobQueue, automationJobQueue } from "./queue";
export { AutomationRuleEvaluator } from "./evaluator";
export { AutomationActionExecutor } from "./executor";
export { AutomationScheduler, getAutomationScheduler } from "./scheduler";

// Types and interfaces
export * from "./types";

// Utility functions
export {
  startAutomationSystem,
  stopAutomationSystem,
  getSystemStatus,
  healthCheck,
  performMaintenance,
} from "./utils";
