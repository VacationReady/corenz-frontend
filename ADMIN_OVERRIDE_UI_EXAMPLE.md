# Admin Override Confirmation Dialog - UI Example

## Component Structure

```typescript
// components/leave/LeaveRuleOverrideDialog.tsx
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface LeaveValidationWarning {
  code: string;
  message: string;
  severity: "warning" | "error";
  ruleType: string;
}

interface LeaveRuleOverrideDialogProps {
  open: boolean;
  warnings: LeaveValidationWarning[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function LeaveRuleOverrideDialog({
  open,
  warnings,
  onConfirm,
  onCancel,
}: LeaveRuleOverrideDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Override Leave Rules?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This leave booking violates the following rules. As an admin/manager, you can override these rules.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    {getRuleTypeLabel(warning.ruleType)}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {warning.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="default" onClick={onConfirm}>
            Continue Anyway
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function getRuleTypeLabel(ruleType: string): string {
  const labels: Record<string, string> = {
    notice_period: "Notice Period Violation",
    max_booking_length: "Maximum Booking Length Exceeded",
    blackout_day: "Blackout Day Conflict",
    entitlement: "Insufficient Entitlement",
    max_days_per_period: "Maximum Days Per Period Exceeded",
  };
  return labels[ruleType] || "Rule Violation";
}
```

## Usage in Leave Booking Form

```typescript
// Example: In your leave booking form component
import { useState } from "react";
import { LeaveRuleOverrideDialog } from "@/components/leave/LeaveRuleOverrideDialog";

export function LeaveBookingForm() {
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [warnings, setWarnings] = useState<LeaveValidationWarning[]>([]);
  const [pendingBooking, setPendingBooking] = useState<any>(null);

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          bypassWarnings: false, // First attempt without bypass
        }),
      });

      const data = await response.json();

      if (data.requiresConfirmation) {
        // Show override dialog
        setWarnings(data.warnings);
        setPendingBooking(formData);
        setShowOverrideDialog(true);
      } else if (data.success) {
        // Success!
        toast.success("Leave request created successfully");
        onSuccess();
      } else {
        // Hard error (for regular employees)
        toast.error(data.error || "Failed to create leave request");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleConfirmOverride = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/leave-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingBooking,
          bypassWarnings: true, // Second attempt with bypass
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Leave request created successfully (rules overridden)");
        setShowOverrideDialog(false);
        onSuccess();
      } else {
        toast.error(data.error || "Failed to create leave request");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <>
      {/* Your leave booking form */}
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
      </form>

      {/* Override confirmation dialog */}
      <LeaveRuleOverrideDialog
        open={showOverrideDialog}
        warnings={warnings}
        onConfirm={handleConfirmOverride}
        onCancel={() => setShowOverrideDialog(false)}
      />
    </>
  );
}
```

## Visual Example

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  Override Leave Rules?                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  This leave booking violates the following rules.       │
│  As an admin/manager, you can override these rules.     │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ ⚠️  Notice Period Violation                     │    │
│  │                                                  │    │
│  │  This leave requires at least 7 days notice.    │    │
│  │  Only 0 days notice given.                      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ ⚠️  Maximum Booking Length Exceeded             │    │
│  │                                                  │    │
│  │  You can only book up to 14 days at a time      │    │
│  │  for this leave type. Requested 20 days.        │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│                                                          │
│                    [Cancel]  [Continue Anyway]          │
└─────────────────────────────────────────────────────────┘
```

## Toast Notifications

```typescript
// Success with override
toast.success("Leave request created (rules overridden)", {
  description: "Notice period requirement was bypassed",
});

// Success without override
toast.success("Leave request created successfully");

// Error for regular employee
toast.error("Cannot create leave request", {
  description: "This leave requires at least 7 days notice",
});
```

## Styling Notes

- Use amber/yellow colors for warnings (not red, as these are overridable)
- Clear visual hierarchy: title → description → warnings → actions
- Each warning in its own card/box for clarity
- Icon consistency: AlertTriangle for all warnings
- Button hierarchy: "Cancel" as secondary, "Continue Anyway" as primary

## Accessibility

- Dialog should trap focus
- ESC key should close dialog (same as Cancel)
- Clear ARIA labels
- Keyboard navigation support
- Screen reader friendly warning messages

## Mobile Considerations

- Dialog should be responsive
- Stack warnings vertically on small screens
- Buttons should be full-width on mobile
- Touch-friendly button sizes (min 44px height)
