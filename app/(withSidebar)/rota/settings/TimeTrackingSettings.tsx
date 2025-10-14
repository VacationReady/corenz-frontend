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
  defaultApprovalWorkflow: "SEQUENTIAL" | "UNANIMOUS" | "FIRST_RESPONDER";
  requirePhotos: boolean;
  enableGPSTracking: boolean;
  allowManualEntry: boolean;
  minimumRestHours: number;
  overtimeThreshold: number;
  requireShiftConfirmation: boolean;
  managerApprovalSwaps: boolean;
  enableGeofencing: boolean;
  geofenceRadius: number;
  requireBreaks: boolean;
  minBreakDuration: number;
  payrollExportFormat: "CSV" | "EXCEL" | "JSON";
  includeBreaks: boolean;
  includeNotes: boolean;
};

const defaultSettings: TimeTrackingSettings = {
  defaultApprovalWorkflow: "SEQUENTIAL",
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

export default function TimeTrackingSettings() {
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

  const updateSetting = <K extends keyof TimeTrackingSettings>(
    key: K,
    value: TimeTrackingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Tabs defaultValue="timesheets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-md border border-border">
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

          {/* Rest of the tabs content - same as original */}
          <TabsContent value="timesheets">
            <Card className="backdrop-blur-md bg-card border-border">
              <CardHeader>
                <CardTitle>Timesheet Settings</CardTitle>
                <CardDescription>Configure how timesheets are submitted and approved</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="approvalWorkflow">Default Approval Workflow</Label>
                    <Select
                      value={settings.defaultApprovalWorkflow}
                      onValueChange={(value: string) =>
                        updateSetting("defaultApprovalWorkflow", value as any)
                      }
                    >
                      <SelectTrigger id="approvalWorkflow" className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEQUENTIAL">Sequential</SelectItem>
                        <SelectItem value="UNANIMOUS">Unanimous</SelectItem>
                        <SelectItem value="FIRST_RESPONDER">First Responder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="requirePhotos">Require Photos</Label>
                    <Switch
                      id="requirePhotos"
                      checked={settings.requirePhotos}
                      onCheckedChange={(checked) => updateSetting("requirePhotos", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableGPSTracking">Enable GPS Tracking</Label>
                    <Switch
                      id="enableGPSTracking"
                      checked={settings.enableGPSTracking}
                      onCheckedChange={(checked) => updateSetting("enableGPSTracking", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowManualEntry">Allow Manual Entry</Label>
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

          <TabsContent value="shifts">
            <Card className="backdrop-blur-md bg-card border-border">
              <CardHeader>
                <CardTitle>Shift Management Settings</CardTitle>
                <CardDescription>Configure shift rules and constraints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Minimum Rest Hours</Label>
                      <span className="text-sm font-medium">{settings.minimumRestHours} hours</span>
                    </div>
                    <Slider
                      value={[settings.minimumRestHours]}
                      onValueChange={([value]: number[]) => updateSetting("minimumRestHours", value)}
                      min={0}
                      max={24}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Overtime Threshold</Label>
                      <span className="text-sm font-medium">{settings.overtimeThreshold} hours/week</span>
                    </div>
                    <Slider
                      value={[settings.overtimeThreshold]}
                      onValueChange={([value]: number[]) => updateSetting("overtimeThreshold", value)}
                      min={20}
                      max={80}
                      step={1}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="requireShiftConfirmation">Require Shift Confirmation</Label>
                    <Switch
                      id="requireShiftConfirmation"
                      checked={settings.requireShiftConfirmation}
                      onCheckedChange={(checked) => updateSetting("requireShiftConfirmation", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="managerApprovalSwaps">Manager Approval for Swaps</Label>
                    <Switch
                      id="managerApprovalSwaps"
                      checked={settings.managerApprovalSwaps}
                      onCheckedChange={(checked) => updateSetting("managerApprovalSwaps", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clock">
            <Card className="backdrop-blur-md bg-card border-border">
              <CardHeader>
                <CardTitle>Clock In/Out Settings</CardTitle>
                <CardDescription>Configure location tracking and break requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableGeofencing">Enable Geofencing</Label>
                  <Switch
                    id="enableGeofencing"
                    checked={settings.enableGeofencing}
                    onCheckedChange={(checked) => updateSetting("enableGeofencing", checked)}
                  />
                </div>

                {settings.enableGeofencing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Geofence Radius</Label>
                      <span className="text-sm font-medium">{settings.geofenceRadius}m</span>
                    </div>
                    <Slider
                      value={[settings.geofenceRadius]}
                      onValueChange={([value]: number[]) => updateSetting("geofenceRadius", value)}
                      min={50}
                      max={5000}
                      step={50}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="requireBreaks">Require Breaks</Label>
                  <Switch
                    id="requireBreaks"
                    checked={settings.requireBreaks}
                    onCheckedChange={(checked) => updateSetting("requireBreaks", checked)}
                  />
                </div>

                {settings.requireBreaks && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Minimum Break Duration</Label>
                      <span className="text-sm font-medium">{settings.minBreakDuration} mins</span>
                    </div>
                    <Slider
                      value={[settings.minBreakDuration]}
                      onValueChange={([value]: number[]) => updateSetting("minBreakDuration", value)}
                      min={0}
                      max={120}
                      step={5}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <Card className="backdrop-blur-md bg-card border-border">
              <CardHeader>
                <CardTitle>Payroll Export Settings</CardTitle>
                <CardDescription>Configure payroll data export preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payrollExportFormat">Export Format</Label>
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
                    <Label htmlFor="includeBreaks">Include Breaks</Label>
                    <Switch
                      id="includeBreaks"
                      checked={settings.includeBreaks}
                      onCheckedChange={(checked) => updateSetting("includeBreaks", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeNotes">Include Notes</Label>
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
        <div className="flex items-center justify-end gap-3">
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
    </TooltipProvider>
  );
}
