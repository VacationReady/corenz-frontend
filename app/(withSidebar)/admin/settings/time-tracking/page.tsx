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
import { Loader2, Info, Save, RotateCcw, Clock, Calendar, MapPin, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type TimeTrackingSettings = {
  // Timesheet settings
  requirePhotos: boolean;
  enableGPSTracking: boolean;
  allowManualEntry: boolean;
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
};

const defaultSettings: TimeTrackingSettings = {
  requirePhotos: false,
  enableGPSTracking: false,
  allowManualEntry: true,
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
};

export default function TimeTrackingSettingsPage() {
  const [settings, setSettings] = useState<TimeTrackingSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<TimeTrackingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

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
      setSettings(data.settings);
      setOriginalSettings(data.settings);
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
    <TooltipProvider>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Time Tracking Settings
          </h1>
          <p className="text-muted-foreground">
            Configure time tracking, shifts, and payroll export preferences
          </p>
        </div>

        <Tabs defaultValue="timesheets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timesheets" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timesheets
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Shifts
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="requirePhotos">Require Photos</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Require employees to attach photos when clocking in/out</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="requirePhotos"
                      checked={settings.requirePhotos}
                      onCheckedChange={(checked) => updateSetting("requirePhotos", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enableGPSTracking">Enable GPS Tracking</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Track employee location when clocking in/out</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="enableGPSTracking"
                      checked={settings.enableGPSTracking}
                      onCheckedChange={(checked) => updateSetting("enableGPSTracking", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="allowManualEntry">Allow Manual Entry</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Allow employees to manually enter time if they forget to clock in/out</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="allowManualEntry"
                      checked={settings.allowManualEntry}
                      onCheckedChange={(checked) => updateSetting("allowManualEntry", checked)}
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
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Minimum hours required between shifts</p>
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
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Hours per week before overtime applies</p>
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
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Require employees to confirm assigned shifts</p>
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
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Require manager approval for shift swap requests</p>
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
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Restrict clocking in/out to specific locations</p>
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
                            <TooltipTrigger>
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Default radius for location geofences</p>
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
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Require employees to take breaks during shifts</p>
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
                            <TooltipTrigger>
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Minimum required break time in minutes</p>
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
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Default format for payroll exports</p>
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
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Include break duration in payroll exports</p>
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
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Include timesheet notes in payroll exports</p>
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
