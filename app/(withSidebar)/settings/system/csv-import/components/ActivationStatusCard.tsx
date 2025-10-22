"use client";

import { memo, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Mail, Send } from "lucide-react";
import type { ActivationStats, EmployeeActivationStatus } from "../types";

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
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "not_sent">("all");

  const pendingEmployees = useMemo(
    () => employees.filter(employee => employee.status !== "activated"),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    return pendingEmployees.filter(employee => {
      if (statusFilter === "all") return true;
      if (statusFilter === "sent") {
        return employee.status === "email_sent_pending";
      }
      return employee.status === "no_email";
    });
  }, [pendingEmployees, statusFilter]);

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-900">Pending Employee Activations</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={onToggleDashboard}>
            {showDashboard ? "Hide Details" : "View Details"}
          </Button>
        </div>
        <CardDescription>
          {stats.emailNotSent} employee{stats.emailNotSent === 1 ? "" : "s"} haven't received welcome emails yet
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium text-sm text-amber-900">Employee Status</h4>
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white p-1">
                  {["all", "not_sent", "sent"].map(option => {
                    const isActive =
                      (option === "all" && statusFilter === "all") ||
                      (option === "not_sent" && statusFilter === "not_sent") ||
                      (option === "sent" && statusFilter === "sent");

                    const label =
                      option === "all"
                        ? "All"
                        : option === "not_sent"
                        ? "Email Not Sent"
                        : "Email Sent";

                    return (
                      <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant={isActive ? "primary" : "ghost"}
                        className={
                          isActive
                            ? "h-8 px-3 text-xs"
                            : "h-8 px-3 text-xs text-amber-700 hover:text-amber-900"
                        }
                        onClick={() =>
                          setStatusFilter(option === "sent" ? "sent" : option === "not_sent" ? "not_sent" : "all")
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={onOpenSendWelcomeModal}>
                <Send className="w-4 h-4 mr-2" />
                Send Welcome Emails
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredEmployees.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-6 text-center text-sm text-amber-800">
                  {statusFilter === "sent"
                    ? "No pending employees have been sent a welcome email yet."
                    : statusFilter === "not_sent"
                    ? "Great news — everyone in this list has already been contacted!"
                    : "No pending employees to show."}
                </div>
              ) : (
                filteredEmployees.map(employee => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 text-sm shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{employee.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {employee.email} • {employee.department || "No department"} • {employee.jobRole || "No role"}
                      </div>
                    </div>
                    <Badge
                      className={
                        employee.status === "no_email"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : employee.status === "email_sent_pending"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }
                    >
                      {employee.status === "no_email"
                        ? "Email Not Sent"
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
