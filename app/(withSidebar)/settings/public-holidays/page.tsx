"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Template = "NZ" | "AU" | "UK" | null;

export default function PublicHolidaysSettingsPage() {
  const [value, setValue] = useState<Template>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/public-holidays");
        if (res.ok) {
          const data = await res.json();
          setValue((data?.template as Template) ?? null);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/public-holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: value }),
      });
      if (res.ok) toast.success("Public holiday template saved");
      else toast.error("Failed to save");
    } catch {
      toast.error("Error saving");
    }
    setSaving(false);
  };

  return (
    <PageShell
      title="Public Holiday Templates"
      description="Choose a regional holiday template for your company calendar."
      breadcrumbs={breadcrumbConfigs.settingsSection("Public Holiday Templates")}
      showHomeIcon={false}
      action={
        <Button onClick={handleSave} loading={saving} disabled={loading}>
          Save
        </Button>
      }
    >
      <Card className="p-6">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <RadioGroup value={value ?? undefined} onValueChange={(v) => setValue(v as Template)}>
            <div className="flex items-center space-x-3 py-2">
              <RadioGroupItem value="NZ" id="nz" />
              <Label htmlFor="nz">New Zealand</Label>
            </div>
            <div className="flex items-center space-x-3 py-2">
              <RadioGroupItem value="AU" id="au" />
              <Label htmlFor="au">Australia</Label>
            </div>
            <div className="flex items-center space-x-3 py-2">
              <RadioGroupItem value="UK" id="uk" />
              <Label htmlFor="uk">United Kingdom</Label>
            </div>
          </RadioGroup>
        )}
      </Card>
    </PageShell>
  );
}


