"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Info,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartTooltip } from "@/components/ui/SmartTooltip";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";

interface AffectedEmployee {
  id: string;
  name: string;
  department: string;
  role: string;
  impact: "positive" | "negative" | "neutral";
}

interface CostBreakdown {
  category: string;
  current: number;
  projected: number;
  change: number;
  changePercent: number;
}

interface ImpactMetric {
  label: string;
  current: number | string;
  projected: number | string;
  change: number | string;
  changeType: "increase" | "decrease" | "neutral";
  unit?: string;
}

interface Risk {
  level: "low" | "medium" | "high";
  title: string;
  description: string;
  mitigation?: string;
}

interface ImpactPreviewProps {
  settingType: string;
  settingChange: any;
  showFullAnalysis?: boolean;
  onApply?: () => void;
  onCancel?: () => void;
}

export function ImpactPreview({
  settingType,
  settingChange,
  showFullAnalysis = false,
  onApply,
  onCancel,
}: ImpactPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [impactData, setImpactData] = useState<{
    affectedCount: number;
    affectedDepartments: string[];
    affectedRoles: string[];
    costImpact: {
      immediate: number;
      annual: number;
      breakdown: CostBreakdown[];
    };
    metrics: ImpactMetric[];
    risks: Risk[];
    timeline: { phase: string; duration: string; description: string }[];
    recommendation: string;
  } | null>(null);

  useEffect(() => {
    // Simulate loading impact analysis
    const timer = setTimeout(() => {
      setImpactData(generateMockImpactData(settingType, settingChange));
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [settingType, settingChange]);

  const generateMockImpactData = (type: string, change: any) => {
    // Generate realistic mock data based on setting type
    if (type === "leave-policy") {
      return {
        affectedCount: 142,
        affectedDepartments: ["Engineering", "Sales", "Marketing", "HR"],
        affectedRoles: ["Full-time Employee", "Part-time Employee"],
        costImpact: {
          immediate: 0,
          annual: 125000,
          breakdown: [
            {
              category: "Leave Liability",
              current: 450000,
              projected: 475000,
              change: 25000,
              changePercent: 5.5,
            },
            {
              category: "Productivity Impact",
              current: 800000,
              projected: 850000,
              change: 50000,
              changePercent: 6.25,
            },
            {
              category: "Administrative Cost",
              current: 50000,
              projected: 50000,
              change: 0,
              changePercent: 0,
            },
          ],
        },
        metrics: [
          {
            label: "Average Leave Days",
            current: "18",
            projected: "20",
            change: "+2",
            changeType: "increase",
            unit: "days/year",
          },
          {
            label: "Accrual Rate",
            current: "1.5",
            projected: "1.67",
            change: "+0.17",
            changeType: "increase",
            unit: "days/month",
          },
          {
            label: "Employee Satisfaction",
            current: "72%",
            projected: "78%",
            change: "+6%",
            changeType: "increase",
          },
        ],
        risks: [
          {
            level: "low",
            title: "Budget Impact",
            description: "Increased leave liability of $25,000 annually",
            mitigation: "Already accounted for in Q3 budget revision",
          },
          {
            level: "medium",
            title: "Coverage Gaps",
            description: "Potential for more simultaneous absences",
            mitigation: "Implement blackout periods for critical projects",
          },
        ],
        timeline: [
          {
            phase: "Immediate",
            duration: "Today",
            description: "Policy activated for new accruals",
          },
          {
            phase: "Transition",
            duration: "1-30 days",
            description: "Employees notified, systems updated",
          },
          {
            phase: "Full Implementation",
            duration: "30+ days",
            description: "New accrual rates fully in effect",
          },
        ],
        recommendation: "This change aligns with industry standards and will improve employee retention. The cost increase is manageable within current budgets.",
      };
    }

    // Default mock data for other setting types
    return {
      affectedCount: 87,
      affectedDepartments: ["All Departments"],
      affectedRoles: ["All Roles"],
      costImpact: {
        immediate: 5000,
        annual: 15000,
        breakdown: [
          {
            category: "Implementation",
            current: 0,
            projected: 5000,
            change: 5000,
            changePercent: 100,
          },
          {
            category: "Ongoing Operations",
            current: 10000,
            projected: 15000,
            change: 5000,
            changePercent: 50,
          },
        ],
      },
      metrics: [
        {
          label: "Process Efficiency",
          current: "65%",
          projected: "85%",
          change: "+20%",
          changeType: "increase",
        },
        {
          label: "Time Saved",
          current: "0",
          projected: "5",
          change: "+5",
          changeType: "increase",
          unit: "hours/week",
        },
      ],
      risks: [
        {
          level: "low",
          title: "User Adoption",
          description: "Some users may need training on new process",
          mitigation: "Provide quick tutorial and documentation",
        },
      ],
      timeline: [
        {
          phase: "Setup",
          duration: "1 day",
          description: "Configure and test settings",
        },
        {
          phase: "Rollout",
          duration: "1 week",
          description: "Gradual deployment to all users",
        },
      ],
      recommendation: "Low-risk change with significant efficiency gains. Proceed with implementation.",
    };
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!impactData) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getImpactColor = (changeType: string) => {
    switch (changeType) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Impact Analysis
              </CardTitle>
              <CardDescription>
                Preview how this change will affect your organization
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              <Info className="h-3 w-3 mr-1" />
              Real-time calculation
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <SmartTooltip
                  title="Affected Employees"
                  description="Number of employees directly impacted by this change"
                  example="Includes all active employees in selected departments"
                >
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </SmartTooltip>
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {impactData.affectedCount}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                employees affected
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Across {impactData.affectedDepartments.length} departments
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <SmartTooltip
                  title="Cost Impact"
                  description="Projected annual cost change from this configuration"
                  tips={["Includes direct and indirect costs", "Based on current employee data"]}
                >
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </SmartTooltip>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(impactData.costImpact.annual)}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                annual impact
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {impactData.costImpact.immediate > 0 && 
                  `${formatCurrency(impactData.costImpact.immediate)} immediate`
                }
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-5 w-5 text-purple-600" />
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    impactData.risks[0]?.level === "high" ? "border-red-500 text-red-600" :
                    impactData.risks[0]?.level === "medium" ? "border-orange-500 text-orange-600" :
                    "border-green-500 text-green-600"
                  )}
                >
                  {impactData.risks[0]?.level || "Low"} Risk
                </Badge>
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {impactData.timeline.length}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">
                implementation phases
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Full rollout in {impactData.timeline[impactData.timeline.length - 1]?.duration}
              </div>
            </div>
          </div>

          {/* Metrics Changes */}
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Key Metrics Changes
            </h4>
            {impactData.metrics.map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium">{metric.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {metric.current} → {metric.projected} {metric.unit}
                  </div>
                </div>
                <div className={cn("flex items-center gap-2", getImpactColor(metric.changeType))}>
                  {metric.changeType === "increase" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : metric.changeType === "decrease" ? (
                    <ArrowDown className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  <span className="font-semibold">{metric.change}</span>
                </div>
              </div>
            ))}
          </div>

          {showFullAnalysis && (
            <>
              {/* Cost Breakdown */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Cost Breakdown
                </h4>
                <div className="space-y-2">
                  {impactData.costImpact.breakdown.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.category}</span>
                        <span className={cn(
                          "font-medium",
                          item.change > 0 ? "text-red-600" : 
                          item.change < 0 ? "text-green-600" : 
                          "text-gray-600"
                        )}>
                          {item.change > 0 ? "+" : ""}{formatCurrency(item.change)}
                          {item.changePercent !== 0 && (
                            <span className="text-xs ml-1">({item.changePercent}%)</span>
                          )}
                        </span>
                      </div>
                      <Progress 
                        value={(item.projected / (item.current + item.projected)) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Assessment
                </h4>
                <div className="space-y-2">
                  {impactData.risks.map((risk, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-3 rounded-lg border",
                        getRiskColor(risk.level)
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{risk.title}</div>
                          <div className="text-xs mt-1 opacity-90">{risk.description}</div>
                          {risk.mitigation && (
                            <div className="text-xs mt-2 flex items-start gap-1">
                              <CheckCircle className="h-3 w-3 mt-0.5" />
                              <span>Mitigation: {risk.mitigation}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {risk.level}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Implementation Timeline */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Implementation Timeline
                </h4>
                <div className="relative">
                  {impactData.timeline.map((phase, idx) => (
                    <div key={idx} className="flex items-start gap-3 pb-4">
                      <div className="relative">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {idx + 1}
                        </div>
                        {idx < impactData.timeline.length - 1 && (
                          <div className="absolute top-8 left-4 w-0.5 h-full bg-border" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{phase.phase}</div>
                        <div className="text-xs text-muted-foreground">{phase.duration}</div>
                        <div className="text-xs mt-1">{phase.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recommendation */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm mb-1">AI Recommendation</div>
                <div className="text-sm text-muted-foreground">
                  {impactData.recommendation}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {(onApply || onCancel) && (
            <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              {onApply && (
                <Button onClick={onApply}>
                  Apply Changes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
