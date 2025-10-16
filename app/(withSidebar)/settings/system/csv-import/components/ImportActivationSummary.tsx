"use client";

import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import type { ImportResult } from "../types";

interface ImportActivationSummaryProps {
  activationResult: NonNullable<ImportResult["activation"]>;
}

const ImportActivationSummaryComponent = ({
  activationResult,
}: ImportActivationSummaryProps) => {
  return (
    <div className="border-t pt-4 space-y-4">
      <div>
        <h4 className="font-medium text-green-600 mb-2">Activation Results:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {activationResult.activated}
            </div>
            <div className="text-xs text-muted-foreground">Activated</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {activationResult.emailsSent}
            </div>
            <div className="text-xs text-muted-foreground">Emails Sent</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">
              {activationResult.managersPromoted}
            </div>
            <div className="text-xs text-muted-foreground">Managers Promoted</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">
              {activationResult.permissionsChecked}
            </div>
            <div className="text-xs text-muted-foreground">Permissions Checked</div>
          </div>
        </div>
      </div>

      {activationResult.errors.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-3 space-y-2">
          <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Activation Issues ({activationResult.errors.length})
          </h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {activationResult.errors.map(issue => (
              <li key={issue.employeeId}>
                {issue.employeeId}: {issue.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const ImportActivationSummary = memo(ImportActivationSummaryComponent);
