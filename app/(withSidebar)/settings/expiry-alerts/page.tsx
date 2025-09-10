"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type ExpiryRule = {
  id: string;
  category: string;
  daysBefore: number;
  notifyAdmin: boolean;
  notifyManager: boolean;
  notifyEmployee: boolean;
};

export default function ExpirySettingsPage() {
  const [rules, setRules] = useState<ExpiryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkDays, setBulkDays] = useState<string>("");
  const [bulkAdmin, setBulkAdmin] = useState<boolean | null>(null);
  const [bulkManager, setBulkManager] = useState<boolean | null>(null);
  const [bulkEmployee, setBulkEmployee] = useState<boolean | null>(null);
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  useEffect(() => {
    const fetchRules = async () => {
      const res = await fetch("/api/expiry-rules/list");
      const data = await res.json();
      setRules(data);
      setLoading(false);
    };
    fetchRules();
  }, []);

  const handleUpdate = async (id: string, updatedFields: Partial<ExpiryRule>) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/expiry-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        const updatedRule = await res.json();
        setRules((prev) => prev.map((r) => (r.id === id ? updatedRule : r)));
        toast("Expiry Rule updated", { description: updatedRule.category });
      } else {
        toast("Error updating expiry rule");
      }
    } catch (error) {
      console.error(error);
      toast("Error updating expiry rule");
    } finally {
      setUpdatingId(null);
    }
  };

  const applyPreset = (preset: "dl-90-60-30" | "training-30" | "documents-60") => {
    const ids = selectedIds;
    if (ids.length === 0) {
      toast("Select at least one rule first");
      return;
    }
    if (preset === "training-30") {
      setBulkDays("30");
      setBulkAdmin(true);
      setBulkManager(true);
      setBulkEmployee(true);
    } else if (preset === "documents-60") {
      setBulkDays("60");
      setBulkAdmin(true);
      setBulkManager(false);
      setBulkEmployee(true);
    } else {
      // Driver Licenses 90/60/30 is varied; as a simple preset, default to 90 and all notify
      setBulkDays("90");
      setBulkAdmin(true);
      setBulkManager(true);
      setBulkEmployee(true);
    }
  };

  const handleBulkApply = async () => {
    const ids = selectedIds;
    if (ids.length === 0) {
      toast("Select at least one rule first");
      return;
    }
    try {
      const body: any = { ruleIds: ids };
      if (bulkDays !== "") body.daysBefore = parseInt(bulkDays, 10);
      if (bulkAdmin !== null) body.notifyAdmin = bulkAdmin;
      if (bulkManager !== null) body.notifyManager = bulkManager;
      if (bulkEmployee !== null) body.notifyEmployee = bulkEmployee;
      const res = await fetch('/api/expiry-rules/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Bulk update failed');
      // Refresh list
      const updated = await fetch('/api/expiry-rules/list').then(r => r.json());
      setRules(updated);
      toast('Bulk update applied');
      setSelected({});
    } catch (e) {
      toast('Failed to apply bulk update');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Expiry Alerts Settings</h1>
      <p className="text-muted-foreground">Set how many days before expiry alerts should trigger and who should be notified for each category.</p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
        </div>
      ) : (
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="flex items-center gap-2">
            <label className="text-sm">Presets:</label>
            <select className="border rounded px-2 py-1 text-sm" onChange={(e) => applyPreset(e.target.value as any)} defaultValue="">
              <option value="" disabled>Choose preset</option>
              <option value="dl-90-60-30">Driver Licenses: 90/60/30 (Admin+Manager+Employee)</option>
              <option value="training-30">Training: 30 days</option>
              <option value="documents-60">Documents: 60 days</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Days:</span>
            <Input className="w-24" type="number" value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1"><input type="checkbox" checked={bulkAdmin === true} onChange={(e) => setBulkAdmin(e.target.checked ? true : null)} /> Admin</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={bulkManager === true} onChange={(e) => setBulkManager(e.target.checked ? true : null)} /> Manager</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={bulkEmployee === true} onChange={(e) => setBulkEmployee(e.target.checked ? true : null)} /> Employee</label>
          </div>
          <button className="border rounded px-3 py-1 text-sm" onClick={handleBulkApply} disabled={selectedIds.length === 0}>Apply to {selectedIds.length} selected</button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input type="checkbox" aria-label="select all" onChange={(e) => {
                  const checked = e.target.checked;
                  const next: Record<string, boolean> = {};
                  rules.forEach(r => { next[r.id] = checked; });
                  setSelected(next);
                }} />
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Days Before Expiry</TableHead>
              <TableHead>Notify Admin</TableHead>
              <TableHead>Notify Manager</TableHead>
              <TableHead>Notify Employee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <input type="checkbox" checked={!!selected[rule.id]} onChange={(e) => setSelected({ ...selected, [rule.id]: e.target.checked })} />
                </TableCell>
                <TableCell>{rule.category}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={rule.daysBefore}
                    onChange={(e) => handleUpdate(rule.id, { daysBefore: parseInt(e.target.value, 10) })}
                    disabled={updatingId === rule.id}
                    className="max-w-[100px]"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.notifyAdmin}
                    onChange={(checked) => handleUpdate(rule.id, { notifyAdmin: checked })}
                    disabled={updatingId === rule.id}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.notifyManager}
                    onChange={(checked) => handleUpdate(rule.id, { notifyManager: checked })}
                    disabled={updatingId === rule.id}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.notifyEmployee}
                    onChange={(checked) => handleUpdate(rule.id, { notifyEmployee: checked })}
                    disabled={updatingId === rule.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
