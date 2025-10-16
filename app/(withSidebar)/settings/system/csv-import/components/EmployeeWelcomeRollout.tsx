"use client";

import { memo, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Loader2, Filter, Mail, Target, Send } from "lucide-react";
import type {
  SelectableOption,
  WelcomeEmailSummary,
  WelcomeFilters,
} from "../types";

interface EmployeeWelcomeRolloutProps {
  showWelcomeEmailOptions: boolean;
  onToggleWelcomeEmailOptions: () => void;
  welcomeMetadataError: string | null;
  welcomeMetadataLoading: boolean;
  availableDepartments: SelectableOption[];
  availableLocations: SelectableOption[];
  welcomeFilters: WelcomeFilters;
  onFiltersChange: Dispatch<SetStateAction<WelcomeFilters>>;
  isSendingWelcomeEmails: boolean;
  onSendEmails: (mode: "all" | "gradual") => void;
  welcomeSummary: WelcomeEmailSummary | null;
}

const EmployeeWelcomeRolloutComponent = ({
  showWelcomeEmailOptions,
  onToggleWelcomeEmailOptions,
  welcomeMetadataError,
  welcomeMetadataLoading,
  availableDepartments,
  availableLocations,
  welcomeFilters,
  onFiltersChange,
  isSendingWelcomeEmails,
  onSendEmails,
  welcomeSummary,
}: EmployeeWelcomeRolloutProps) => {
  const handleDepartmentToggle = (departmentId: string, checked: boolean | string) => {
    onFiltersChange(previous => ({
      ...previous,
      departmentIds:
        checked === true
          ? Array.from(new Set([...previous.departmentIds, departmentId]))
          : previous.departmentIds.filter(id => id !== departmentId),
    }));
  };

  const handleLocationToggle = (locationId: string, checked: boolean | string) => {
    onFiltersChange(previous => ({
      ...previous,
      locationIds:
        checked === true
          ? Array.from(new Set([...previous.locationIds, locationId]))
          : previous.locationIds.filter(id => id !== locationId),
    }));
  };

  const handleNameQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    onFiltersChange(previous => ({
      ...previous,
      nameQuery: value,
    }));
  };

  const handleClearDepartments = () => {
    onFiltersChange(previous => ({
      ...previous,
      departmentIds: [],
    }));
  };

  const handleClearLocations = () => {
    onFiltersChange(previous => ({
      ...previous,
      locationIds: [],
    }));
  };

  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h4 className="font-medium">Send welcome emails</h4>
          <p className="text-sm text-muted-foreground">
            Invite employees to activate their PeopleCore accounts on demand.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={onToggleWelcomeEmailOptions}
        >
          {showWelcomeEmailOptions ? "Hide welcome email" : "Send welcome email"}
        </Button>
      </div>

      {showWelcomeEmailOptions && (
        <div className="space-y-4">
          {welcomeMetadataError && (
            <Alert variant="destructive">
              <AlertTitle>Filter data unavailable</AlertTitle>
              <AlertDescription>{welcomeMetadataError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Gradual rollout
                </CardTitle>
                <CardDescription>
                  Filter by department, location, or name to stagger invites.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {welcomeMetadataLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading filter options…
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Departments
                        </Label>
                        {welcomeFilters.departmentIds.length > 0 && (
                          <Button variant="ghost" size="sm" type="button" onClick={handleClearDepartments}>
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="mt-2 max-h-32 space-y-2 overflow-y-auto rounded-xl border bg-background p-3">
                        {availableDepartments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No departments available yet.</p>
                        ) : (
                          availableDepartments.map(department => {
                            const checkboxId = `welcome-department-${department.id}`;
                            const isChecked = welcomeFilters.departmentIds.includes(department.id);
                            return (
                              <label key={department.id} htmlFor={checkboxId} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  id={checkboxId}
                                  checked={isChecked}
                                  onCheckedChange={checked => handleDepartmentToggle(department.id, checked)}
                                />
                                <span>{department.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Locations
                        </Label>
                        {welcomeFilters.locationIds.length > 0 && (
                          <Button variant="ghost" size="sm" type="button" onClick={handleClearLocations}>
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="mt-2 max-h-32 space-y-2 overflow-y-auto rounded-xl border bg-background p-3">
                        {availableLocations.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No locations available yet.</p>
                        ) : (
                          availableLocations.map(location => {
                            const checkboxId = `welcome-location-${location.id}`;
                            const isChecked = welcomeFilters.locationIds.includes(location.id);
                            return (
                              <label key={location.id} htmlFor={checkboxId} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  id={checkboxId}
                                  checked={isChecked}
                                  onCheckedChange={checked => handleLocationToggle(location.id, checked)}
                                />
                                <span>{location.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="welcome-name-query"
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Names or emails
                      </Label>
                      <Input
                        id="welcome-name-query"
                        placeholder="Search by name or email"
                        value={welcomeFilters.nameQuery}
                        onChange={handleNameQueryChange}
                      />
                      <p className="text-xs text-muted-foreground">Separate multiple names or email fragments with commas.</p>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full"
                      disabled={isSendingWelcomeEmails || welcomeMetadataLoading}
                      onClick={() => onSendEmails("gradual")}
                    >
                      {isSendingWelcomeEmails ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Filter className="h-4 w-4" />
                      )}
                      <span>Send to matching employees</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Send to everyone
                </CardTitle>
                <CardDescription>
                  Notify every employee who hasn’t activated their account yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Perfect for launch day—this will email all inactive employees with a fresh activation link so they can set their
                  password and get started straight away.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  disabled={isSendingWelcomeEmails}
                  onClick={() => onSendEmails("all")}
                >
                  {isSendingWelcomeEmails ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span>Send to all inactive employees</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {welcomeSummary && (
            <Alert>
              <AlertTitle>Welcome email summary</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <p>
                    {welcomeSummary.sent} of {welcomeSummary.targeted} employee
                    {welcomeSummary.targeted === 1 ? "" : "s"} received an invite.
                  </p>
                  {welcomeSummary.skipped > 0 && (
                    <p>
                      {welcomeSummary.skipped} employee
                      {welcomeSummary.skipped === 1 ? " was" : "s were"} skipped because they already had active accounts or were
                      missing contact details.
                    </p>
                  )}
                  {welcomeSummary.errors.length > 0 && (
                    <div className="space-y-1">
                      <p>
                        {welcomeSummary.errors.length} email
                        {welcomeSummary.errors.length === 1 ? "" : "s"} could not be sent:
                      </p>
                      <ul className="list-disc list-inside text-xs">
                        {welcomeSummary.errors.map(error => (
                          <li key={error.employeeId}>
                            {error.email}: {error.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

export const EmployeeWelcomeRollout = memo(EmployeeWelcomeRolloutComponent);
