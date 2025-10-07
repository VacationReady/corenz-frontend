"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GitBranch,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowDown,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionGateway {
  id: string;
  name: string;
  description?: string;
  condition: any; // JSON condition definition
  order: number;
}

interface DecisionGatewayNodeData {
  gateway: DecisionGateway;
  onUpdate: (gateway: DecisionGateway) => void;
}

export const DecisionGatewayNode = memo(({ data, selected }: NodeProps<DecisionGatewayNodeData>) => {
  const { gateway, onUpdate } = data;
  const [isHovered, setIsHovered] = useState(false);

  // Mock decision metrics
  const truePathPercentage = Math.floor(Math.random() * 40) + 30; // 30-70%
  const falsePathPercentage = 100 - truePathPercentage;
  const totalDecisions = Math.floor(Math.random() * 500) + 100;

  const handleEdit = () => {
    console.log("Edit gateway:", gateway.id);
  };

  const handleDuplicate = () => {
    const duplicatedGateway = {
      ...gateway,
      id: `${gateway.id}-copy`,
      name: `${gateway.name} (Copy)`,
      order: gateway.order + 1,
    };
    onUpdate(duplicatedGateway);
  };

  const handleDelete = () => {
    console.log("Delete gateway:", gateway.id);
  };

  const getConditionSummary = () => {
    // Mock condition parsing
    if (gateway.condition?.field) {
      return `${gateway.condition.field} ${gateway.condition.operator || '='} ${gateway.condition.value || 'value'}`;
    }
    return "No condition set";
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative group transition-all duration-200",
          selected && "ring-2 ring-primary ring-offset-2"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 border-2 border-white bg-amber-500"
        />
        
        {/* True Path Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className="w-3 h-3 border-2 border-white bg-green-500"
          style={{ top: '30%' }}
        />
        
        {/* False Path Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="w-3 h-3 border-2 border-white bg-red-500"
          style={{ top: '70%' }}
        />

        {/* Main Diamond Shape */}
        <div className="relative">
          {/* Diamond Background */}
          <div
            className={cn(
              "w-32 h-32 transform rotate-45 border-2 transition-all duration-200",
              selected ? "border-primary bg-primary/5 shadow-lg" : "border-amber-400 bg-amber-50",
              isHovered && "shadow-lg scale-105"
            )}
          />

          {/* Content Container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 flex flex-col items-center justify-center text-center p-2">
              {/* Icon */}
              <GitBranch className="w-6 h-6 text-amber-700 mb-1" />
              
              {/* Title */}
              <h3 className="font-medium text-xs text-amber-900 line-clamp-2 leading-tight">
                {gateway.name}
              </h3>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 bg-white border shadow-sm"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Condition
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Paths
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Path Labels */}
        <div className="absolute -right-16 top-6">
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                <CheckCircle2 className="w-3 h-3" />
                <span>True</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{truePathPercentage}% of participants ({Math.floor(totalDecisions * truePathPercentage / 100)})</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="absolute -right-16 bottom-6">
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                <XCircle className="w-3 h-3" />
                <span>False</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{falsePathPercentage}% of participants ({Math.floor(totalDecisions * falsePathPercentage / 100)})</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Condition Details Card */}
        {isHovered && (
          <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 z-10">
            <Card className="w-64 shadow-lg border-amber-200">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-sm">Decision Logic</span>
                  </div>
                  
                  <div className="text-xs bg-gray-50 p-2 rounded font-mono">
                    {getConditionSummary()}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total decisions:</span>
                    <span className="font-medium">{totalDecisions.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>True path</span>
                      </div>
                      <span className="font-medium">{truePathPercentage}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span>False path</span>
                      </div>
                      <span className="font-medium">{falsePathPercentage}%</span>
                    </div>
                  </div>

                  {/* Visual distribution */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="flex h-full">
                      <div
                        className="bg-green-500"
                        style={{ width: `${truePathPercentage}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${falsePathPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Warning indicator for unbalanced splits */}
        {(truePathPercentage < 10 || falsePathPercentage < 10) && (
          <div className="absolute -top-1 -left-1">
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="w-4 h-4 text-amber-500 bg-white rounded-full p-0.5" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Unbalanced decision split detected</p>
                <p className="text-xs text-muted-foreground">Consider reviewing the condition logic</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});
