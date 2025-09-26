"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { toast } from "sonner";
import { Save } from "lucide-react";

type Template = "NZ" | "AU" | "UK" | null;

export default function PublicHolidaysSettingsPage() {
  const [value, setValue] = useState<Template>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [regions, setRegions] = useState<{ value: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewHolidays, setPreviewHolidays] = useState<Array<{ title: string; start: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/public-holidays");
        if (res.ok) {
          const data = await res.json();
          setValue((data?.template as Template) ?? null);
          setRegion((data?.region as string | null) ?? null);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Load a preview list when selection changes
  useEffect(() => {
    const loadPreview = async () => {
      setPreviewHolidays([]);
      if (!value) return;
      const year = new Date().getFullYear();
      const from = new Date(Date.UTC(year, 0, 1)).toISOString();
      const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
      try {
        const qs = new URLSearchParams({ from, to, template: value, ...(region ? { region } : {}) });
        const res = await fetch(`/api/public-holidays?${qs.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const items = (Array.isArray(data) ? data : []).map((e: any) => ({ title: e.title, start: e.start }));
          items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          setPreviewHolidays(items);
        }
      } catch {}
    };
    loadPreview();
  }, [value, region]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/public-holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: value, region }),
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
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={loading}
          loadingText="Saving template"
          icon={<Save className="h-4 w-4" />}
        >
          Save
        </Button>
      }
    >
      <Card className="p-6">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="space-y-2">
            <div className="mb-1 font-medium">Country</div>
            <Select value={value ?? undefined} onValueChange={(v) => setValue(v as Template)}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NZ">New Zealand</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="UK">United Kingdom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>
      {!loading && value && (
        <Card className="p-6 mt-4">
          <div className="mb-2 font-medium">Region / State</div>
          <p className="text-sm text-muted-foreground mb-3">Choose a subdivision for more accurate holidays (optional).</p>
          <select
            className="border rounded p-2 w-full md:w-96"
            value={region ?? ''}
            onChange={(e) => setRegion(e.target.value || null)}
            onFocus={async () => {
              try {
                const res = await fetch(`/api/public-holiday-regions?template=${value}`);
                if (res.ok) setRegions(await res.json());
              } catch {}
            }}
          >
            <option value="">None (national)</option>
            {regions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {/* Preview list */}
          {previewHolidays.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 font-medium">Bank holidays this year</div>
              <ul className="list-disc pl-5 space-y-1">
                {previewHolidays.map((h, idx) => (
                  <li key={`${h.start}-${idx}`} className="text-sm">
                    {new Date(h.start).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    {": "}
                    {h.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </PageShell>
  );
}


