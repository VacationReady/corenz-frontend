"use client";

import React from "react";
import { Check, X, Info, HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ActionKey = "read" | "edit" | "delete";

/**
 * Extended screen metadata interface for UI display
 * Includes displayLabel and description for clarity
 */
export interface ScreenWithMetadata {
  key: string;
  label: string;
  displayLabel?: string;
  description?: string;
  category?: 'system' | 'employee-profile';
  affectsOthers?: boolean;
}

export function PermissionEditor({
  screens,
  actions,
  value,
  onChange,
}: {
  screens: ScreenWithMetadata[];
  actions: { key: ActionKey; label: string }[];
  value: Record<string, ActionKey[]>;
  onChange: (next: Record<string, ActionKey[]>) => void;
}) {
  const toggle = (screenKey: string, action: ActionKey, checked: boolean) => {
    const current = value[screenKey] || [];
    let next = current;
    if (checked) {
      next = Array.from(new Set([...current, action]));
      // ensure read is present if edit/delete set
      if ((action === "edit" || action === "delete") && !next.includes("read")) {
        next = ["read", ...next];
      }
    } else {
      next = current.filter((a) => a !== action);
      // if read removed, also remove edit/delete
      if (action === "read") {
        next = [];
      }
    }

    const copy = { ...value };
    if (next.length === 0) {
      delete copy[screenKey];
    } else {
      copy[screenKey] = next;
    }
    onChange(copy);
  };

  // Group screens by category
  const validScreens = screens.filter(s => s && s.key);
  const systemScreens = validScreens.filter(s => s.category !== 'employee-profile');
  const employeeProfileScreens = validScreens.filter(s => s.category === 'employee-profile');

  // Render a permission table for a group of screens
  const renderPermissionTable = (screenGroup: ScreenWithMetadata[]) => (
    <div className="overflow-x-auto border rounded">
      <table className="min-w-full divide-y">
        <thead>
          <tr>
            <th className="text-left p-2">Screen</th>
            {actions.filter(a => a && a.key).map((a) => (
              <th key={a.key} className="text-center p-2">{a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {screenGroup.map((s) => {
            const selected = new Set(value[s.key] || []);
            // Use displayLabel if available, otherwise fall back to label
            const screenName = s.displayLabel || s.label;
            return (
              <tr key={s.key} className="odd:bg-gray-50">
                <td className="p-2">
                  {s.description ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dotted border-gray-400">
                            {screenName}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>{s.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    screenName
                  )}
                </td>
                {actions.filter(a => a && a.key).map((a) => (
                  <td key={a.key} className="text-center p-2">
                    <button
                      type="button"
                      aria-pressed={selected.has(a.key)}
                      onClick={() => toggle(s.key, a.key, !selected.has(a.key))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border hover:bg-gray-50"
                    >
                      {selected.has(a.key) ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // If screens have category metadata, show grouped view with sections
  const hasCategories = validScreens.some(s => s.category);

  if (hasCategories && (systemScreens.length > 0 || employeeProfileScreens.length > 0)) {
    return (
      <div className="space-y-6">
        {/* Explanatory Banner */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Note:</strong> This employee will always have access to their own profile, 
            documents, leave, and other personal screens. The permissions below control 
            additional access to <strong>other employees&apos;</strong> information.
          </AlertDescription>
        </Alert>

        {/* System-wide Permissions */}
        {systemScreens.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              System-wide Permissions
            </h3>
            {renderPermissionTable(systemScreens)}
          </div>
        )}

        {/* Employee Profile Permissions */}
        {employeeProfileScreens.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              Access to Other Employees&apos; Profiles
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      These permissions allow viewing and editing specific sections 
                      of other employees&apos; profiles in the organisation.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            {renderPermissionTable(employeeProfileScreens)}
          </div>
        )}
      </div>
    );
  }

  // Fallback: render single table without grouping (backward compatibility)
  return (
    <div className="space-y-4">
      {/* Explanatory Banner */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Note:</strong> This employee will always have access to their own profile, 
          documents, leave, and other personal screens. The permissions below control 
          additional access to <strong>other employees&apos;</strong> information.
        </AlertDescription>
      </Alert>

      {renderPermissionTable(validScreens)}
    </div>
  );
}


