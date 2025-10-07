"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from "@/components/ui/toolbar";
import {
  Save,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MoreHorizontal,
  Eye,
  EyeOff,
  Layout,
  GitBranch,
  Target,
  BarChart3,
  MessageSquare,
  Settings,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Custom node components
import { ExperienceBlockNode } from "./nodes/ExperienceBlockNode";
import { DecisionGatewayNode } from "./nodes/DecisionGatewayNode";
import { PhaseHeaderNode } from "./nodes/PhaseHeaderNode";
import { OutcomeTrackerNode } from "./nodes/OutcomeTrackerNode";

interface JourneyTemplate {
  id: string;
  name: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  phases: JourneyPhase[];
  metricBindings: MetricBinding[];
}

interface JourneyPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  duration?: number;
  phaseType: "SEQUENTIAL" | "PARALLEL" | "CONDITIONAL";
  experienceBlocks: ExperienceBlock[];
}

interface ExperienceBlock {
  id: string;
  name: string;
  description?: string;
  blockType: string;
  order: number;
  estimatedDuration?: number;
  slaHours?: number;
  responsibleRole?: string;
}

interface MetricBinding {
  id: string;
  metricName: string;
  metricType: string;
  targetValue?: number;
  currentValue?: number;
}

interface JourneyCanvasProps {
  journey: JourneyTemplate;
  onJourneyUpdate: (journey: JourneyTemplate) => void;
  showInsightDock: boolean;
  onToggleInsightDock: () => void;
}

const nodeTypes = {
  experienceBlock: ExperienceBlockNode,
  decisionGateway: DecisionGatewayNode,
  phaseHeader: PhaseHeaderNode,
  outcomeTracker: OutcomeTrackerNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { strokeWidth: 2, stroke: '#6366f1' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
};

function JourneyCanvasInner({ journey, onJourneyUpdate, showInsightDock, onToggleInsightDock }: JourneyCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut, setViewport } = useReactFlow();
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Convert journey data to ReactFlow nodes and edges
  useEffect(() => {
    if (!journey) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let yOffset = 0;
    const phaseHeight = 200;
    const phaseSpacing = 50;
    const swimlaneWidth = 1200;

    journey.phases.forEach((phase, phaseIndex) => {
      // Create phase header (swimlane)
      newNodes.push({
        id: `phase-${phase.id}`,
        type: 'phaseHeader',
        position: { x: 0, y: yOffset },
        data: {
          phase,
          width: swimlaneWidth,
          height: phaseHeight,
        },
        draggable: false,
        selectable: false,
        style: {
          width: swimlaneWidth,
          height: phaseHeight,
          backgroundColor: phaseIndex % 2 === 0 ? '#f8fafc' : '#f1f5f9',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          zIndex: -1,
        },
      });

      // Create experience blocks within the phase
      let xOffset = 100;
      const blockSpacing = 250;
      const blockY = yOffset + 60;

      phase.experienceBlocks
        .sort((a, b) => a.order - b.order)
        .forEach((block, blockIndex) => {
          const nodeId = `block-${block.id}`;
          
          newNodes.push({
            id: nodeId,
            type: 'experienceBlock',
            position: { x: xOffset, y: blockY },
            data: {
              block,
              phase,
              journey,
              onUpdate: (updatedBlock: ExperienceBlock) => {
                // Handle block updates
                const updatedJourney = {
                  ...journey,
                  phases: journey.phases.map(p =>
                    p.id === phase.id
                      ? {
                          ...p,
                          experienceBlocks: p.experienceBlocks.map(b =>
                            b.id === block.id ? updatedBlock : b
                          ),
                        }
                      : p
                  ),
                };
                onJourneyUpdate(updatedJourney);
                setIsDirty(true);
              },
            },
          });

          // Connect blocks in sequence
          if (blockIndex > 0) {
            const prevBlockId = `block-${phase.experienceBlocks[blockIndex - 1].id}`;
            newEdges.push({
              id: `edge-${prevBlockId}-${nodeId}`,
              source: prevBlockId,
              target: nodeId,
              ...defaultEdgeOptions,
            });
          }

          xOffset += blockSpacing;
        });

      // Connect phases
      if (phaseIndex > 0) {
        const prevPhaseBlocks = journey.phases[phaseIndex - 1].experienceBlocks;
        const currentPhaseBlocks = phase.experienceBlocks;
        
        if (prevPhaseBlocks.length > 0 && currentPhaseBlocks.length > 0) {
          const lastPrevBlock = prevPhaseBlocks[prevPhaseBlocks.length - 1];
          const firstCurrentBlock = currentPhaseBlocks[0];
          
          newEdges.push({
            id: `edge-phase-${phaseIndex - 1}-${phaseIndex}`,
            source: `block-${lastPrevBlock.id}`,
            target: `block-${firstCurrentBlock.id}`,
            ...defaultEdgeOptions,
            style: { ...defaultEdgeOptions.style, strokeDasharray: '5,5' },
          });
        }
      }

      yOffset += phaseHeight + phaseSpacing;
    });

    // Add outcome trackers
    journey.metricBindings.forEach((metric, index) => {
      newNodes.push({
        id: `metric-${metric.id}`,
        type: 'outcomeTracker',
        position: { x: swimlaneWidth - 200, y: 50 + (index * 80) },
        data: {
          metric,
          journey,
        },
        draggable: false,
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);

    // Fit view after a short delay
    setTimeout(() => {
      fitView({ padding: 0.1, duration: 300 });
    }, 100);
  }, [journey, fitView, onJourneyUpdate, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
    setIsDirty(true);
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');

    if (!type || !reactFlowInstance || !reactFlowBounds) return;

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: {
        label: `New ${type}`,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    toast.success(`Added ${type} block`);
  }, [reactFlowInstance, setNodes]);

  const handleSave = async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/journeys/${journey.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...journey,
          // Include any canvas-specific updates
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
          })),
        }),
      });

      if (response.ok) {
        setIsDirty(false);
        toast.success("Journey saved successfully");
      } else {
        throw new Error("Failed to save journey");
      }
    } catch (error) {
      toast.error("Failed to save journey");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/journeys/${journey.id}/publish`, {
        method: "POST",
      });

      if (response.ok) {
        const updatedJourney = await response.json();
        onJourneyUpdate(updatedJourney);
        toast.success("Journey published successfully");
      } else {
        throw new Error("Failed to publish journey");
      }
    } catch (error) {
      toast.error("Failed to publish journey");
    }
  };

  const handlePreview = () => {
    // Open preview mode
    toast.info("Preview mode coming soon");
  };

  const nodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'experienceBlock':
        return '#6366f1';
      case 'decisionGateway':
        return '#f59e0b';
      case 'outcomeTracker':
        return '#10b981';
      default:
        return '#94a3b8';
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex-none border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{journey.name}</h2>
            <Badge
              variant={journey.status === "PUBLISHED" ? "default" : "secondary"}
              className="text-xs"
            >
              {journey.status}
            </Badge>
            {isDirty && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                Unsaved
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Canvas Controls */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => zoomOut()}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => zoomIn()}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fitView({ padding: 0.1, duration: 300 })}
                className="h-8 w-8 p-0"
              >
                <Layout className="w-4 h-4" />
              </Button>
            </div>

            {/* View Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMiniMap(!showMiniMap)}
            >
              {showMiniMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleInsightDock}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-2 border-l pl-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>

              {journey.status === "DRAFT" && (
                <Button
                  size="sm"
                  onClick={handlePublish}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsFullscreen(!isFullscreen)}>
                    <Maximize2 className="w-4 h-4 mr-2" />
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Create Experiment
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Journey Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={reactFlowWrapper}
        className={cn(
          "flex-1 relative",
          isFullscreen && "fixed inset-0 z-50 bg-white"
        )}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls position="bottom-right" />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          {showMiniMap && (
            <MiniMap
              nodeColor={nodeColor}
              position="top-right"
              className="border border-gray-200 rounded-lg"
            />
          )}
        </ReactFlow>

        {/* AI Suggestions Overlay */}
        <div className="absolute top-4 left-4 z-10">
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <CardTitle className="text-sm">AI Suggestions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Based on your journey design:
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-blue-50 rounded-md text-xs">
                  <strong>Add pulse survey</strong> after Week 4 to measure engagement
                </div>
                <div className="p-2 bg-green-50 rounded-md text-xs">
                  <strong>Insert mentorship touchpoint</strong> in Growth phase
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full text-xs">
                View All Suggestions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function JourneyCanvas(props: JourneyCanvasProps) {
  return (
    <ReactFlowProvider>
      <JourneyCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
