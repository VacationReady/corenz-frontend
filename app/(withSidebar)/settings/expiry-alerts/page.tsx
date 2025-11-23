"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import Button from "@/components/ui/Button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ExpiryRuleWizard } from "./ExpiryRuleWizard";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

type ExpiryRule = {
  id: string;
  category: string;
  daysBefore: number;
  notifyAdmin: boolean;
  notifyManager: boolean;
  notifyEmployee: boolean;
  isAutomationRule?: boolean;
  automationRuleId?: string;
  isActive?: boolean;
};

export default function ExpirySettingsPage() {
  const [rules, setRules] = useState<ExpiryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/expiry-rules/list");
      if (!res.ok) {
        throw new Error(`Failed to load rules: ${res.status}`);
      }
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch expiry rules", err);
      toast("Failed to load expiry rules");
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // Refresh rules when wizard closes (after creating a new rule)
  const handleWizardClose = (open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      // Refresh rules after wizard closes
      setTimeout(() => {
        fetchRules();
      }, 500); // Small delay to ensure backend has processed the creation
    }
  };

  const handleUpdate = async (
    id: string,
    updatedFields: Partial<ExpiryRule>,
  ) => {
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
    <PageShell
      title="Expiry Alerts"
      description="Set how many days before expiry alerts should trigger and who should be notified for each category."
      breadcrumbs={breadcrumbConfigs.settingsSection('Expiry Alerts')}
      showHomeIcon={false}
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="mr-auto">
              <Dialog open={wizardOpen} onOpenChange={handleWizardClose}>
                <DialogTrigger asChild>
                  <Button size="sm">Build Custom Expiry Workflow</Button>
                </DialogTrigger>
                <ExpiryRuleWizard open={wizardOpen} onOpenChange={handleWizardClose} />
              </Dialog>
            </div>
          </div>

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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rule.category}
                      {rule.isAutomationRule && (
                        <Badge variant="secondary" className="text-xs">
                          Automation
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rule.isAutomationRule ? (
                      <span className="text-sm text-muted-foreground">{rule.daysBefore} days</span>
                    ) : (
                      <Input
                        type="number"
                        value={rule.daysBefore}
                        onChange={(event) =>
                          handleUpdate(rule.id, {
                            daysBefore: parseInt(event.target.value, 10),
                          })
                        }
                        disabled={updatingId === rule.id}
                        className="max-w-[100px]"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {rule.isAutomationRule ? (
                      <span className="text-sm text-muted-foreground">
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    ) : (
                      <Switch
                        checked={rule.notifyAdmin}
                        onChange={(checked) =>
                          handleUpdate(rule.id, { notifyAdmin: checked })
                        }
                        disabled={updatingId === rule.id}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {rule.isAutomationRule && rule.automationRuleId ? (
                      <Link 
                        href={`/settings/automation-rules?ruleId=${rule.automationRuleId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Manage
                      </Link>
                    ) : rule.isAutomationRule ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <Switch
                        checked={rule.notifyManager}
                        onChange={(checked) =>
                          handleUpdate(rule.id, { notifyManager: checked })
                        }
                        disabled={updatingId === rule.id}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {rule.isAutomationRule ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <Switch
                        checked={rule.notifyEmployee}
                        onChange={(checked) =>
                          handleUpdate(rule.id, { notifyEmployee: checked })
                        }
                        disabled={updatingId === rule.id}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      {/* Wizard lives at root to avoid overflow clipping */}
    </PageShell>
  );
}
