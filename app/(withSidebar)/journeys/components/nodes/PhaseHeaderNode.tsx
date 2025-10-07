"use client";

import { memo } from "react";
import { NodeProps } from "reactflow";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  duration?: number;
  phaseType: "SEQUENTIAL" | "PARALLEL" | "CONDITIONAL";
  experienceBlocks: any[];
}

interface PhaseHeaderNodeData {
  phase: JourneyPhase;
  width: number;
  height: number;
}

const PHASE_TYPE_CONFIG = {
  SEQUENTIAL: {
    icon: <Play className="w-4 h-4" />,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Steps run in sequence",
  },
  PARALLEL: {
    icon: <Users className="w-4 h-4" />,
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Steps run simultaneously",
  },
  CONDITIONAL: {
    icon: <Target className="w-4 h-4" />,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Steps run based on conditions",
  },
};

export const PhaseHeaderNode = memo(({ data }: NodeProps<PhaseHeaderNodeData>) => {
  const { phase, width, height } = data;
  const config = PHASE_TYPE_CONFIG[phase.phaseType];
  
  // Mock phase metrics
  const completionRate = Math.floor(Math.random() * 30) + 70; // 70-100%
  const avgDuration = phase.duration ? phase.duration + Math.floor(Math.random() * 5) - 2 : undefined;
  const participantCount = Math.floor(Math.random() * 100) + 20;
  const blocksCount = phase.experienceBlocks.length;
  const completedBlocks = Math.floor(blocksCount * (completionRate / 100));

  return (
    <TooltipProvider>
      <div
        className="relative border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 overflow-hidden"
        style={{ width, height }}
      >
        {/* Phase Header */}
        <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{phase.order}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{phase.name}</h3>
                  {phase.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {phase.description}
                    </p>
                  )}
                </div>
              </div>

              <Badge variant="outline" className={cn("text-xs", config.color)}>
                {config.icon}
                <span className="ml-1">{phase.phaseType}</span>
              </Badge>
            </div>

            {/* Phase Metrics */}
            <div className="flex items-center gap-4 text-sm">
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{completedBlocks}/{blocksCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Completed blocks in this phase</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{participantCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Active participants in this phase</p>
                </TooltipContent>
              </Tooltip>

              {phase.duration && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{phase.duration}d</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Target duration: {phase.duration} days</p>
                    {avgDuration && <p>Actual average: {avgDuration} days</p>}
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{completionRate}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Phase completion rate</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Phase Progress</span>
              <span>{completionRate}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Phase Content Area */}
        <div className="absolute top-24 left-0 right-0 bottom-0 p-4">
          {/* This area will contain the experience blocks */}
          <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center opacity-30">
            <div className="text-center text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Experience blocks will appear here</p>
            </div>
          </div>
        </div>

        {/* Phase Status Indicators */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {completionRate >= 90 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Phase performing well</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {completionRate < 60 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Phase needs attention</p>
              </TooltipContent>
            </Tooltip>
          )}

          {completionRate >= 60 && completionRate < 90 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Phase progressing normally</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Phase Type Indicator */}
        <div className="absolute bottom-4 left-4">
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className={cn("text-xs", config.color)}>
                {config.icon}
                <span className="ml-1">{phase.phaseType}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{config.description}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
});
