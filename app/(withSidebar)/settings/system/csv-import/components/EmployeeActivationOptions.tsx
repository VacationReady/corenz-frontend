"use client";

import { memo, type ChangeEvent } from "react";
import Button from "@/components/ui/Button";
import { Mail } from "lucide-react";
import type { ActivationOptions } from "../types";

interface EmployeeActivationOptionsProps {
  createdCount: number;
  showActivationOptions: boolean;
  activationOptions: ActivationOptions;
  onToggleOptions: () => void;
  onChangeOption: (option: keyof ActivationOptions, value: boolean) => void;
  onActivateEmployees: () => void;
}

const EmployeeActivationOptionsComponent = ({
  createdCount,
  showActivationOptions,
  activationOptions,
  onToggleOptions,
  onChangeOption,
  onActivateEmployees,
}: EmployeeActivationOptionsProps) => {
  if (createdCount === 0) {
    return null;
  }

  const handleCheckboxChange = (option: keyof ActivationOptions) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChangeOption(option, event.target.checked);
    };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium">Employee Activation</h4>
          <p className="text-sm text-muted-foreground">
            Activate imported employees and send welcome emails
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onToggleOptions}>
          {showActivationOptions ? "Hide Options" : "Show Options"}
        </Button>
      </div>

      {showActivationOptions && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sendEmails"
                checked={activationOptions.sendEmails}
                onChange={handleCheckboxChange("sendEmails")}
                className="rounded"
              />
              <label htmlFor="sendEmails" className="text-sm font-medium">
                Send activation emails
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="checkPermissions"
                checked={activationOptions.checkPermissions}
                onChange={handleCheckboxChange("checkPermissions")}
                className="rounded"
              />
              <label htmlFor="checkPermissions" className="text-sm font-medium">
                Assign default permissions
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="promoteManagers"
                checked={activationOptions.promoteManagers}
                onChange={handleCheckboxChange("promoteManagers")}
                className="rounded"
              />
              <label htmlFor="promoteManagers" className="text-sm font-medium">
                Auto-promote employees with direct reports to manager
              </label>
            </div>
          </div>

          <Button onClick={onActivateEmployees} className="w-full">
            <Mail className="w-4 h-4 mr-2" />
            Activate {createdCount} Employees
          </Button>
        </div>
      )}
    </div>
  );
};

export const EmployeeActivationOptions = memo(EmployeeActivationOptionsComponent);
