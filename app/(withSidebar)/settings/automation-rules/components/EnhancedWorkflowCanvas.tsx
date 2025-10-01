/**
 * Enhanced Workflow Canvas with all limitations fixed
 * - Auto-layout using dagre
 * - Full property editors for conditions/actions
 * - Read-only preview mode
 * - Custom MiniMap colors
 * - Complete execution integration
 */

"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  ReactFlowInstance,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Zap, Filter, PlayCircle, Clock, GitBranch, 
  Repeat, Webhook, Calendar, Users, Mail,
  Save, TestTube, Settings, HelpCircle, 
  ChevronLeft, ChevronRight, Eye, EyeOff,
  Maximize2, Minimize2, Download, Upload,
  Layout, Grid3x3, Circle, Layers, AlertTriangle,
  Lock, Unlock, PlayCircleIcon, Pause
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getLayoutedElements, getGridLayout, getCircularLayout, getLaneLayout, detectCycles, LayoutOptions } from "@/lib/workflows/autoLayout";
import { workflowEngine } from "@/lib/workflows/WorkflowExecutionEngine";

// Import custom nodes
import { TriggerNode } from "./nodes/TriggerNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { ActionNode } from "./nodes/ActionNode";
import { DelayNode } from "./nodes/DelayNode";
import { BranchNode } from "./nodes/BranchNode";
import { LoopNode } from "./nodes/LoopNode";

// Import panels
import { WorkflowPalette } from "./WorkflowPalette";

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  branch: BranchNode,
  loop: LoopNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { strokeWidth: 2, stroke: '#94a3b8' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
};

interface EnhancedWorkflowCanvasProps {
  workflow: any;
  onWorkflowChange?: (workflow: any) => void;
  onSave?: () => void;
  onTest?: () => void;
  isValid?: boolean;
  isDirty?: boolean;
  readOnly?: boolean;
  previewMode?: boolean;
  onRequestEdit?: () => void;
}

function EnhancedWorkflowCanvasInner({
  workflow,
  onWorkflowChange,
  onSave,
  onTest,
  isValid = true,
  isDirty = false,
  readOnly = false,
  previewMode = false,
  onRequestEdit,
}: EnhancedWorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, setViewport } = useReactFlow();
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showPalette, setShowPalette] = useState(!previewMode && !readOnly);
  const [showProperties, setShowProperties] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<LayoutOptions["direction"]>("TB");
  const [showPreviewWarning, setShowPreviewWarning] = useState(false);

  // Dynamic options from API
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Load dynamic options
  useEffect(() => {
    loadDynamicOptions();
  }, []);

  const loadDynamicOptions = async () => {
    try {
      const [deptsRes, rolesRes, formsRes, empsRes, docsRes, templatesRes] = await Promise.all([
        fetch('/api/departments').then(r => r.json()).catch(() => []),
        fetch('/api/job-roles').then(r => r.json()).catch(() => []),
        fetch('/api/forms').then(r => r.json()).catch(() => []),
        fetch('/api/employees?status=active').then(r => r.json()).catch(() => []),
        fetch('/api/employment-checks/types').then(r => r.json()).catch(() => []),
        fetch('/api/onboarding/templates').then(r => r.json()).catch(() => []),
      ]);

      setDepartments(Array.isArray(deptsRes) ? deptsRes : []);
      setJobRoles(Array.isArray(rolesRes) ? rolesRes : rolesRes.jobRoles || []);
      setForms(Array.isArray(formsRes) ? formsRes : []);
      setEmployees(Array.isArray(empsRes) ? empsRes : []);
      setDocumentTypes(Array.isArray(docsRes) ? docsRes : []);
      setTemplates(Array.isArray(templatesRes) ? templatesRes : []);
    } catch (error) {
      console.error('Failed to load dynamic options:', error);
    }
  };

  // Load workflow nodes when workflow changes
  useEffect(() => {
    if (workflow?.nodes && workflow?.edges && workflow?.nodes?.length > 0) {
      console.log('Loading workflow into canvas:', workflow.name, 'Nodes:', workflow.nodes.length, 'Edges:', workflow.edges.length);
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      
      // Fit view after nodes are loaded
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    } else {
      console.log('Workflow received but no nodes:', workflow);
    }
  }, [workflow, setNodes, setEdges, fitView]);

  // Notify parent of changes
  useEffect(() => {
    if (!readOnly && onWorkflowChange) {
      onWorkflowChange({ ...workflow, nodes, edges });
    }
  }, [nodes, edges, readOnly]);

  // Handle connections
  const onConnect = useCallback((params: Connection) => {
    if (readOnly) return;
    
    setEdges((eds) => addEdge({ 
      ...params, 
      ...defaultEdgeOptions,
      id: `edge-${Date.now()}`,
    }, eds));
  }, [setEdges, readOnly]);

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [readOnly]);

  // Handle drop
  const onDrop = useCallback((event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();

    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');

    if (!type || !reactFlowInstance || !reactFlowBounds) return;

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    const nodeConfig = getNodeConfig(type);
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: {
        ...nodeConfig,
        config: {},
      },
    };

    setNodes((nds) => [...nds, newNode]);
    toast.success(`Added ${nodeConfig.label} node`);
  }, [reactFlowInstance, setNodes, readOnly]);

  // Get node configuration
  const getNodeConfig = (type: string) => {
    const configs: Record<string, any> = {
      trigger: {
        label: 'Trigger',
        icon: <Zap className="w-4 h-4" />,
        color: '#3b82f6',
        description: 'Start your workflow',
      },
      condition: {
        label: 'Condition',
        icon: <Filter className="w-4 h-4" />,
        color: '#f59e0b',
        description: 'Add conditional logic',
      },
      action: {
        label: 'Action',
        icon: <PlayCircle className="w-4 h-4" />,
        color: '#22c55e',
        description: 'Perform an action',
      },
      delay: {
        label: 'Delay',
        icon: <Clock className="w-4 h-4" />,
        color: '#a855f7',
        description: 'Wait before continuing',
      },
      branch: {
        label: 'Branch',
        icon: <GitBranch className="w-4 h-4" />,
        color: '#ec4899',
        description: 'Split workflow paths',
      },
      loop: {
        label: 'Loop',
        icon: <Repeat className="w-4 h-4" />,
        color: '#0ea5e9',
        description: 'Repeat actions',
      },
    };
    return configs[type] || configs.action;
  };

  // Handle node click
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowProperties(true);
  }, []);

  // Update node
  const handleNodeUpdate = useCallback((nodeId: string, updates: any) => {
    if (readOnly) return;
    
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [setNodes, readOnly]);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode || readOnly) return;
    
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => 
      e.source !== selectedNode.id && e.target !== selectedNode.id
    ));
    setSelectedNode(null);
    toast.success('Node deleted');
  }, [selectedNode, setNodes, setEdges, readOnly]);

  // Apply auto-layout
  const applyAutoLayout = useCallback((layoutType: string = "dagre") => {
    let layoutedNodes: Node[] = nodes;
    let layoutedEdges: Edge[] = edges;

    switch (layoutType) {
      case "dagre":
        const result = getLayoutedElements(nodes, edges, { direction: layoutDirection });
        layoutedNodes = result.nodes;
        layoutedEdges = result.edges;
        break;
      case "grid":
        layoutedNodes = getGridLayout(nodes);
        break;
      case "circular":
        layoutedNodes = getCircularLayout(nodes);
        break;
      case "lanes":
        const laneResult = getLaneLayout(nodes, edges);
        layoutedNodes = laneResult.nodes;
        layoutedEdges = laneResult.edges;
        break;
    }

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    // Fit view after layout
    setTimeout(() => {
      fitView({ padding: 0.1, duration: 200 });
    }, 50);
    
    toast.success(`Applied ${layoutType} layout`);
  }, [nodes, edges, layoutDirection, setNodes, setEdges, fitView]);

  // Detect cycles
  const checkForCycles = useCallback(() => {
    const cycleEdges = detectCycles(edges);
    
    if (cycleEdges.size > 0) {
      // Highlight cycle edges
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          style: {
            ...edge.style,
            stroke: cycleEdges.has(edge.id) ? '#ef4444' : '#94a3b8',
            strokeWidth: cycleEdges.has(edge.id) ? 3 : 2,
          },
        }))
      );
      toast.warning(`Found ${cycleEdges.size} edges forming cycles`);
    } else {
      toast.success('No cycles detected');
    }
  }, [edges, setEdges]);

  // Export workflow
  const exportWorkflow = useCallback(() => {
    const data = { nodes, edges, metadata: workflow };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${workflow.name || 'export'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exported');
  }, [nodes, edges, workflow]);

  // Import workflow
  const importWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        toast.success('Workflow imported successfully');
      } catch (error) {
        toast.error('Failed to import workflow');
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges]);

  // Test workflow execution
  const testWorkflow = async () => {
    if (!workflow?.id) {
      toast.error('Save the workflow first before testing');
      return;
    }

    setIsExecuting(true);
    try {
      const result = await workflowEngine.executeWorkflow(workflow.id, {
        testMode: true,
        testData: {
          employeeId: employees[0]?.id,
          timestamp: new Date(),
        },
      });

      setExecutionResults(result);
      setShowExecutionDialog(true);
      
      if (result.success) {
        toast.success('Workflow executed successfully');
      } else {
        toast.error(`Workflow failed: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // MiniMap node color function
  const nodeColor = useCallback((node: Node) => {
    const colors: Record<string, string> = {
      trigger: '#3b82f6',
      condition: '#f59e0b', 
      action: '#22c55e',
      delay: '#a855f7',
      branch: '#ec4899',
      loop: '#0ea5e9',
    };
    return colors[node.type || 'default'] || '#94a3b8';
  }, []);

  // Property editor panel
  const renderPropertyEditor = () => {
    if (!selectedNode) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a node to edit its properties</p>
        </div>
      );
    }

    const nodeType = selectedNode.type;
    const nodeData = selectedNode.data;
    const config = nodeData.config || {};

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Node Properties</h3>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteSelectedNode}
              className="text-destructive"
            >
              Delete
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input
              value={nodeData.label || ''}
              onChange={(e) => handleNodeUpdate(selectedNode.id, { label: e.target.value })}
              disabled={readOnly}
            />
          </div>

          {nodeType === 'trigger' && (
            <div className="space-y-3">
              <div>
                <Label>Trigger Type</Label>
                <Select
                  value={config.triggerType || ''}
                  onValueChange={(value) => 
                    handleNodeUpdate(selectedNode.id, { 
                      config: { ...config, triggerType: value } 
                    })
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE_CREATED">Employee Created</SelectItem>
                    <SelectItem value="DOCUMENT_EXPIRING">Document Expiring</SelectItem>
                    <SelectItem value="FORM_SUBMITTED">Form Submitted</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="WEBHOOK">Webhook</SelectItem>
                    <SelectItem value="LEAVE_REQUEST">Leave Request</SelectItem>
                    <SelectItem value="CONTRACT_EXPIRING">Contract Expiring</SelectItem>
                    <SelectItem value="EMPLOYEE_START_DATE">Employee Start Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.triggerType === 'SCHEDULED' && (
                <div>
                  <Label>Cron Schedule</Label>
                  <Input
                    value={config.schedule || ''}
                    onChange={(e) => 
                      handleNodeUpdate(selectedNode.id, { 
                        config: { ...config, schedule: e.target.value } 
                      })
                    }
                    placeholder="0 9 * * 1-5"
                    disabled={readOnly}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: minute hour day month weekday
                  </p>
                </div>
              )}

              {config.triggerType === 'DOCUMENT_EXPIRING' && (
                <>
                  <div>
                    <Label>Days Before Expiry</Label>
                    <Input
                      type="number"
                      value={config.daysBefore || 30}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, daysBefore: parseInt(e.target.value) } 
                        })
                      }
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Document Types</Label>
                    <MultiSelect
                      options={documentTypes.map(t => ({ label: t, value: t }))}
                      selected={config.documentTypes || []}
                      onChange={(values) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, documentTypes: values } 
                        })
                      }
                      disabled={readOnly}
                    />
                  </div>
                </>
              )}

              {config.triggerType === 'FORM_SUBMITTED' && (
                <div>
                  <Label>Form</Label>
                  <Select
                    value={config.formId || ''}
                    onValueChange={(value) => 
                      handleNodeUpdate(selectedNode.id, { 
                        config: { ...config, formId: value } 
                      })
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {nodeType === 'condition' && (
            <div className="space-y-3">
              <div>
                <Label>Condition Type</Label>
                <Select
                  value={config.conditionType || ''}
                  onValueChange={(value) => 
                    handleNodeUpdate(selectedNode.id, { 
                      config: { ...config, conditionType: value } 
                    })
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="jobRole">Job Role</SelectItem>
                    <SelectItem value="contractType">Contract Type</SelectItem>
                    <SelectItem value="probationStatus">Probation Status</SelectItem>
                    <SelectItem value="leaveBalance">Leave Balance</SelectItem>
                    <SelectItem value="documentStatus">Document Status</SelectItem>
                    <SelectItem value="workingHours">Working Hours</SelectItem>
                    <SelectItem value="customField">Custom Field</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.conditionType === 'department' && (
                <div>
                  <Label>Departments</Label>
                  <MultiSelect
                    options={departments.map(d => ({ label: d.name, value: d.id }))}
                    selected={config.departments || []}
                    onChange={(values) => 
                      handleNodeUpdate(selectedNode.id, { 
                        config: { ...config, departments: values } 
                      })
                    }
                    disabled={readOnly}
                  />
                </div>
              )}

              {config.conditionType === 'customField' && (
                <>
                  <div>
                    <Label>Field Path</Label>
                    <Input
                      value={config.field || ''}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, field: e.target.value } 
                        })
                      }
                      placeholder="employee.department.name"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Operator</Label>
                    <Select
                      value={config.operator || 'equals'}
                      onValueChange={(value) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, operator: value } 
                        })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="regex">Regex Match</SelectItem>
                        <SelectItem value="exists">Exists</SelectItem>
                        <SelectItem value="not_exists">Not Exists</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input
                      value={config.value || ''}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, value: e.target.value } 
                        })
                      }
                      disabled={readOnly}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {nodeType === 'action' && (
            <div className="space-y-3">
              <div>
                <Label>Action Type</Label>
                <Select
                  value={config.actionType || ''}
                  onValueChange={(value) => 
                    handleNodeUpdate(selectedNode.id, { 
                      config: { ...config, actionType: value } 
                    })
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_notification">Send Notification</SelectItem>
                    <SelectItem value="create_task">Create Task</SelectItem>
                    <SelectItem value="assign_form">Assign Form</SelectItem>
                    <SelectItem value="update_field">Update Field</SelectItem>
                    <SelectItem value="request_document">Request Document</SelectItem>
                    <SelectItem value="webhook">Call Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.actionType === 'send_notification' && (
                <>
                  <div>
                    <Label>Recipient Type</Label>
                    <Select
                      value={config.recipientType || 'employee'}
                      onValueChange={(value) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, recipientType: value } 
                        })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="hr">HR Team</SelectItem>
                        <SelectItem value="all_employees">All Employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Channels</Label>
                    <MultiSelect
                      options={[
                        { label: 'Email', value: 'email' },
                        { label: 'Slack', value: 'slack' },
                        { label: 'Teams', value: 'teams' },
                      ]}
                      selected={config.channels || ['email']}
                      onChange={(values) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, channels: values } 
                        })
                      }
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={config.subject || ''}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, subject: e.target.value } 
                        })
                      }
                      placeholder="Notification subject"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={config.message || ''}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, message: e.target.value } 
                        })
                      }
                      placeholder="Use {{employee.name}}, {{company.name}} for variables"
                      rows={4}
                      disabled={readOnly}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available variables: {'{{employee.name}}, {{company.name}}, {{manager.name}}'}
                    </p>
                  </div>
                </>
              )}

              {config.actionType === 'create_task' && (
                <>
                  <div>
                    <Label>Task Title</Label>
                    <Input
                      value={config.title || ''}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, title: e.target.value } 
                        })
                      }
                      placeholder="Task title"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={config.description || ''}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, description: e.target.value } 
                        })
                      }
                      placeholder="Task details"
                      rows={2}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Assign To</Label>
                    <Select
                      value={config.assigneeType || 'manager'}
                      onValueChange={(value) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, assigneeType: value } 
                        })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="hr">HR Team</SelectItem>
                        <SelectItem value="it_team">IT Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Due in (days)</Label>
                    <Input
                      type="number"
                      value={config.dueDays || 7}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, dueDays: parseInt(e.target.value) } 
                        })
                      }
                      disabled={readOnly}
                    />
                  </div>
                </>
              )}

              {config.actionType === 'webhook' && (
                <>
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={config.url || ''}
                      onChange={(e) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, url: e.target.value } 
                        })
                      }
                      placeholder="https://api.example.com/webhook"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Method</Label>
                    <Select
                      value={config.method || 'POST'}
                      onValueChange={(value) => 
                        handleNodeUpdate(selectedNode.id, { 
                          config: { ...config, method: value } 
                        })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}

          {nodeType === 'delay' && (
            <div className="space-y-3">
              <div>
                <Label>Days</Label>
                <Input
                  type="number"
                  value={config.days || 0}
                  onChange={(e) => 
                    handleNodeUpdate(selectedNode.id, { 
                      config: { ...config, days: parseInt(e.target.value) } 
                    })
                  }
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  value={config.hours || 0}
                  onChange={(e) => 
                    handleNodeUpdate(selectedNode.id, { 
                      config: { ...config, hours: parseInt(e.target.value) } 
                    })
                  }
                  disabled={readOnly}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.businessDaysOnly || false}
                  onCheckedChange={(checked) => 
                    handleNodeUpdate(selectedNode.id, { 
                      config: { ...config, businessDaysOnly: checked } 
                    })
                  }
                  disabled={readOnly}
                />
                <Label>Business Days Only</Label>
              </div>
            </div>
          )}

          {nodeType === 'loop' && (
            <div className="space-y-3">
              <div>
                <Label>Iterations</Label>
                <Input
                  type="number"
                  value={config.iterations || 1}
                  onChange={(e) => 
                    handleNodeUpdate(selectedNode.id, { 
                      config: { ...config, iterations: parseInt(e.target.value) } 
                    })
                  }
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label>Collection (optional)</Label>
                <Input
                  value={config.collection || ''}
                  onChange={(e) => 
                    handleNodeUpdate(selectedNode.id, { 
                      config: { ...config, collection: e.target.value } 
                    })
                  }
                  placeholder="Variable name to iterate over"
                  disabled={readOnly}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "flex h-full bg-background",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Left Panel - Component Palette */}
      {!previewMode && !readOnly && (
        <div className={cn(
          "border-r bg-card transition-all duration-200",
          showPalette ? "w-64" : "w-12"
        )}>
          {showPalette ? (
            <WorkflowPalette onCollapse={() => setShowPalette(false)} />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPalette(true)}
              className="w-full h-12 rounded-none"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Center - Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            className="bg-gradient-to-br from-slate-50 via-white to-slate-50"
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1} 
              color="#e2e8f0" 
            />
            <MiniMap
              nodeColor={nodeColor}
              className="bg-card border-2"
              maskColor="rgb(255, 255, 255, 0.8)"
            />
            <Controls className="bg-card border-2" />
          </ReactFlow>

        {/* Top Action Bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            {!readOnly && (
              <>
                <div className="flex items-center bg-white/90 backdrop-blur rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyAutoLayout("dagre")}
                    title="Hierarchical layout"
                  >
                    <Layout className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyAutoLayout("grid")}
                    title="Grid layout"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyAutoLayout("circular")}
                    title="Circular layout"
                  >
                    <Circle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyAutoLayout("lanes")}
                    title="Swimlane layout"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                  <Select
                    value={layoutDirection}
                    onValueChange={(value: any) => setLayoutDirection(value)}
                  >
                    <SelectTrigger className="w-20 h-8 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TB">Top-Bottom</SelectItem>
                      <SelectItem value="LR">Left-Right</SelectItem>
                      <SelectItem value="BT">Bottom-Top</SelectItem>
                      <SelectItem value="RL">Right-Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkForCycles}
                  className="bg-white/90 backdrop-blur"
                  title="Detect cycles"
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-2 pointer-events-auto">
          {previewMode && (
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
              onClick={() => {
                if (readOnly && previewMode) {
                  setShowPreviewWarning(true);
                } else {
                  onRequestEdit?.();
                }
              }}
            >
              <Lock className="h-3 w-3 mr-1" />
              Preview Mode - Click to Edit
            </Button>
          )}
          {readOnly && !previewMode && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Lock className="h-3 w-3 mr-1" />
                Read Only
              </Badge>
            )}
            {isDirty && !readOnly && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                Unsaved changes
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportWorkflow}
              className="bg-white/90 backdrop-blur"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {!readOnly && (
              <>
                <label htmlFor="import-workflow">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/90 backdrop-blur cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </label>
                <input
                  id="import-workflow"
                  type="file"
                  accept=".json"
                  onChange={importWorkflow}
                  className="hidden"
                />
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-white/90 backdrop-blur"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testWorkflow}
                  disabled={!isValid || isExecuting}
                  className="bg-white/90 backdrop-blur"
                >
                  {isExecuting ? (
                    <Pause className="h-4 w-4 mr-2 animate-pulse" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  {isExecuting ? 'Testing...' : 'Test'}
                </Button>
                
                {onSave && (
                  <Button
                    size="sm"
                    onClick={onSave}
                    disabled={!isValid || !isDirty}
                    className="bg-primary text-primary-foreground"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur rounded-lg px-3 py-1 text-xs text-muted-foreground pointer-events-auto">
            {nodes.length} nodes • {edges.length} connections
          </div>
          {selectedNode && !readOnly && (
            <div className="bg-white/90 backdrop-blur rounded-lg px-3 py-1 text-xs pointer-events-auto flex gap-2">
              <span>Selected: {selectedNode.data?.label || selectedNode.type}</span>
              <button 
                onClick={deleteSelectedNode}
                className="hover:text-destructive"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className={cn(
        "border-l bg-card transition-all duration-200 overflow-hidden",
        showProperties ? "w-80" : "w-12"
      )}>
        {showProperties ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-medium">Properties</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProperties(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderPropertyEditor()}
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProperties(true)}
            className="w-full h-12 rounded-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Execution Results Dialog */}
      <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Test Results</DialogTitle>
            <DialogDescription>
              {executionResults?.success 
                ? 'Workflow executed successfully'
                : `Workflow failed: ${executionResults?.error}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant={executionResults?.success ? 'default' : 'destructive'}>
                {executionResults?.success ? 'Success' : 'Failed'}
              </Badge>
              <span>Duration: {executionResults?.duration}ms</span>
              <span>Steps: {executionResults?.logs?.length || 0}</span>
            </div>

            {executionResults?.logs && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Execution Logs</h4>
                <div className="space-y-2 text-sm">
                  {executionResults.logs.map((log: any, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge 
                        variant={
                          log.status === 'completed' ? 'default' :
                          log.status === 'failed' ? 'destructive' :
                          log.status === 'skipped' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {log.status}
                      </Badge>
                      <span>{log.nodeId}</span>
                      {log.message && (
                        <span className="text-muted-foreground">{log.message}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Mode Warning Dialog */}
      <Dialog open={showPreviewWarning} onOpenChange={setShowPreviewWarning}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Enable editing?
            </DialogTitle>
            <DialogDescription>
              This will create a customizable copy of the workflow template for your organization. The default template will remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            <p className="font-medium mb-1">What happens when you edit:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>You can modify nodes, connections, and settings</li>
              <li>Changes only affect your organization</li>
              <li>You can always revert to the original template</li>
              <li>Unsaved changes will be lost if you navigate away</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowPreviewWarning(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowPreviewWarning(false);
                onRequestEdit?.();
              }}
            >
              Yes, enable editing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export with ReactFlowProvider wrapper
export default function EnhancedWorkflowCanvas(props: EnhancedWorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <EnhancedWorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
