"use client";

import { Bug, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { BugStats } from "@/types/bugs";

interface AdminBugStatsProps {
  stats: BugStats | null;
  isLoading?: boolean;
}

/**
 * AdminBugStats Component
 * 
 * Displays aggregate bug statistics in modern glass-morphism stat cards.
 * Matches existing tenant admin portal design.
 * 
 * Requirements: 7.7
 */
export function AdminBugStats({ stats, isLoading = false }: AdminBugStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-200 p-3 h-12 w-12" />
              <div className="space-y-2">
                <div className="h-3 w-20 bg-gray-200 rounded" />
                <div className="h-6 w-12 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Bugs",
      value: stats?.total ?? 0,
      icon: Bug,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      label: "Open",
      value: stats?.open ?? 0,
      icon: AlertCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? 0,
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Resolved",
      value: stats?.resolved ?? 0,
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <div key={card.label} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className={`rounded-full ${card.iconBg} p-3`}>
              <card.icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminBugStats;
