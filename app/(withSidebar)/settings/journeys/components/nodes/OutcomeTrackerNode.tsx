"use client";

import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  Settings,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricBinding {
  id: string;
  metricName: string;
  metricType: "COMPLETION_RATE" | "SATISFACTION_SCORE" | "TIME_TO_COMPLETE" | "ENGAGEMENT_SCORE" | "RETENTION_RATE" | "CUSTOM";
  targetValue?: number;
  currentValue?: number;
  dataSource?: string;
  isKPI: boolean;
}

interface OutcomeTrackerNodeData {
  metric: MetricBinding;
  journey: any;
}

const METRIC_TYPE_CONFIG = {
  COMPLETION_RATE: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "bg-green-100 text-green-800 border-green-200",
    unit: "%",
    format: (value: number) => `${value.toFixed(1)}%`,
  },
  SATISFACTION_SCORE: {
    icon: <Target className="w-4 h-4" />,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    unit: "/10",
    format: (value: number) => `${value.toFixed(1)}/10`,
  },
  TIME_TO_COMPLETE: {
    icon: <Clock className="w-4 h-4" />,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    unit: "days",
    format: (value: number) => `${value.toFixed(1)}d`,
  },
  ENGAGEMENT_SCORE: {
    icon: <Users className="w-4 h-4" />,
    color: "bg-orange-100 text-orange-800 border-orange-200",
    unit: "%",
    format: (value: number) => `${value.toFixed(1)}%`,
  },
  RETENTION_RATE: {
    icon: <TrendingUp className="w-4 h-4" />,
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    unit: "%",
    format: (value: number) => `${value.toFixed(1)}%`,
  },
  CUSTOM: {
    icon: <BarChart3 className="w-4 h-4" />,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    unit: "",
    format: (value: number) => value.toString(),
  },
};

export const OutcomeTrackerNode = memo(({ data }: NodeProps<OutcomeTrackerNodeData>) => {
  const { metric, journey } = data;
  const [isExpanded, setIsExpanded] = useState(false);
  
  const config = METRIC_TYPE_CONFIG[metric.metricType];
  
  // Mock current values if not provided
  const currentValue = metric.currentValue ?? (Math.random() * 100);
  const targetValue = metric.targetValue ?? 85;
  const previousValue = currentValue + (Math.random() * 20 - 10); // Mock previous period
  
  const getPerformanceStatus = () => {
    if (!targetValue) return "neutral";
    const performance = (currentValue / targetValue) * 100;
    if (performance >= 95) return "excellent";
    if (performance >= 85) return "good";
    if (performance >= 70) return "warning";
    return "critical";
  };

  const getTrendIcon = () => {
    const trend = currentValue - previousValue;
    if (Math.abs(trend) < 1) return <Minus className="w-3 h-3 text-gray-500" />;
    return trend > 0 ? 
      <TrendingUp className="w-3 h-3 text-green-600" /> : 
      <TrendingDown className="w-3 h-3 text-red-600" />;
  };

  const getStatusColor = () => {
    const status = getPerformanceStatus();
    switch (status) {
      case "excellent":
        return "border-green-500 bg-green-50";
      case "good":
        return "border-blue-500 bg-blue-50";
      case "warning":
        return "border-yellow-500 bg-yellow-50";
      case "critical":
        return "border-red-500 bg-red-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getProgressPercentage = () => {
    if (!targetValue) return 50;
    return Math.min((currentValue / targetValue) * 100, 100);
  };

  return (
    <TooltipProvider>
      <Card className={cn(
        "w-48 shadow-md transition-all duration-200 border-2",
        getStatusColor(),
        isExpanded && "w-64"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-1 rounded", config.color)}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-xs truncate">{metric.metricName}</h3>
                {metric.isKPI && (
                  <Badge variant="outline" className="text-xs mt-1">
                    KPI
                  </Badge>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Current Value */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {config.format(currentValue)}
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon()}
              <span>vs last period</span>
            </div>
          </div>

          {/* Progress to Target */}
          {targetValue && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Target</span>
                <span className="font-medium">{config.format(targetValue)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    "rounded-full h-2 transition-all duration-300",
                    getPerformanceStatus() === "excellent" && "bg-green-500",
                    getPerformanceStatus() === "good" && "bg-blue-500",
                    getPerformanceStatus() === "warning" && "bg-yellow-500",
                    getPerformanceStatus() === "critical" && "bg-red-500"
                  )}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {getProgressPercentage().toFixed(0)}% of target
              </div>
            </div>
          )}

          {/* Status Indicator */}
          <div className="flex items-center justify-center">
            {getPerformanceStatus() === "excellent" && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-green-700 text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Exceeding target</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Performance is above target by {((currentValue / targetValue - 1) * 100).toFixed(1)}%</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {getPerformanceStatus() === "critical" && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-red-700 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Needs attention</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Performance is {((1 - currentValue / targetValue) * 100).toFixed(1)}% below target</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data source:</span>
                  <span className="font-medium">{metric.dataSource || "Journey analytics"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last updated:</span>
                  <span className="font-medium">{Math.floor(Math.random() * 24)}h ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sample size:</span>
                  <span className="font-medium">{Math.floor(Math.random() * 500) + 100}</span>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="w-full text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />
                View Details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});
