"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface JourneyIdDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId: string;
  templateId: string;
  suggestions: string[];
  onValidate: (candidate: string) => Promise<{ status: "ok" | "error"; message: string }>;
  onSave: (candidate: string) => Promise<string>;
}

export function JourneyIdDrawer({
  open,
  onOpenChange,
  currentId,
  templateId,
  suggestions,
  onValidate,
  onSave,
}: JourneyIdDrawerProps) {
  const [value, setValue] = useState(currentId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setValue(currentId);
      setFeedback(null);
      setValidationState("idle");
    }
  }, [open, currentId]);

  const handleValidate = async () => {
    setValidationState("loading");
    try {
      const result = await onValidate(value);
      setFeedback(result.message);
      setValidationState(result.status === "ok" ? "success" : "error");
    } catch (error) {
      console.error(error);
      setFeedback("Validation failed. Try again.");
      setValidationState("error");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const savedId = await onSave(value);
      setFeedback(`Journey ID updated to ${savedId}.`);
      setValidationState("success");
      setValue(savedId);
    } catch (error: any) {
      setFeedback(error?.message || "Unable to update Journey ID.");
      setValidationState("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px]">
        <SheetHeader className="space-y-2">
          <SheetTitle>Journey ID management</SheetTitle>
          <SheetDescription>
            Journey IDs must be unique per tenant and retained for 7 years (Tax Administration Act). Match suffix to NZ region
            where policies differ.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="journey-id" className="text-sm font-medium text-foreground">
              Current Journey ID
            </label>
            <Input
              id="journey-id"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={30}
              className="mt-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Must be alphanumeric with hyphen. Reserved prefixes: IRD-, ACC-, OSHA-.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">Generated suggestions</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {suggestions.length
                ? suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-primary transition hover:bg-primary/10"
                      onClick={() => setValue(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))
                : (
                    <span className="text-muted-foreground">No suggestions available.</span>
                  )}
            </div>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-xs text-primary">
            Journey IDs tied to IRD filings must be retained for 7 years. Bulk updates clone IDs across 50+ templates and log mappings in the audit trail.
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary" />
            <span>Match suffix to NZ region (e.g., AKL, WLG) where regional policy differs.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleValidate} disabled={validationState === "loading"}>
              {validationState === "loading" ? "Validating..." : "Validate ID"}
            </Button>
            <Button variant="secondary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
          {feedback ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-xs ${
                validationState === "success"
                  ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                  : "border-amber-500 bg-amber-100 text-amber-900"
              }`}
            >
              {feedback}
            </div>
          ) : null}
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Template</p>
            <code className="block rounded-lg bg-muted px-3 py-2 text-[11px]">{templateId}</code>
            <p>Validation endpoint: /api/journeys/ids</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="bg-primary/5 text-primary">
              Search across 500+ IDs
            </Badge>
            <Badge variant="outline" className="bg-primary/5 text-primary">
              Debounced suggestions
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
