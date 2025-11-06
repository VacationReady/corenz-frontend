"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, Calendar, Coffee, FileText, Edit3, Info } from "lucide-react";
import { format } from "date-fns";

type TimesheetEntry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hours: number;
  notes?: string | null;
  isOvertime: boolean;
  entryType: "CLOCK" | "MANUAL" | "ADJUSTED";
};

interface EditTimesheetEntryDialogProps {
  entry: TimesheetEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditTimesheetEntryDialog({
  entry,
  open,
  onOpenChange,
  onSuccess,
}: EditTimesheetEntryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    breakMinutes: 0,
    notes: "",
    changeReason: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (entry && open) {
      // Parse the date and time values
      const entryDate = new Date(entry.date);
      const startTime = new Date(entry.startTime);
      const endTime = new Date(entry.endTime);

      setFormData({
        date: format(entryDate, "yyyy-MM-dd"),
        startTime: format(startTime, "HH:mm"),
        endTime: format(endTime, "HH:mm"),
        breakMinutes: entry.breakMinutes,
        notes: entry.notes || "",
        changeReason: "",
      });
    }
  }, [entry, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.changeReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this change",
        variant: "destructive",
      });
      return;
    }

    if (!entry) return;

    try {
      setLoading(true);

      // Construct full datetime strings
      const dateStr = formData.date;
      const startDateTime = new Date(`${dateStr}T${formData.startTime}`).toISOString();
      const endDateTime = new Date(`${dateStr}T${formData.endTime}`).toISOString();

      const response = await fetch(`/api/timesheets/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(dateStr).toISOString(),
          startTime: startDateTime,
          endTime: endDateTime,
          breakMinutes: formData.breakMinutes,
          notes: formData.notes || null,
          changeReason: formData.changeReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update entry");
      }

      const result = await response.json();

      toast({
        title: "Entry Updated",
        description: `Successfully updated ${result.changesCount} field(s)`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEntryTypeBadge = (type: string) => {
    switch (type) {
      case "CLOCK":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Clock className="mr-1 h-3 w-3" />
            Clock Entry
          </Badge>
        );
      case "MANUAL":
        return (
          <Badge variant="secondary">
            <Edit3 className="mr-1 h-3 w-3" />
            Manual Entry
          </Badge>
        );
      case "ADJUSTED":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            <Info className="mr-1 h-3 w-3" />
            Manager Adjusted
          </Badge>
        );
      default:
        return null;
    }
  };

  const calculateHours = () => {
    if (!formData.date || !formData.startTime || !formData.endTime) return 0;
    
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    hours -= formData.breakMinutes / 60;
    
    return Math.max(0, hours).toFixed(2);
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Edit Timesheet Entry
            {getEntryTypeBadge(entry.entryType)}
          </DialogTitle>
          <DialogDescription>
            Make changes to this time entry. All changes are tracked and audited.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Original Entry Info */}
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="mb-3 text-sm font-medium">Original Entry</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>
                <span className="ml-2 font-medium">{format(new Date(entry.date), "MMM d, yyyy")}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Hours:</span>
                <span className="ml-2 font-medium">{parseFloat(entry.hours.toString()).toFixed(2)}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time:</span>
                <span className="ml-2 font-medium">
                  {format(new Date(entry.startTime), "h:mm a")} - {format(new Date(entry.endTime), "h:mm a")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Break:</span>
                <span className="ml-2 font-medium">{entry.breakMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="breakMinutes" className="flex items-center gap-2">
                  <Coffee className="h-4 w-4" />
                  Break Duration (minutes)
                </Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  min="0"
                  value={formData.breakMinutes}
                  onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Calculated Hours
                </Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 font-semibold">
                  {calculateHours()}h
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes..."
                rows={2}
              />
            </div>

            {/* Change Reason - Required */}
            <div className="space-y-2 rounded-lg border-2 border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
              <Label htmlFor="changeReason" className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
                <Info className="h-4 w-4" />
                Reason for Change *
              </Label>
              <Textarea
                id="changeReason"
                value={formData.changeReason}
                onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
                placeholder="Required: Explain why this entry is being modified (e.g., 'Employee forgot to clock out', 'Incorrect break time')"
                rows={3}
                required
                className="border-orange-300 focus:border-orange-500 dark:border-orange-800"
              />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                This reason will be recorded in the audit trail for finance and compliance purposes.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
