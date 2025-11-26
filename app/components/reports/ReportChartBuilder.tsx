"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Settings2,
  ChevronDown,
  ChevronUp,
  Palette,
  Download,
  Maximize2,
  X,
  RefreshCcw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Report Chart Builder
 * 
 * Provides data visualization capabilities for report data including:
 * - Bar charts
 * - Pie charts  
 * - Line charts
 * - Configurable axes and grouping
 */

type ChartType = "bar" | "pie" | "line" | "area";

interface ChartConfig {
  type: ChartType;
  groupByField: string;
  valueField: string;
  aggregation: "count" | "sum" | "average" | "min" | "max";
  sortBy: "value" | "label" | "none";
  sortOrder: "asc" | "desc";
  limit: number;
  showLegend: boolean;
  showValues: boolean;
  colorScheme: string;
}

interface ReportChartBuilderProps {
  /** Report data rows */
  data: Record<string, any>[];
  /** Available fields from the report */
  fields: Array<{ key: string; label: string; type?: string }>;
  /** Column labels mapping */
  columnLabels: Record<string, string>;
  /** Optional initial config */
  initialConfig?: Partial<ChartConfig>;
  /** Callback when chart is updated */
  onConfigChange?: (config: ChartConfig) => void;
}

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "pie", label: "Pie Chart", icon: PieChart },
  { value: "line", label: "Line Chart", icon: LineChart },
  { value: "area", label: "Area Chart", icon: TrendingUp },
] as const;

const COLOR_SCHEMES = [
  { value: "default", label: "Default", colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"] },
  { value: "blue", label: "Blue", colors: ["#1e40af", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"] },
  { value: "green", label: "Green", colors: ["#166534", "#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"] },
  { value: "purple", label: "Purple", colors: ["#5b21b6", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"] },
  { value: "warm", label: "Warm", colors: ["#c2410c", "#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa"] },
];

const AGGREGATIONS = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
] as const;

const DEFAULT_CONFIG: ChartConfig = {
  type: "bar",
  groupByField: "",
  valueField: "",
  aggregation: "count",
  sortBy: "value",
  sortOrder: "desc",
  limit: 10,
  showLegend: true,
  showValues: true,
  colorScheme: "default",
};

// Simple value accessor that handles nested fields
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((curr, key) => curr?.[key], obj);
}

export function ReportChartBuilder({
  data,
  fields,
  columnLabels,
  initialConfig,
  onConfigChange,
}: ReportChartBuilderProps) {
  const [config, setConfig] = useState<ChartConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
    groupByField: initialConfig?.groupByField || fields[0]?.key || "",
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update config
  const updateConfig = (updates: Partial<ChartConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // Get the color scheme colors
  const colors = useMemo(() => {
    return COLOR_SCHEMES.find((s) => s.value === config.colorScheme)?.colors || COLOR_SCHEMES[0].colors;
  }, [config.colorScheme]);

  // Process data for chart
  const chartData = useMemo(() => {
    if (!config.groupByField || data.length === 0) return [];

    // Group data by the selected field
    const groups = new Map<string, number[]>();
    
    data.forEach((row) => {
      const groupValue = String(getNestedValue(row, config.groupByField) ?? "Unknown");
      const numericValue = config.valueField 
        ? parseFloat(getNestedValue(row, config.valueField)) || 0
        : 1;

      if (!groups.has(groupValue)) {
        groups.set(groupValue, []);
      }
      groups.get(groupValue)!.push(numericValue);
    });

    // Aggregate values
    const aggregated = Array.from(groups.entries()).map(([label, values]) => {
      let value: number;
      switch (config.aggregation) {
        case "count":
          value = values.length;
          break;
        case "sum":
          value = values.reduce((a, b) => a + b, 0);
          break;
        case "average":
          value = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case "min":
          value = Math.min(...values);
          break;
        case "max":
          value = Math.max(...values);
          break;
        default:
          value = values.length;
      }
      return { label, value: Math.round(value * 100) / 100 };
    });

    // Sort
    if (config.sortBy !== "none") {
      aggregated.sort((a, b) => {
        const compareValue = config.sortBy === "value" 
          ? a.value - b.value 
          : a.label.localeCompare(b.label);
        return config.sortOrder === "asc" ? compareValue : -compareValue;
      });
    }

    // Limit
    return aggregated.slice(0, config.limit);
  }, [data, config]);

  // Calculate chart dimensions
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  // Render bar chart
  const renderBarChart = () => (
    <div className="space-y-2 py-4">
      {chartData.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const color = colors[index % colors.length];
        
        return (
          <div key={item.label} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate max-w-[60%]" title={item.label}>
                {item.label}
              </span>
              {config.showValues && (
                <span className="text-sm text-muted-foreground">
                  {item.value.toLocaleString()}
                </span>
              )}
            </div>
            <div className="h-6 bg-muted rounded-md overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="h-full rounded-md"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render pie chart
  const renderPieChart = () => {
    let cumulativePercent = 0;
    
    return (
      <div className="flex items-center gap-8 py-4">
        {/* Pie SVG */}
        <div className="relative w-48 h-48 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {chartData.map((item, index) => {
              const percent = (item.value / total) * 100;
              const startPercent = cumulativePercent;
              cumulativePercent += percent;
              const color = colors[index % colors.length];
              
              // Calculate SVG arc
              const radius = 45;
              const circumference = 2 * Math.PI * radius;
              const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((startPercent / 100) * circumference);
              
              return (
                <motion.circle
                  key={item.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                />
              );
            })}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{total.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>

        {/* Legend */}
        {config.showLegend && (
          <div className="flex-1 space-y-2 max-h-48 overflow-y-auto">
            {chartData.map((item, index) => {
              const color = colors[index % colors.length];
              const percent = ((item.value / total) * 100).toFixed(1);
              
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm truncate flex-1" title={item.label}>
                    {item.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render line/area chart
  const renderLineChart = () => {
    const width = 400;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = chartData.map((item, index) => ({
      x: padding + (index / (chartData.length - 1 || 1)) * chartWidth,
      y: padding + chartHeight - (item.value / maxValue) * chartHeight,
      ...item,
    }));
    
    const pathD = points.reduce((path, point, i) => {
      return path + `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    }, "");
    
    const areaD = config.type === "area"
      ? `${pathD} L ${points[points.length - 1]?.x || padding} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`
      : "";

    return (
      <div className="py-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-lg">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              y1={padding + chartHeight * (1 - ratio)}
              x2={width - padding}
              y2={padding + chartHeight * (1 - ratio)}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
          ))}
          
          {/* Area fill */}
          {config.type === "area" && (
            <motion.path
              d={areaD}
              fill={colors[0]}
              fillOpacity={0.2}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
          
          {/* Line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={colors[0]}
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1 }}
          />
          
          {/* Points */}
          {points.map((point, index) => (
            <g key={index}>
              <motion.circle
                cx={point.x}
                cy={point.y}
                r={4}
                fill={colors[0]}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
              />
              {config.showValues && (
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  className="text-[10px] fill-muted-foreground"
                >
                  {point.value}
                </text>
              )}
            </g>
          ))}
          
          {/* X-axis labels */}
          {points.map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              className="text-[9px] fill-muted-foreground"
            >
              {point.label.slice(0, 8)}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Select a field to visualize</p>
        </div>
      );
    }

    switch (config.type) {
      case "bar":
        return renderBarChart();
      case "pie":
        return renderPieChart();
      case "line":
      case "area":
        return renderLineChart();
      default:
        return renderBarChart();
    }
  };

  const chartContent = (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Data Visualization</h3>
            <p className="text-xs text-muted-foreground">
              {chartData.length} categories • {config.type} chart
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Configuration */}
            <div className="px-4 pb-4 border-b bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Chart Type */}
                <div>
                  <Label className="text-xs mb-1.5 block">Chart Type</Label>
                  <Select value={config.type} onValueChange={(v) => updateConfig({ type: v as ChartType })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Group By */}
                <div>
                  <Label className="text-xs mb-1.5 block">Group By</Label>
                  <Select value={config.groupByField} onValueChange={(v) => updateConfig({ groupByField: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {columnLabels[field.key] || field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aggregation */}
                <div>
                  <Label className="text-xs mb-1.5 block">Aggregation</Label>
                  <Select value={config.aggregation} onValueChange={(v) => updateConfig({ aggregation: v as any })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGGREGATIONS.map((agg) => (
                        <SelectItem key={agg.value} value={agg.value}>
                          {agg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color Scheme */}
                <div>
                  <Label className="text-xs mb-1.5 block">Colors</Label>
                  <Select value={config.colorScheme} onValueChange={(v) => updateConfig({ colorScheme: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_SCHEMES.map((scheme) => (
                        <SelectItem key={scheme.value} value={scheme.value}>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {scheme.colors.slice(0, 3).map((c, i) => (
                                <div
                                  key={i}
                                  className="w-3 h-3 rounded-full -ml-1 first:ml-0 border border-white"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            {scheme.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="p-4">
              {renderChart()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {chartContent}

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Data Visualization
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {renderChart()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReportChartBuilder;

