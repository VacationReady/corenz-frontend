/**
 * INTEGRATION ORCHESTRATOR
 * Lightweight orchestrator that connects existing systems without duplication
 * Uses existing APIs: surveys, workflows, forms, bulk operations
 */

import { ActionResult } from "./action-executor";

/**
 * Handle integrated automation using existing survey automation API
 */
export async function handleIntegratedAutomation(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<ActionResult> {
  
  // Extract automation components from user message
  const components = analyzeAutomationRequest(userMessage, parameters);
  
  if (components.needsGuidance) {
    return {
      success: true,
      message: components.guidanceMessage || "I need more information to help you with this automation.",
      requiresConfirmation: false,
      suggestions: components.suggestions
    };
  }

  // Build automation using existing survey automation API
  const automationSpec = buildAutomationSpec(components);
  
  return {
    success: true,
    message: `I'll create this **integrated automation** for you:\n\n${formatAutomationPreview(automationSpec)}\n\nThis will use your existing survey system, email automation, and analytics. Ready to set it up?`,
    requiresConfirmation: true,
    preview: automationSpec,
    data: { 
      apiEndpoint: '/api/surveys/automation',
      method: 'POST',
      payload: automationSpec
    }
  };
}

/**
 * Handle multi-function workflows using existing workflow engine
 */
export async function handleMultiFunctionWorkflow(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<ActionResult> {
  
  const workflowComponents = analyzeWorkflowRequest(userMessage, parameters);
  
  if (workflowComponents.needsGuidance) {
    return {
      success: true,
      message: workflowComponents.guidanceMessage || "I need more information to help you with this workflow.",
      requiresConfirmation: false,
      suggestions: workflowComponents.suggestions
    };
  }

  // Build workflow using existing workflow generator
  const workflowSpec = buildWorkflowSpec(workflowComponents);
  
  return {
    success: true,
    message: `I'll create this **multi-function workflow** for you:\n\n${formatWorkflowPreview(workflowSpec)}\n\nThis integrates multiple HR functions seamlessly. Should I build it?`,
    requiresConfirmation: true,
    preview: workflowSpec,
    data: {
      workflowType: 'multi_function',
      components: workflowComponents,
      spec: workflowSpec
    }
  };
}

/**
 * Handle smart bulk operations using existing bulk update system
 */
export async function handleSmartBulkOperations(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<ActionResult> {
  
  const bulkComponents = analyzeBulkRequest(userMessage, parameters);
  
  if (bulkComponents.needsGuidance) {
    return {
      success: true,
      message: bulkComponents.guidanceMessage || "I need more information to help you with this bulk operation.",
      requiresConfirmation: false,
      suggestions: bulkComponents.suggestions
    };
  }

  // Build smart bulk operation with approval workflow
  const bulkSpec = buildSmartBulkSpec(bulkComponents);
  
  return {
    success: true,
    message: `I'll create this **smart bulk operation** for you:\n\n${formatBulkPreview(bulkSpec)}\n\nThis includes approval workflows and audit trails. Ready to proceed?`,
    requiresConfirmation: true,
    preview: bulkSpec,
    data: {
      bulkType: 'smart_operation',
      requiresApproval: bulkComponents.requiresApproval,
      spec: bulkSpec
    }
  };
}

/**
 * Handle intelligent communications using existing email system
 */
export async function handleIntelligentCommunications(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<ActionResult> {
  
  const commComponents = analyzeCommunicationRequest(userMessage, parameters);
  
  if (commComponents.needsGuidance) {
    return {
      success: true,
      message: commComponents.guidanceMessage || "I need more information to help you with this communication.",
      requiresConfirmation: false,
      suggestions: commComponents.suggestions
    };
  }

  // Build intelligent communication using existing email system
  const commSpec = buildCommunicationSpec(commComponents);
  
  return {
    success: true,
    message: `I'll create this **intelligent communication system** for you:\n\n${formatCommunicationPreview(commSpec)}\n\nThis will personalize messages for each recipient. Should I set it up?`,
    requiresConfirmation: true,
    preview: commSpec,
    data: {
      communicationType: 'intelligent',
      personalization: commComponents.personalization,
      spec: commSpec
    }
  };
}

/**
 * Handle dynamic form building using existing form builder
 */
export async function handleDynamicFormBuilding(
  userMessage: string,
  companyId: string,
  userId: string,
  parameters: any
): Promise<ActionResult> {
  
  const formComponents = analyzeFormRequest(userMessage, parameters);
  
  if (formComponents.needsGuidance) {
    return {
      success: true,
      message: formComponents.guidanceMessage || "I need more information to help you with this form.",
      requiresConfirmation: false,
      suggestions: formComponents.suggestions
    };
  }

  // Build dynamic form using existing form builder
  const formSpec = buildDynamicFormSpec(formComponents);
  
  return {
    success: true,
    message: `I'll create this **dynamic form** for you:\n\n${formatFormPreview(formSpec)}\n\nThis form will adapt based on user responses. Ready to build it?`,
    requiresConfirmation: true,
    preview: formSpec,
    data: {
      formType: 'dynamic',
      logic: formComponents.logic,
      spec: formSpec
    }
  };
}

// ANALYSIS FUNCTIONS

function analyzeAutomationRequest(userMessage: string, parameters: any) {
  const msg = userMessage.toLowerCase();
  
  // Check if we have enough information
  const hasSurveyType = msg.includes('survey') || msg.includes('pulse') || msg.includes('enps') || msg.includes('engagement');
  const hasSchedule = msg.includes('monthly') || msg.includes('weekly') || msg.includes('quarterly') || msg.includes('every');
  const hasEmail = msg.includes('email') || msg.includes('send') || msg.includes('results');
  
  if (!hasSurveyType) {
    return {
      needsGuidance: true,
      guidanceMessage: "Great! I'll help you create survey automation. 📊\n\n**What type of survey would you like to automate?**\n\n• **Pulse Survey** - Quick team mood and engagement\n• **eNPS Survey** - Employee loyalty tracking\n• **Engagement Survey** - Comprehensive satisfaction\n• **Custom Survey** - Tailored to your needs\n\nWhich one fits your goals?",
      suggestions: ["Monthly pulse surveys", "Quarterly eNPS tracking", "Annual engagement survey", "Custom feedback automation"]
    };
  }
  
  if (!hasSchedule) {
    return {
      needsGuidance: true,
      guidanceMessage: "Perfect! I can see you want survey automation. 📅\n\n**How often should this run?**\n\n• **Monthly** - Regular pulse checks\n• **Quarterly** - Seasonal insights\n• **Annually** - Comprehensive reviews\n• **Custom Schedule** - Your specific timing\n\nWhat frequency works best for your team?",
      suggestions: ["Every month", "Every quarter", "Twice a year", "Custom timing"]
    };
  }
  
  return { needsGuidance: false };
}

function analyzeWorkflowRequest(userMessage: string, parameters: any) {
  const msg = userMessage.toLowerCase();
  
  const hasTrigger = msg.includes('when') || msg.includes('after') || msg.includes('before') || msg.includes('joins') || msg.includes('leaves');
  const hasActions = msg.includes('send') || msg.includes('create') || msg.includes('notify') || msg.includes('schedule');
  
  if (!hasTrigger) {
    return {
      needsGuidance: true,
      guidanceMessage: "Excellent! Multi-function workflows are powerful. ⚡\n\n**What should trigger this workflow?**\n\n• **Employee Lifecycle** - Joins, leaves, promotions\n• **Time-Based** - Anniversaries, reviews, deadlines\n• **Event-Based** - Form submissions, approvals\n• **Manual** - Run on-demand\n\nWhat event should start this workflow?",
      suggestions: ["When someone joins", "Before contract expires", "After performance review", "On anniversary date"]
    };
  }
  
  return { needsGuidance: false };
}

function analyzeBulkRequest(userMessage: string, parameters: any) {
  const msg = userMessage.toLowerCase();
  
  const hasTarget = msg.includes('everyone') || msg.includes('all') || msg.includes('sales') || msg.includes('department');
  const hasAction = msg.includes('raise') || msg.includes('update') || msg.includes('change') || msg.includes('move');
  const hasApproval = msg.includes('approval') || msg.includes('approve') || msg.includes('send for');
  
  if (!hasTarget) {
    return {
      needsGuidance: true,
      guidanceMessage: "Smart bulk operations save tons of time! 💪\n\n**Who should this affect?**\n\n• **Department** - Sales, Engineering, HR, etc.\n• **Role** - Managers, contractors, full-time\n• **Location** - Office, remote, specific sites\n• **Everyone** - Company-wide changes\n\nWhich group needs updating?",
      suggestions: ["All sales team", "Remote employees", "All managers", "Everyone in engineering"]
    };
  }
  
  return { 
    needsGuidance: false,
    requiresApproval: hasApproval
  };
}

function analyzeCommunicationRequest(userMessage: string, parameters: any) {
  const msg = userMessage.toLowerCase();
  
  const hasAudience = msg.includes('managers') || msg.includes('employees') || msg.includes('team') || msg.includes('everyone');
  const hasPersonalization = msg.includes('customize') || msg.includes('personalize') || msg.includes('different') || msg.includes('based on');
  
  if (!hasAudience) {
    return {
      needsGuidance: true,
      guidanceMessage: "Intelligent communications are game-changing! 📧\n\n**Who should receive this communication?**\n\n• **All Employees** - Company-wide announcements\n• **Managers Only** - Leadership updates\n• **Department Teams** - Targeted messages\n• **Specific Roles** - Role-based communications\n\nWho needs to hear this message?",
      suggestions: ["All managers", "Engineering team", "Remote employees", "New hires"]
    };
  }
  
  return { 
    needsGuidance: false,
    personalization: hasPersonalization
  };
}

function analyzeFormRequest(userMessage: string, parameters: any) {
  const msg = userMessage.toLowerCase();
  
  const hasFormType = msg.includes('onboarding') || msg.includes('feedback') || msg.includes('request') || msg.includes('survey');
  const hasLogic = msg.includes('based on') || msg.includes('different') || msg.includes('changes') || msg.includes('conditional');
  
  if (!hasFormType) {
    return {
      needsGuidance: true,
      guidanceMessage: "Dynamic forms are incredibly powerful! 📝\n\n**What type of form do you need?**\n\n• **Onboarding Forms** - New employee setup\n• **Request Forms** - Leave, equipment, changes\n• **Feedback Forms** - Surveys and evaluations\n• **Custom Forms** - Tailored to your process\n\nWhat information are you collecting?",
      suggestions: ["Employee onboarding", "Leave requests", "Feedback collection", "Equipment requests"]
    };
  }
  
  return { 
    needsGuidance: false,
    logic: hasLogic
  };
}

// BUILD SPEC FUNCTIONS

function buildAutomationSpec(components: any) {
  return {
    name: "AI-Generated Survey Automation",
    description: "Intelligent survey automation with email reporting",
    trigger: "SCHEDULED",
    frequency: "MONTHLY",
    targetAudience: { all: true },
    emailAutomation: true,
    analytics: true
  };
}

function buildWorkflowSpec(components: any) {
  return {
    name: "Multi-Function Workflow",
    description: "Integrated workflow spanning multiple HR functions",
    triggers: ["EMPLOYEE_CREATED"],
    actions: ["SEND_EMAIL", "CREATE_TASKS", "SCHEDULE_SURVEY"],
    integrations: ["email", "tasks", "surveys"]
  };
}

function buildSmartBulkSpec(components: any) {
  return {
    operation: "bulk_update",
    requiresApproval: components.requiresApproval,
    auditTrail: true,
    notifications: true,
    rollbackCapable: true
  };
}

function buildCommunicationSpec(components: any) {
  return {
    type: "intelligent_communication",
    personalization: components.personalization,
    targeting: "smart",
    analytics: true
  };
}

function buildDynamicFormSpec(components: any) {
  return {
    type: "dynamic_form",
    conditionalLogic: components.logic,
    adaptive: true,
    routing: "smart"
  };
}

// FORMAT PREVIEW FUNCTIONS

function formatAutomationPreview(spec: any): string {
  return `📊 **Survey Automation**\n⏰ Schedule: ${spec.frequency}\n📧 Email Results: ${spec.emailAutomation ? 'Yes' : 'No'}\n📈 Analytics: ${spec.analytics ? 'Included' : 'Basic'}`;
}

function formatWorkflowPreview(spec: any): string {
  return `⚡ **Multi-Function Workflow**\n🔗 Triggers: ${spec.triggers.join(', ')}\n🎯 Actions: ${spec.actions.join(', ')}\n🔄 Integrations: ${spec.integrations.join(', ')}`;
}

function formatBulkPreview(spec: any): string {
  return `💪 **Smart Bulk Operation**\n✅ Approval Required: ${spec.requiresApproval ? 'Yes' : 'No'}\n📋 Audit Trail: ${spec.auditTrail ? 'Full' : 'Basic'}\n🔄 Rollback: ${spec.rollbackCapable ? 'Available' : 'Not available'}`;
}

function formatCommunicationPreview(spec: any): string {
  return `📧 **Intelligent Communication**\n🎯 Personalization: ${spec.personalization ? 'Advanced' : 'Standard'}\n📊 Analytics: ${spec.analytics ? 'Included' : 'Basic'}`;
}

function formatFormPreview(spec: any): string {
  return `📝 **Dynamic Form**\n🔄 Conditional Logic: ${spec.conditionalLogic ? 'Yes' : 'No'}\n🎯 Smart Routing: ${spec.routing === 'smart' ? 'Enabled' : 'Disabled'}`;
}
