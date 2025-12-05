'use client';

import { useMemo, useState, useCallback } from 'react';
import { format, addHours } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';

interface RequirementDraft {
  id: string;
  startTime: string;
  endTime: string;
  role: string;
  requiredSkills: string;
  breakDuration: number;
  minStaffing: number;
}

export interface AutoScheduleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRange: { start: Date; end: Date };
  departmentId?: string;
  locationId?: string;
  onCompleted?: (result: AutoScheduleResult) => void;
}

export interface AutoScheduleAssignment {
  shiftRequirement: {
    startTime: string;
    endTime: string;
    role?: string;
    requiredSkills: string[];
    breakDuration: number;
    minStaffing: number;
  };
  employeeId: string;
  employeeName: string;
  cost: number;
  confidence: number;
  score: number;
}

export interface AutoScheduleResult {
  assignments: AutoScheduleAssignment[];
  unassignedShifts: AutoScheduleAssignment['shiftRequirement'][];
  conflicts: string[];
  totalCost: number;
  utilizationByEmployee: Array<{ employeeId: string; hours: number; employee?: { id: string; name: string } | null }>;
}

const createDefaultRequirement = (reference: Date): RequirementDraft => {
  const start = format(reference, "yyyy-MM-dd'T'09:00");
  const end = format(addHours(reference, 8), "yyyy-MM-dd'T'17:00");

  return {
    id: `requirement-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
    startTime: start,
    endTime: end,
    role: '',
    requiredSkills: '',
    breakDuration: 30,
    minStaffing: 1,
  };
};

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDateValue = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function AutoScheduleWizard({
  open,
  onOpenChange,
  defaultRange,
  departmentId,
  locationId,
  onCompleted,
}: AutoScheduleWizardProps) {
  const [requirements, setRequirements] = useState<RequirementDraft[]>([
    createDefaultRequirement(defaultRange.start),
  ]);
  const [laborBudget, setLaborBudget] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoScheduleResult | null>(null);

  const hasMultipleRequirements = requirements.length > 1;

  const resetOutcome = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  const handleAddRequirement = () => {
    const referenceDate = requirements.length
      ? new Date(requirements[requirements.length - 1].startTime)
      : defaultRange.start;
    setRequirements(prev => [...prev, createDefaultRequirement(referenceDate)]);
    resetOutcome();
  };

  const handleRequirementChange = <K extends keyof RequirementDraft>(
    id: string,
    key: K,
    value: RequirementDraft[K]
  ) => {
    setRequirements(prev =>
      prev.map(requirement =>
        requirement.id === id
          ? { ...requirement, [key]: value }
          : requirement
      )
    );
    resetOutcome();
  };

  const handleRemoveRequirement = (id: string) => {
    if (requirements.length === 1) return;
    setRequirements(prev => prev.filter(requirement => requirement.id !== id));
    resetOutcome();
  };

  const handleSubmit = async () => {
    const issues: string[] = [];

    const trimmedBudget = laborBudget.trim();
    if (trimmedBudget) {
      const parsedBudget = Number(trimmedBudget);
      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        issues.push('Labor budget must be a positive number.');
      }
    }

    requirements.forEach((requirement, index) => {
      const label = requirements.length > 1 ? `Requirement ${index + 1}` : 'Requirement';
      const start = parseDateValue(requirement.startTime);
      const end = parseDateValue(requirement.endTime);

      if (!start) {
        issues.push(`${label} is missing a valid start time.`);
      }
      if (!end) {
        issues.push(`${label} is missing a valid end time.`);
      }

      if (start && end) {
        const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

        if (totalMinutes <= 0) {
          issues.push(`${label} must end after it starts.`);
        } else if (requirement.breakDuration >= totalMinutes) {
          issues.push(`${label} break minutes must be less than the total shift duration.`);
        }
      }

      if (!Number.isFinite(requirement.breakDuration) || requirement.breakDuration < 0) {
        issues.push(`${label} break minutes must be zero or greater.`);
      }

      if (!Number.isFinite(requirement.minStaffing) || requirement.minStaffing < 1) {
        issues.push(`${label} must have at least one staff member.`);
      }
    });

    if (issues.length > 0) {
      setError(issues.join(' '));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        departmentId: departmentId || undefined,
        locationId: locationId || undefined,
        laborBudget: trimmedBudget ? Number(trimmedBudget) : undefined,
        requirements: requirements.map(requirement => ({
          startTime: new Date(requirement.startTime).toISOString(),
          endTime: new Date(requirement.endTime).toISOString(),
          role: requirement.role || undefined,
          requiredSkills: requirement.requiredSkills
            .split(',')
            .map(skill => skill.trim())
            .filter(Boolean),
          breakDuration: requirement.breakDuration,
          minStaffing: requirement.minStaffing,
        })),
      };

      const response = await fetch('/api/shifts/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Auto-scheduling failed');
      }

      const data = await response.json();
      const scheduleResult: AutoScheduleResult = {
        assignments: data.result.assignments,
        unassignedShifts: data.result.unassignedShifts,
        conflicts: data.result.conflicts,
        totalCost: data.result.totalCost,
        utilizationByEmployee: data.result.utilizationByEmployee ?? [],
      };

      setResult(scheduleResult);
      onCompleted?.(scheduleResult);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Auto-scheduling failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const utilizationSummary = useMemo(() => {
    if (!result?.utilizationByEmployee?.length) return [];
    return result.utilizationByEmployee
      .map(entry => ({
        employeeId: entry.employeeId,
        hours: entry.hours,
        name: entry.employee?.name ?? 'Unassigned',
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [result]);

  const resetState = () => {
    setRequirements([createDefaultRequirement(defaultRange.start)]);
    setLaborBudget('');
    setIsSubmitting(false);
    setError(null);
    setResult(null);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetState();
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-950/95 text-slate-100 border border-slate-700 max-w-3xl">
        <DialogHeader>
          <DialogTitle>Auto-schedule coverage</DialogTitle>
          <DialogDescription>
            Define the coverage you need and let Corenz assign the best employees while respecting compliance constraints.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Coverage window</h3>
                <p className="text-xs text-slate-400">
                  {format(defaultRange.start, 'PPP')} – {format(defaultRange.end, 'PPP')}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <Label htmlFor="laborBudget" className="text-xs uppercase tracking-wide text-slate-400">
                  Labor budget (£)
                </Label>
                <Input
                  id="laborBudget"
                  value={laborBudget}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setLaborBudget(event.target.value);
                    resetOutcome();
                  }}
                  placeholder="Optional"
                  inputMode="decimal"
                  className="bg-slate-950 border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {requirements.map((requirement, index) => (
              <div
                key={requirement.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-inner"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-200">
                    Requirement {index + 1}
                  </h4>
                  {hasMultipleRequirements && (
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => handleRemoveRequirement(requirement.id)}
                      className="text-red-300 hover:text-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`start-${requirement.id}`}>Shift starts</Label>
                    <Input
                      id={`start-${requirement.id}`}
                      type="datetime-local"
                      value={requirement.startTime}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleRequirementChange(requirement.id, 'startTime', event.target.value)
                      }
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`end-${requirement.id}`}>Shift ends</Label>
                    <Input
                      id={`end-${requirement.id}`}
                      type="datetime-local"
                      value={requirement.endTime}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleRequirementChange(requirement.id, 'endTime', event.target.value)
                      }
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor={`staffing-${requirement.id}`}>Minimum staffing</Label>
                    <Input
                      id={`staffing-${requirement.id}`}
                      type="number"
                      min={1}
                      value={requirement.minStaffing}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleRequirementChange(
                          requirement.id,
                          'minStaffing',
                          Math.max(1, Math.round(parseNumber(event.target.value, requirement.minStaffing)))
                        )
                      }
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`break-${requirement.id}`}>Break minutes</Label>
                    <Input
                      id={`break-${requirement.id}`}
                      type="number"
                      min={0}
                      step={5}
                      value={requirement.breakDuration}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleRequirementChange(
                          requirement.id,
                          'breakDuration',
                          Math.max(0, Math.round(parseNumber(event.target.value, requirement.breakDuration)))
                        )
                      }
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`role-${requirement.id}`}>Role</Label>
                    <Input
                      id={`role-${requirement.id}`}
                      value={requirement.role}
                      placeholder="Optional"
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleRequirementChange(requirement.id, 'role', event.target.value)
                      }
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor={`skills-${requirement.id}`}>Required skills</Label>
                  <Textarea
                    id={`skills-${requirement.id}`}
                    placeholder="comma separated e.g. forklift, first aid"
                    value={requirement.requiredSkills}
                    onChange={event =>
                      handleRequirementChange(requirement.id, 'requiredSkills', event.target.value)
                    }
                    className="bg-slate-950 border-slate-700"
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              onClick={handleAddRequirement}
              className="w-full border border-dashed border-slate-700 text-slate-200 hover:bg-slate-900"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another requirement
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-4 rounded-xl border border-emerald-700/50 bg-emerald-900/20 p-4">
              <div>
                <h4 className="text-sm font-semibold text-emerald-200">Schedule summary</h4>
                <p className="text-xs text-emerald-100/80">
                  {result.assignments.length} assignments · £{result.totalCost.toFixed(2)} projected spend
                </p>
              </div>

              {result.conflicts.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100 space-y-1">
                  <p className="font-medium text-amber-200">Warnings</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {result.conflicts.map(conflict => (
                      <li key={conflict}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assignments</h5>
                  <ul className="mt-2 space-y-2 text-sm text-slate-200 max-h-48 overflow-y-auto pr-2">
                    {result.assignments.map(assignment => (
                      <li
                        key={`${assignment.employeeId}-${assignment.shiftRequirement.startTime}`}
                        className="rounded-md border border-slate-700/60 bg-slate-900/80 p-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{assignment.employeeName}</span>
                          <span className="text-xs text-slate-400">
                            {format(new Date(assignment.shiftRequirement.startTime), 'MMM d, h:mma')}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                          <span>Confidence {Math.round(assignment.confidence)}%</span>
                          <span>£{assignment.cost.toFixed(2)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Utilisation</h5>
                  <ul className="mt-2 space-y-2 text-sm text-slate-200">
                    {utilizationSummary.map(entry => (
                      <li key={entry.employeeId} className="flex items-center justify-between">
                        <span>{entry.name}</span>
                        <span className="text-xs text-slate-400">{entry.hours.toFixed(1)} hrs</span>
                      </li>
                    ))}
                    {utilizationSummary.length === 0 && (
                      <li className="text-xs text-slate-500">No employee hours impacted yet.</li>
                    )}
                  </ul>
                </div>
              </div>

              {result.unassignedShifts.length > 0 && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-100 space-y-1">
                  <p className="font-medium text-red-200">Unassigned requirements</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {result.unassignedShifts.map(unassigned => (
                      <li key={`${unassigned.startTime}-${unassigned.role ?? 'role'}`}>
                        {format(new Date(unassigned.startTime), 'MMM d, h:mma')} · needs {unassigned.minStaffing} staff
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="text-slate-300 hover:text-white"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Scheduling"
            >
              Generate schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
