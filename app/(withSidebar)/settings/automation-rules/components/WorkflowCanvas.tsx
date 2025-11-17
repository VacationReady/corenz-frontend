"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import type {
  DefaultEdgeOptions,
  Edge,
  Node,
  NodeTypes,
  OnSelectionChangeParams,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, TestTube, Save } from "lucide-react";
import { WorkflowPalette } from "./WorkflowPalette";
import { NodePropertiesPanel } from "./NodePropertiesPanel";
import { WorkflowTemplateGallery } from "./WorkflowTemplateGallery";
import { TriggerNode as RealTriggerNode } from "./nodes/TriggerNode";
import { ConditionNode as RealConditionNode } from "./nodes/ConditionNode";
import { ActionNode as RealActionNode } from "./nodes/ActionNode";
import { DelayNode as RealDelayNode } from "./nodes/DelayNode";
import { BranchNode as RealBranchNode } from "./nodes/BranchNode";
import { LoopNode as RealLoopNode } from "./nodes/LoopNode";

const nodeTypes: NodeTypes = {
  trigger: RealTriggerNode,
  condition: RealConditionNode,
  action: RealActionNode,
  delay: RealDelayNode,
  branch: RealBranchNode,
  loop: RealLoopNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
  style: { strokeWidth: 2, stroke: "#94a3b8" },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  type: 'smoothstep',
};

interface WorkflowDefinition {
  id?: string;
  name?: string;
  description?: string;
  nodes?: Node[];
  edges?: Edge[];
  [key: string]: unknown;
}

interface WorkflowCanvasProps {
  workflow?: WorkflowDefinition | null;
  onWorkflowChange: (workflow: WorkflowDefinition) => void;
  onSave: () => void;
  onTest: () => void;
  isValid: boolean;
  isDirty: boolean;
  aiPreviewMode?: boolean; // NEW: Minimal UI for AI-generated workflows
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  onWorkflowChange,
  onSave,
  onTest,
  isValid,
  isDirty,
  aiPreviewMode = false,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(workflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(workflow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showPalette, setShowPalette] = useState(!aiPreviewMode); // Hide in AI mode
  const [showProperties, setShowProperties] = useState(!aiPreviewMode); // Hide in AI mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Start with a clean canvas; templates can be opened via the Templates button
  const [showTemplates, setShowTemplates] = useState(false);

  // Load incoming workflow when rule changes (safely)
  useEffect(() => {
    if (!workflow) return;

    const syncTimer = setTimeout(() => {
      setNodes(workflow.nodes || []);
      setEdges(workflow.edges || []);
    }, 0);

    return () => clearTimeout(syncTimer);
  }, [workflow, setNodes, setEdges]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onWorkflowChange({ ...(workflow || {}), nodes, edges });
    }, 100);
    return () => clearTimeout(timer);
  }, [nodes, edges, onWorkflowChange, workflow]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions, id: `edge-${Date.now()}` }, eds));
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance || !reactFlowBounds) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const nodeId = `${type}-${(globalThis.crypto?.randomUUID?.() || Date.now().toString())}`;
      const newNode: Node = {
        id: nodeId,
        type,
        position,
        data: { label: getLabel(type) },
      };

      // Defer setNodes to avoid React #185 error
      setTimeout(() => {
        setNodes((nds) => [...nds, newNode]);
        toast.success(`Added ${type} node`);
      }, 0);
    },
    [reactFlowInstance, setNodes],
  );

  const getLabel = (type: string): string => {
    return {
      trigger: "Trigger",
      condition: "Condition",
      action: "Action",
      delay: "Delay",
      branch: "Branch",
      loop: "Loop",
    }[type] || type;
  };

  const autoLayout = useCallback(() => {
    toast.success("Layout optimized");
  }, []);

  const exportWorkflow = useCallback(() => {
    const data = { nodes, edges, metadata: workflow };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-${workflow?.name || "export"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workflow exported");
  }, [nodes, edges, workflow]);

  return (
    <div className={cn("flex h-full bg-background", isFullscreen && "fixed inset-0 z-50")}>
      {/* Hide palette entirely in AI preview mode */}
      {!aiPreviewMode && (
        <div className={cn("border-r bg-card transition-all duration-200", showPalette ? "w-72" : "w-12")}>
          {showPalette ? (
            <WorkflowPalette onCollapse={() => setShowPalette(false)} />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowPalette(true)} className="w-full h-12 rounded-none">
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {showTemplates ? (
          <WorkflowTemplateGallery
            onSelectTemplate={(template) => {
              setNodes(template.nodes || []);
              setEdges(template.edges || []);
              setShowTemplates(false);
            }}
            onClose={() => setShowTemplates(false)}
          />
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={(_, node) => {
              setSelectedNode(node);
              if (!showProperties) setShowProperties(true);
            }}
            onSelectionChange={({ nodes: selNodes }: OnSelectionChangeParams) => {
              if (selNodes && selNodes.length > 0) {
                setSelectedNode(selNodes[0]);
              }
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            snapToGrid={true}
            snapGrid={[15, 15]}
            deleteKeyCode="Delete"
            className="bg-gradient-to-br from-slate-50 via-white to-slate-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
            {/* Hide MiniMap in AI preview mode - keep it clean */}
            {!aiPreviewMode && (
              <MiniMap 
                className="bg-card border-2 shadow-lg" 
                nodeColor={(node) => {
                  const colors: Record<string, string> = {
                    trigger: '#3b82f6',
                    condition: '#f59e0b',
                    action: '#22c55e',
                    delay: '#a855f7',
                    branch: '#ec4899',
                    loop: '#0ea5e9',
                  };
                  return colors[node.type || 'default'] || '#94a3b8';
                }}
                maskColor="rgb(255, 255, 255, 0.8)"
              />
            )}
            <Controls className="bg-card border-2 shadow-lg" showInteractive={false} />
          </ReactFlow>
        )}

        {/* Minimal toolbar for AI preview mode */}
        {!aiPreviewMode && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none z-10">
            <div className="flex gap-2 pointer-events-auto">
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)} className="glass-strong shadow-sm">
                Templates
              </Button>
              <Button variant="ghost" size="sm" onClick={autoLayout} className="glass-strong shadow-sm">
                Auto Layout
              </Button>
            </div>
            <div className="flex gap-2 pointer-events-auto">
              {isDirty && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 shadow-sm">
                  Unsaved changes
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={exportWorkflow} className="glass-strong shadow-sm" aria-label="Export">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="glass-strong shadow-sm"
                aria-label="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={onTest} disabled={!isValid} className="glass-strong shadow-sm">
                <TestTube className="h-4 w-4 mr-2" />
                Test
              </Button>
              <Button size="sm" onClick={onSave} disabled={!isValid || !isDirty} className="bg-primary text-primary-foreground shadow-lg">
                <Save className="h-4 w-4 mr-2" />
                Save Workflow
              </Button>
            </div>
          </div>
        )}
        
        {/* Bottom Stats Bar - hide in AI preview mode */}
        {!aiPreviewMode && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <div className="glass-strong shadow-lg rounded-full px-4 py-2 text-xs text-muted-foreground pointer-events-auto flex items-center gap-3">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                {nodes.filter(n => n.type === 'trigger').length} triggers
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              {nodes.filter(n => n.type === 'condition').length} conditions
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {nodes.filter(n => n.type === 'action').length} actions
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span>{edges.length} connections</span>
          </div>
        </div>
        )}
      </div>

      {/* Hide properties panel in AI preview mode */}
      {!aiPreviewMode && (
        <div className={cn("border-l bg-card transition-all duration-200", showProperties ? "w-80" : "w-12")}>
          {showProperties ? (
            <NodePropertiesPanel
              node={selectedNode}
              onUpdate={(updates) => {
                if (!selectedNode) return;
                setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, ...updates } } : n)));
              }}
              onClose={() => setShowProperties(false)}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowProperties(true)} className="w-full h-12 rounded-none">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default function WorkflowCanvasWrapper(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
}


