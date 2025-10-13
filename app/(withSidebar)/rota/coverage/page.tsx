'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';

interface CoverageGap {
  date: string;
  dayOfWeek: number;
  role: string;
  required: number;
  scheduled: number;
  gap: number;
  priority: string;
  suggestions: Array<{
    employeeId: string;
    employeeName: string;
    canWork: boolean;
    reason?: string;
  }>;
}

interface CoverageData {
  weekStart: string;
  weekEnd: string;
  rotaGroup: {
    id: string;
    name: string;
    icon?: string;
  };
  summary: {
    totalGaps: number;
    criticalGaps: number;
    highGaps: number;
    totalRequirements: number;
  };
  gaps: CoverageGap[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CoverageDashboardPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');

  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );

  useEffect(() => {
    if (groupId) {
      fetchCoverage();
    }
  }, [groupId, currentWeekStart]);

  const fetchCoverage = async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/rota-groups/${groupId}/coverage?weekStart=${currentWeekStart}`
      );
      const data = await response.json();
      setCoverage(data);
    } catch (error) {
      console.error('Error fetching coverage:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousWeek = () => {
    const date = new Date(currentWeekStart);
    setCurrentWeekStart(format(subWeeks(date, 1), 'yyyy-MM-dd'));
  };

  const nextWeek = () => {
    const date = new Date(currentWeekStart);
    setCurrentWeekStart(format(addWeeks(date, 1), 'yyyy-MM-dd'));
  };

  if (!groupId) {
    return (
      <div className="w-full min-h-screen bg-content-panel">
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="max-w-2xl mx-auto text-center py-16">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Rota Group Selected</h2>
            <p className="text-muted-foreground mb-6">
              Please select a rota group to view coverage analysis
            </p>
            <Link
              href="/admin/rota-groups"
              className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all inline-block"
            >
              Go to Rota Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-content-panel p-8 flex items-center justify-center">
        <div className="text-foreground text-lg">Loading coverage analysis...</div>
      </div>
    );
  }

  if (!coverage) {
    return (
      <div className="w-full min-h-screen bg-content-panel p-8">
        <div className="text-center py-16">
          <p className="text-muted-foreground">Failed to load coverage data</p>
        </div>
      </div>
    );
  }

  const gapsByDay = DAYS.map((day, idx) => ({
    day,
    dayIndex: (idx + 1) % 7, // Convert to match dayOfWeek (Mon=1, Sun=0)
    gaps: coverage.gaps.filter(g => g.dayOfWeek === (idx + 1) % 7),
  }));

  return (
    <div className="w-full min-h-screen bg-content-panel">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/admin/rota-groups/${groupId}/requirements`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Requirements
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{coverage.rotaGroup.icon || '📋'}</span>
                <h1 className="text-4xl font-bold text-foreground">{coverage.rotaGroup.name}</h1>
              </div>
              <p className="text-muted-foreground">
                Coverage Analysis & Gap Detection
              </p>
            </div>

            {/* Week Navigator */}
            <div className="flex items-center gap-4">
              <button
                onClick={previousWeek}
                className="p-2 rounded-lg bg-card hover:bg-accent border border-border text-card-foreground transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="text-foreground font-medium">
                  {format(new Date(coverage.weekStart), 'MMM d')} -{' '}
                  {format(new Date(coverage.weekEnd), 'MMM d, yyyy')}
                </div>
                <div className="text-muted-foreground text-sm">Week View</div>
              </div>
              <button
                onClick={nextWeek}
                className="p-2 rounded-lg bg-card hover:bg-accent border border-border text-card-foreground transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card backdrop-blur-md border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Total Gaps</span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-card-foreground">{coverage.summary.totalGaps}</div>
          </div>

          <div className="bg-destructive/10 backdrop-blur-md border border-destructive/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-destructive text-sm">Critical Gaps</span>
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="text-3xl font-bold text-destructive">{coverage.summary.criticalGaps}</div>
          </div>

          <div className="bg-orange-500/10 backdrop-blur-md border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-600 text-sm">High Priority</span>
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-600">{coverage.summary.highGaps}</div>
          </div>

          <div className="bg-green-500/10 backdrop-blur-md border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-600 text-sm">Requirements</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{coverage.summary.totalRequirements}</div>
          </div>
        </div>

        {/* Gap Detection by Day */}
        {coverage.summary.totalGaps === 0 ? (
          <div className="bg-green-500/10 backdrop-blur-md border border-green-500/30 rounded-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Perfect Coverage!</h3>
            <p className="text-muted-foreground">
              All staffing requirements are met for this week. Great job!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {gapsByDay.map(({ day, dayIndex, gaps }) => {
              if (gaps.length === 0) return null;

              return (
                <div key={dayIndex} className="bg-card backdrop-blur-md border border-border rounded-xl overflow-hidden">
                  <div className="bg-card-header border-b border-border p-4">
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      {day} - {gaps.length} Gap{gaps.length !== 1 ? 's' : ''} Detected
                    </h3>
                  </div>

                  <div className="divide-y divide-border">
                    {gaps.map((gap, idx) => (
                      <div key={idx} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                gap.priority === 'CRITICAL' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                                gap.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-600 border border-orange-500/30' :
                                'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
                              }`}>
                                {gap.priority}
                              </span>
                              <span className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full border border-primary/30">
                                {gap.role}
                              </span>
                            </div>
                            <div className="text-card-foreground text-lg font-medium">
                              Need <span className="text-destructive font-bold">{gap.gap} more</span> {gap.role}
                              {gap.gap !== 1 ? 's' : ''}
                            </div>
                            <div className="text-muted-foreground text-sm">
                              Currently scheduled: {gap.scheduled} / {gap.required}
                            </div>
                          </div>
                        </div>

                        {/* AI Suggestions */}
                        {gap.suggestions.length > 0 && (
                          <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-primary" />
                              <span className="text-primary text-sm font-medium">
                                💡 Available Employees
                              </span>
                            </div>
                            <div className="space-y-2">
                              {gap.suggestions.map((suggestion, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-card-foreground">{suggestion.employeeName}</span>
                                  {suggestion.canWork ? (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-600 rounded text-xs">
                                      ✓ Available
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">{suggestion.reason}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Link
            href={`/rota?groupId=${groupId}`}
            className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all"
          >
            Schedule Shifts
          </Link>
          <Link
            href={`/admin/rota-groups/${groupId}/requirements`}
            className="px-6 py-3 rounded-lg bg-card hover:bg-accent border border-border text-card-foreground font-medium transition-all"
          >
            Edit Requirements
          </Link>
        </div>
      </div>
    </div>
  );
}
