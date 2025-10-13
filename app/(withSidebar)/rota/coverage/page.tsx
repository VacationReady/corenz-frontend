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
      <div className="p-8 min-h-screen">
        <div className="max-w-2xl mx-auto text-center py-16">
          <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Rota Group Selected</h2>
          <p className="text-gray-400 mb-6">
            Please select a rota group to view coverage analysis
          </p>
          <Link
            href="/admin/rota-groups"
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all inline-block"
          >
            Go to Rota Groups
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading coverage analysis...</div>
      </div>
    );
  }

  if (!coverage) {
    return (
      <div className="p-8 min-h-screen">
        <div className="text-center py-16">
          <p className="text-gray-400">Failed to load coverage data</p>
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
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/rota-groups/${groupId}/requirements`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Requirements
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{coverage.rotaGroup.icon || '📋'}</span>
              <h1 className="text-3xl font-bold text-white">{coverage.rotaGroup.name}</h1>
            </div>
            <p className="text-gray-400">
              Coverage Analysis & Gap Detection
            </p>
          </div>

          {/* Week Navigator */}
          <div className="flex items-center gap-4">
            <button
              onClick={previousWeek}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-white font-medium">
                {format(new Date(coverage.weekStart), 'MMM d')} -{' '}
                {format(new Date(coverage.weekEnd), 'MMM d, yyyy')}
              </div>
              <div className="text-gray-400 text-sm">Week View</div>
            </div>
            <button
              onClick={nextWeek}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Gaps</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white">{coverage.summary.totalGaps}</div>
        </div>

        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-300 text-sm">Critical Gaps</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold text-red-400">{coverage.summary.criticalGaps}</div>
        </div>

        <div className="bg-orange-500/10 backdrop-blur-md border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-300 text-sm">High Priority</span>
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-orange-400">{coverage.summary.highGaps}</div>
        </div>

        <div className="bg-green-500/10 backdrop-blur-md border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-300 text-sm">Requirements</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-400">{coverage.summary.totalRequirements}</div>
        </div>
      </div>

      {/* Gap Detection by Day */}
      {coverage.summary.totalGaps === 0 ? (
        <div className="bg-green-500/10 backdrop-blur-md border border-green-500/30 rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Perfect Coverage!</h3>
          <p className="text-gray-300">
            All staffing requirements are met for this week. Great job!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {gapsByDay.map(({ day, dayIndex, gaps }) => {
            if (gaps.length === 0) return null;

            return (
              <div key={dayIndex} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-white/5 border-b border-white/10 p-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    {day} - {gaps.length} Gap{gaps.length !== 1 ? 's' : ''} Detected
                  </h3>
                </div>

                <div className="divide-y divide-white/10">
                  {gaps.map((gap, idx) => (
                    <div key={idx} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                              gap.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              gap.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                              'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            }`}>
                              {gap.priority}
                            </span>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30">
                              {gap.role}
                            </span>
                          </div>
                          <div className="text-white text-lg font-medium">
                            Need <span className="text-red-400 font-bold">{gap.gap} more</span> {gap.role}
                            {gap.gap !== 1 ? 's' : ''}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Currently scheduled: {gap.scheduled} / {gap.required}
                          </div>
                        </div>
                      </div>

                      {/* AI Suggestions */}
                      {gap.suggestions.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 text-sm font-medium">
                              💡 Available Employees
                            </span>
                          </div>
                          <div className="space-y-2">
                            {gap.suggestions.map((suggestion, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-white">{suggestion.employeeName}</span>
                                {suggestion.canWork ? (
                                  <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                                    ✓ Available
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">{suggestion.reason}</span>
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
          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
        >
          Schedule Shifts
        </Link>
        <Link
          href={`/admin/rota-groups/${groupId}/requirements`}
          className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
        >
          Edit Requirements
        </Link>
      </div>
    </div>
  );
}
