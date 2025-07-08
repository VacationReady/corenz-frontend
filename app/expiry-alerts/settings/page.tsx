"use client";

import { useEffect, useState } from "react";
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Expiry Alerts Settings</h1>
      <p className="text-muted-foreground">Set how many days before expiry alerts should trigger and who should be notified for each category.</p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
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
