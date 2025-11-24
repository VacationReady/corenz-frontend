"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, Save, RotateCcw, Clock, Calendar, MapPin, FileText, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

type TimeTrackingSettings = {
  // Canonical field names
  requireGpsLocation: boolean;
  photoRequirement: 'NONE' | 'CLOCK_IN' | 'CLOCK_IN_OUT';
  allowManualTimeEntry: boolean;
  // Shift settings
  minimumRestHours: number;
  overtimeThreshold: number;
  requireShiftConfirmation: boolean;
  managerApprovalSwaps: boolean;
  // Clock in/out settings
  enableGeofencing: boolean;
  geofenceRadius: number;
  requireBreaks: boolean;
  minBreakDuration: number;
  // Export settings
  payrollExportFormat: "CSV" | "EXCEL" | "JSON";
  includeBreaks: boolean;
  includeNotes: boolean;
  // Overtime configuration (NZ Employment Relations Act 2000)
  overtimeCalculationMode: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PATTERN_BASED';
  autoApplyOvertime: boolean;
  allowManualOvertimeEntry: boolean;
  blockOvertimeDuringHours: boolean;
  requireOvertimeApproval: boolean;
  dailyOvertimeThreshold: number | null;
  weeklyOvertimeThreshold: number | null;
  monthlyOvertimeThreshold: number | null;
  overtimeMultiplier: number;
  overtimeMultiplierTier2: number | null;
  overtimeThresholdTier2: number | null;
  publicHolidayMultiplier: number;
  sundayMultiplier: number | null;
  enableOvertimeBreakdown: boolean;
};

const defaultSettings: TimeTrackingSettings = {
  requireGpsLocation: false,
  photoRequirement: 'NONE',
  allowManualTimeEntry: true,
  minimumRestHours: 11,
  overtimeThreshold: 40,
  requireShiftConfirmation: false,
  managerApprovalSwaps: true,
  enableGeofencing: false,
  geofenceRadius: 100,
  requireBreaks: true,
  minBreakDuration: 30,
  payrollExportFormat: "CSV",
  includeBreaks: true,
  includeNotes: true,
  // Overtime defaults
  overtimeCalculationMode: 'PATTERN_BASED',
  autoApplyOvertime: true,
  allowManualOvertimeEntry: true,
  blockOvertimeDuringHours: true,
  requireOvertimeApproval: false,
  dailyOvertimeThreshold: 8,
  weeklyOvertimeThreshold: 40,
  monthlyOvertimeThreshold: 173.33,
  overtimeMultiplier: 1.5,
  overtimeMultiplierTier2: 2.0,
  overtimeThresholdTier2: 10,
  publicHolidayMultiplier: 1.5,
  sundayMultiplier: null,
  enableOvertimeBreakdown: true,
};

export default function TimeTrackingSettingsPage() {
  const [settings, setSettings] = useState<TimeTrackingSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<TimeTrackingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const breadcrumbs = useBreadcrumbs();

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings/time-tracking");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      
      // Remove deprecated fields to prevent conflicts
      const { 
        enableGPSTracking, 
        requirePhotos, 
        allowManualEntry, 
        ...cleanSettings 
      } = data.settings;
      
      setSettings(cleanSettings);
      setOriginalSettings(cleanSettings);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/settings/time-tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      const data = await response.json();
      setSettings(data.settings);
      setOriginalSettings(data.settings);
      setHasChanges(false);

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setHasChanges(false);
  };

  const handleResetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const updateSetting = <K extends keyof TimeTrackingSettings>(
    key: K,
    value: TimeTrackingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="container mx-auto p-6 max-w-7xl">
        {breadcrumbs && (
          <div className="mb-6">
            <Breadcrumb items={breadcrumbs.items} showHomeIcon={false} />
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Time Tracking Settings
          </h1>
          <p className="text-muted-foreground">
            Configure time tracking, shifts, and payroll export preferences
          </p>
        </div>

        <Tabs defaultValue="timesheets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="timesheets" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timesheets
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Shifts
            </TabsTrigger>
            <TabsTrigger value="overtime" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overtime
            </TabsTrigger>
            <TabsTrigger value="clock" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Clock In/Out
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Payroll Export
            </TabsTrigger>
          </TabsList>

          {/* Timesheet Settings */}
          <TabsContent value="timesheets">
            <Card className="backdrop-blur-md bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle>Timesheet Settings</CardTitle>
                <CardDescription>Configure how timesheets are submitted and approved</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">Default Approval Workflow</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          A default timesheet approval workflow (Manager Approval - Sequential) is automatically created and assigned to your company. 
                          To customize workflows, visit <a href="/settings/multi-stage-approvals" className="underline font-medium hover:text-blue-600">Settings → Multi-Stage Approvals</a> and look for the "Timesheet Approval" workflow.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label>Photo Requirement</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                             <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Enforce photo evidence during clock events. Choose 'Clock In' for start of shift only, or 'Clock In & Out' for complete verification.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <RadioGroup
                      value={settings.photoRequirement}
                      onValueChange={(value) => updateSetting('photoRequirement', value as 'NONE' | 'CLOCK_IN' | 'CLOCK_IN_OUT')}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="NONE" id="photo-none" />
                        <Label htmlFor="photo-none" className="cursor-pointer">No photo required</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CLOCK_IN" id="photo-in" />
                        <Label htmlFor="photo-in" className="cursor-pointer">Photo on clock in only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CLOCK_IN_OUT" id="photo-both" />
                        <Label htmlFor="photo-both" className="cursor-pointer">Photo on clock in and out</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="requireGpsLocation">Require GPS Location</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Mandatory GPS coordinates for every clock event. Employees cannot clock in without enabling location services.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="requireGpsLocation"
                      checked={settings.requireGpsLocation}
                      onCheckedChange={(checked) => updateSetting("requireGpsLocation", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="allowManualTimeEntry">Allow Manual Time Entry</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Permits employees to add or edit time entries manually. Disable to enforce real-time clocking only.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="allowManualTimeEntry"
                      checked={settings.allowManualTimeEntry}
                      onCheckedChange={(checked) => updateSetting("allowManualTimeEntry", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shift Settings */}
          <TabsContent value="shifts">
            <Card className="backdrop-blur-md bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle>Shift Management Settings</CardTitle>
                <CardDescription>Configure shift rules and constraints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>Minimum Rest Hours</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Legally required minimum break between shifts. Employees cannot clock in if this duration hasn't passed since their last shift.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-sm font-medium">{settings.minimumRestHours} hours</span>
                    </div>
                    <Slider
                      value={[settings.minimumRestHours]}
                      onValueChange={([value]: number[]) => updateSetting("minimumRestHours", value)}
                      min={0}
                      max={24}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>Overtime Threshold</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>The number of hours worked in a week before standard overtime rates apply (if not using Pattern Based calculation).</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-sm font-medium">{settings.overtimeThreshold} hours/week</span>
                    </div>
                    <Slider
                      value={[settings.overtimeThreshold]}
                      onValueChange={([value]: number[]) => updateSetting("overtimeThreshold", value)}
                      min={20}
                      max={80}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="requireShiftConfirmation">Require Shift Confirmation</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Employees must explicitly accept their assigned shifts in the mobile app.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="requireShiftConfirmation"
                      checked={settings.requireShiftConfirmation}
                      onCheckedChange={(checked) =>
                        updateSetting("requireShiftConfirmation", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="managerApprovalSwaps">Manager Approval for Swaps</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Shift swaps between employees require manager sign-off before becoming active.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="managerApprovalSwaps"
                      checked={settings.managerApprovalSwaps}
                      onCheckedChange={(checked) =>
                        updateSetting("managerApprovalSwaps", checked)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overtime Settings */}
          <TabsContent value="overtime">
            <Card className="backdrop-blur-md bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Overtime Configuration
                </CardTitle>
                <CardDescription>NZ Employment Relations Act 2000 compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Info Banner */}
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                    Configure how overtime is calculated and tracked in compliance with New Zealand employment law.
                    Pattern-based mode is recommended for accurate contractual hour comparison.
                  </AlertDescription>
                </Alert>

                {/* A. Calculation Mode */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label>Calculation Mode</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Determines how overtime is calculated. 'Daily' checks hours per day. 'Weekly' checks total hours per week. 'Pattern Based' compares against the employee's specific contract schedule (Recommended for shifting rosters).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <RadioGroup
                    value={settings.overtimeCalculationMode}
                    onValueChange={(value) => updateSetting('overtimeCalculationMode', value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PATTERN_BASED')}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="DAILY" id="mode-daily" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="mode-daily" className="font-semibold cursor-pointer">Daily Threshold</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Overtime when any day exceeds threshold hours
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="WEEKLY" id="mode-weekly" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="mode-weekly" className="font-semibold cursor-pointer">Weekly Threshold</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Week total exceeds threshold (pattern-aware for multi-week cycles)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="MONTHLY" id="mode-monthly" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="mode-monthly" className="font-semibold cursor-pointer">Monthly Threshold</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Month total exceeds threshold (typically 173.33 hours)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-blue-400 bg-blue-50 dark:bg-blue-950">
                      <RadioGroupItem value="PATTERN_BASED" id="mode-pattern" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="mode-pattern" className="font-semibold cursor-pointer flex items-center gap-2">
                          Pattern-Based ⭐ Recommended
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Compares actual vs contracted hours from working patterns - most accurate for NZ compliance
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* B. Thresholds */}
                <div className="space-y-4">
                  <Label>Overtime Thresholds</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {settings.overtimeCalculationMode === 'DAILY' && (
                      <div className="space-y-2">
                        <Label htmlFor="daily-threshold">Daily Hours</Label>
                        <Input
                          id="daily-threshold"
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={settings.dailyOvertimeThreshold || 8}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateSetting('dailyOvertimeThreshold', val);
                          }}
                          className="bg-white"
                        />
                      </div>
                    )}
                    {settings.overtimeCalculationMode === 'WEEKLY' && (
                      <div className="space-y-2">
                        <Label htmlFor="weekly-threshold">Weekly Hours</Label>
                        <Input
                          id="weekly-threshold"
                          type="number"
                          min="0"
                          max="168"
                          step="0.5"
                          value={settings.weeklyOvertimeThreshold || 40}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateSetting('weeklyOvertimeThreshold', val);
                          }}
                          className="bg-white"
                        />
                      </div>
                    )}
                    {settings.overtimeCalculationMode === 'MONTHLY' && (
                      <div className="space-y-2">
                        <Label htmlFor="monthly-threshold">Monthly Hours</Label>
                        <Input
                          id="monthly-threshold"
                          type="number"
                          min="0"
                          max="744"
                          step="0.5"
                          value={settings.monthlyOvertimeThreshold || 173.33}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateSetting('monthlyOvertimeThreshold', val);
                          }}
                          className="bg-white"
                        />
                      </div>
                    )}
                    {settings.overtimeCalculationMode === 'PATTERN_BASED' && (
                      <div className="col-span-3">
                        <Alert className="border-blue-200 bg-blue-50">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-sm text-blue-900">
                            Pattern-based mode automatically uses contracted hours from employee working patterns.
                            No manual threshold required.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                </div>

                {/* C. Overtime Rates */}
                <div className="space-y-4">
                  <Label>Overtime Rates</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="standard-multiplier">Standard Multiplier</Label>
                      <Input
                        id="standard-multiplier"
                        type="number"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={settings.overtimeMultiplier || 1.5}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = parseFloat(e.target.value) || 1.5;
                          updateSetting('overtimeMultiplier', val);
                        }}
                        className="bg-white"
                      />
                      <p className="text-xs text-muted-foreground">Default: 1.5× (time and a half)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="public-holiday-multiplier">Public Holiday Multiplier</Label>
                      <Input
                        id="public-holiday-multiplier"
                        type="number"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={settings.publicHolidayMultiplier || 1.5}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = parseFloat(e.target.value) || 1.5;
                          updateSetting('publicHolidayMultiplier', val);
                        }}
                        className="bg-white"
                      />
                      <p className="text-xs text-muted-foreground">NZ law minimum: 1.5×</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tier2-multiplier">Tier 2 Multiplier (Optional)</Label>
                      <Input
                        id="tier2-multiplier"
                        type="number"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={settings.overtimeMultiplierTier2 || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          updateSetting('overtimeMultiplierTier2', val);
                        }}
                        placeholder="e.g., 2.0 for double time"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tier2-threshold">Tier 2 Threshold (Hours)</Label>
                      <Input
                        id="tier2-threshold"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={settings.overtimeThresholdTier2 || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateSetting('overtimeThresholdTier2', val);
                        }}
                        placeholder="e.g., 10 hours"
                        disabled={!settings.overtimeMultiplierTier2}
                        className="bg-white"
                      />
                      <p className="text-xs text-muted-foreground">
                        OT hours before tier 2 rate applies
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sunday-multiplier">Sunday Multiplier (Optional)</Label>
                      <Input
                        id="sunday-multiplier"
                        type="number"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={settings.sundayMultiplier || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          updateSetting('sundayMultiplier', val);
                        }}
                        placeholder="e.g., 1.5 for Sunday premium"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* D. Feature Switches */}
                <div className="space-y-4">
                  <Label>Overtime Features</Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="auto-apply">Auto-Calculate Overtime</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Automatically applies overtime rates when thresholds are breached. If disabled, overtime must be manually flagged.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        id="auto-apply"
                        checked={settings.autoApplyOvertime}
                        onCheckedChange={(checked) => updateSetting('autoApplyOvertime', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="allow-manual">Allow Manual Overtime Entry</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Allows employees/managers to manually flag a time entry as 'Overtime' regardless of thresholds.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        id="allow-manual"
                        checked={settings.allowManualOvertimeEntry}
                        onCheckedChange={(checked) => updateSetting('allowManualOvertimeEntry', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="block-during-hours">Block OT During Regular Hours</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Prevents manual overtime flagging if the employee is within their standard contracted hours.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        id="block-during-hours"
                        checked={settings.blockOvertimeDuringHours}
                        onCheckedChange={(checked) => updateSetting('blockOvertimeDuringHours', checked)}
                        disabled={!settings.allowManualOvertimeEntry}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="require-approval">Require Extra Approval for OT</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Timesheets with overtime trigger a secondary approval step (e.g., by a senior manager).</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        id="require-approval"
                        checked={settings.requireOvertimeApproval}
                        onCheckedChange={(checked) => updateSetting('requireOvertimeApproval', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="enable-breakdown">Show Detailed Overtime Breakdown</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Displays a granular breakdown of how overtime hours were calculated on the timesheet view.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        id="enable-breakdown"
                        checked={settings.enableOvertimeBreakdown}
                        onCheckedChange={(checked) => updateSetting('enableOvertimeBreakdown', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clock In/Out Settings */}
          <TabsContent value="clock">
            <Card className="backdrop-blur-md bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle>Clock In/Out Settings</CardTitle>
                <CardDescription>Configure location tracking and break requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enableGeofencing">Enable Geofencing</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Restricts clock-in/out capability to defined geographic zones around work locations.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="enableGeofencing"
                      checked={settings.enableGeofencing}
                      onCheckedChange={(checked) => updateSetting("enableGeofencing", checked)}
                    />
                  </div>

                  {settings.enableGeofencing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label>Geofence Radius</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                <Info className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>The allowable distance (in meters) from the work location center where clocking is permitted.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-sm font-medium">{settings.geofenceRadius}m</span>
                      </div>
                      <Slider
                        value={[settings.geofenceRadius]}
                        onValueChange={([value]: number[]) => updateSetting("geofenceRadius", value)}
                        min={50}
                        max={5000}
                        step={50}
                        className="w-full"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="requireBreaks">Require Breaks</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Enforces break recording. Employees will be prompted to record breaks during their shift.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="requireBreaks"
                      checked={settings.requireBreaks}
                      onCheckedChange={(checked) => updateSetting("requireBreaks", checked)}
                    />
                  </div>

                  {settings.requireBreaks && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label>Minimum Break Duration</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                <Info className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>The minimum length of a break. Shorter breaks may not be counted or allowed.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-sm font-medium">{settings.minBreakDuration} mins</span>
                      </div>
                      <Slider
                        value={[settings.minBreakDuration]}
                        onValueChange={([value]: number[]) => updateSetting("minBreakDuration", value)}
                        min={0}
                        max={120}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Export Settings */}
          <TabsContent value="export">
            <Card className="backdrop-blur-md bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle>Payroll Export Settings</CardTitle>
                <CardDescription>Configure payroll data export preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="payrollExportFormat">Export Format</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>The file format generated for payroll processing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={settings.payrollExportFormat}
                      onValueChange={(value) => updateSetting("payrollExportFormat", value as any)}
                    >
                      <SelectTrigger id="payrollExportFormat" className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSV">CSV</SelectItem>
                        <SelectItem value="EXCEL">Excel (.xlsx)</SelectItem>
                        <SelectItem value="JSON">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="includeBreaks">Include Breaks</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Exports break start/end times or durations to the payroll file.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="includeBreaks"
                      checked={settings.includeBreaks}
                      onCheckedChange={(checked) => updateSetting("includeBreaks", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="includeNotes">Include Notes</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Includes employee comments/notes in the payroll export file.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="includeNotes"
                      checked={settings.includeNotes}
                      onCheckedChange={(checked) => updateSetting("includeNotes", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" onClick={handleResetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
