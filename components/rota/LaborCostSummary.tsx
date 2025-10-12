'use client';

import { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download,
  ChevronDown,
  ChevronUp,
  Building2,
  AlertTriangle,
} from 'lucide-react';

interface LaborCostSummaryProps {
  data: {
    totalCost: number;
    regularCost: number;
    overtimeCost: number;
    budgeted?: number;
    departmentBreakdown: Array<{
      departmentId: string;
      departmentName: string;
      cost: number;
      hours: number;
      employeeCount: number;
    }>;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
  onExport?: () => void;
  collapsible?: boolean;
}

export default function LaborCostSummary({
  data,
  dateRange,
  onExport,
  collapsible = false,
}: LaborCostSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const budgetVariance = data.budgeted ? data.totalCost - data.budgeted : null;
  const budgetVariancePercent = data.budgeted 
    ? ((data.totalCost - data.budgeted) / data.budgeted) * 100 
    : null;

  const isOverBudget = budgetVariance !== null && budgetVariance > 0;
  const overtimePercent = data.totalCost > 0 
    ? (data.overtimeCost / data.totalCost) * 100 
    : 0;

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div 
        className={`p-6 border-b border-white/10 ${collapsible ? 'cursor-pointer hover:bg-white/5' : ''}`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Labor Cost Summary</h3>
              <p className="text-sm text-gray-400">
                {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExport();
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all"
                title="Export to payroll"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {collapsible && (
              isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Total Cost */}
          <div className="p-6 border-b border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Total Cost</div>
                <div className="text-3xl font-bold text-white">
                  ${data.totalCost.toFixed(2)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Regular Hours</div>
                <div className="text-2xl font-semibold text-gray-300">
                  ${data.regularCost.toFixed(2)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Overtime</div>
                <div className="text-2xl font-semibold text-amber-400">
                  ${data.overtimeCost.toFixed(2)}
                  {overtimePercent > 0 && (
                    <span className="text-sm ml-2">({overtimePercent.toFixed(1)}%)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Budget Comparison */}
          {data.budgeted !== undefined && (
            <div className="p-6 border-b border-white/10">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Budget Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Budgeted</div>
                  <div className="text-xl font-semibold text-gray-300">
                    ${data.budgeted.toFixed(2)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400 mb-1">Variance</div>
                  <div className={`text-xl font-semibold flex items-center gap-2 ${
                    isOverBudget ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {isOverBudget ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    {isOverBudget ? '+' : ''}${Math.abs(budgetVariance!).toFixed(2)}
                    {budgetVariancePercent !== null && (
                      <span className="text-sm">
                        ({isOverBudget ? '+' : ''}{budgetVariancePercent.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {isOverBudget && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300">
                    Labor costs are over budget by ${Math.abs(budgetVariance!).toFixed(2)}. 
                    Consider reviewing shift assignments or overtime usage.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Department Breakdown */}
          {data.departmentBreakdown.length > 0 && (
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Department Breakdown
              </h4>
              <div className="space-y-3">
                {data.departmentBreakdown.map((dept) => {
                  const deptPercent = (dept.cost / data.totalCost) * 100;
                  
                  return (
                    <div key={dept.departmentId} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-white">{dept.departmentName}</div>
                          <div className="text-xs text-gray-400">
                            {dept.employeeCount} employee{dept.employeeCount !== 1 ? 's' : ''} · {dept.hours.toFixed(1)} hours
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-white">${dept.cost.toFixed(2)}</div>
                          <div className="text-xs text-gray-400">{deptPercent.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                          style={{ width: `${deptPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {data.departmentBreakdown.length === 0 && (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400">No department data available</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
