"use client";

import { memo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Mail, Send, Filter } from "lucide-react";
import type { ActivationStats, EmployeeActivationStatus } from "../types";

type StatusFilter = "all" | "no_email" | "email_sent_pending" | "activated";

interface ActivationStatusCardProps {
  stats: ActivationStats;
  employees: EmployeeActivationStatus[];
  showDashboard: boolean;
  onToggleDashboard: () => void;
  onOpenSendWelcomeModal: () => void;
}

const ActivationStatusCardComponent = ({
  stats,
  employees,
  showDashboard,
  onToggleDashboard,
  onOpenSendWelcomeModal,
}: ActivationStatusCardProps) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  
  const filteredEmployees = employees.filter(employee => {
    if (statusFilter === "all") return true;
    return employee.status === statusFilter;
  });

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-900">Employee Activation Status</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={onToggleDashboard}>
            {showDashboard ? "Hide Details" : "View Details"}
          </Button>
        </div>
        <CardDescription>
          {stats.activated} activated • {stats.pendingActivation} pending • {stats.emailNotSent} not sent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Employees</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{stats.emailSent}</div>
            <div className="text-xs text-muted-foreground">Emails Sent</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{stats.pendingActivation}</div>
            <div className="text-xs text-muted-foreground">Pending Activation</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{stats.activated}</div>
            <div className="text-xs text-muted-foreground">Activated</div>
          </div>
        </div>

        {showDashboard && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Employee Status</h4>
              <Button variant="primary" size="sm" onClick={onOpenSendWelcomeModal}>
                <Send className="w-4 h-4 mr-2" />
                Send Welcome Emails
              </Button>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Filter className="w-3 h-3" />
                <span>Filter:</span>
              </div>
              <Button
                variant={statusFilter === "all" ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="h-7 text-xs"
              >
                All ({employees.length})
              </Button>
              <Button
                variant={statusFilter === "no_email" ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("no_email")}
                className="h-7 text-xs"
              >
                No Email ({employees.filter(e => e.status === "no_email").length})
              </Button>
              <Button
                variant={statusFilter === "email_sent_pending" ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("email_sent_pending")}
                className="h-7 text-xs"
              >
                Email Sent ({employees.filter(e => e.status === "email_sent_pending").length})
              </Button>
              <Button
                variant={statusFilter === "activated" ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("activated")}
                className="h-7 text-xs"
              >
                Activated ({employees.filter(e => e.status === "activated").length})
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No employees found with the selected filter.
                </div>
              ) : (
                filteredEmployees.map(employee => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {employee.email} • {employee.department || "No department"} • {employee.jobRole || "No role"}
                    </div>
                  </div>
                  <Badge
                    variant="default"
                    className={
                      employee.status === "no_email"
                        ? "bg-gray-100 text-gray-800 border-gray-300"
                        : employee.status === "email_sent_pending"
                        ? "bg-orange-100 text-orange-800 border-orange-300"
                        : "bg-green-100 text-green-800 border-green-300"
                    }
                  >
                    {employee.status === "no_email"
                      ? "No Email"
                      : employee.status === "email_sent_pending"
                      ? "Email Sent"
                      : "Activated"}
                  </Badge>
                </div>
              ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ActivationStatusCard = memo(ActivationStatusCardComponent);
