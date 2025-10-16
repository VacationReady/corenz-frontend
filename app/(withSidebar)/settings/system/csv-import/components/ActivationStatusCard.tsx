"use client";

import { memo } from "react";
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
  const pendingEmployees = employees.filter(employee => employee.status !== "activated");

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
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Employee Status</h4>
              <Button variant="primary" size="sm" onClick={onOpenSendWelcomeModal}>
                <Send className="w-4 h-4 mr-2" />
                Send Welcome Emails
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {pendingEmployees.map(employee => (
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
                    variant={
                      employee.status === "no_email"
                        ? "destructive"
                        : employee.status === "email_sent_pending"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {employee.status === "no_email"
                      ? "No Email"
                      : employee.status === "email_sent_pending"
                      ? "Email Sent"
                      : "Activated"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ActivationStatusCard = memo(ActivationStatusCardComponent);
