"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImpactPreview } from "@/components/settings/ImpactPreview";
import { SmartTooltip } from "@/components/ui/SmartTooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users, Calendar, Settings, AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/ui/PageShell";
import { SectionSkeleton } from "@/components/ui/PageSkeleton";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { motion, useSpring } from "framer-motion";

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 140, damping: 18, mass: 0.7 },
  },
};

const MotionNumber = ({
  value,
  format = (val: number) => Math.round(val).toLocaleString(),
}: {
  value: number;
  format?: (value: number) => string;
}) => {
  const spring = useSpring(value, {
    stiffness: 220,
    damping: 26,
    mass: 0.8,
  });
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      setDisplayValue(latest);
    });

    return () => {
      unsubscribe();
    };
  }, [spring]);

  return (
    <motion.span className="tabular-nums font-semibold">
      {format(displayValue)}
    </motion.span>
  );
};

interface EventCategory {
  id: string;
  name: string;
  color?: string;
}

interface ServiceLengthTier {
  minYears: number;
  maxYears?: number;
  accrualRate: number;
}

interface LeavePolicy {
  id: string;
  name: string;
  description?: string;
  eventCategory: EventCategory;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  accrualRate: number;
  accrualPeriod: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  accrualUnit: "DAYS" | "HOURS";
  enableProration: boolean;
  prorationMethod: "DAILY" | "WEEKLY" | "MONTHLY" | "NONE";
  serviceLengthTiers?: ServiceLengthTier[];
  allowNegativeBalance: boolean;
  assignments: any[];
  _count: { assignments: number };
}

interface LeavePolicyFormData {
  name: string;
  description: string;
  eventCategoryId: string;
  effectiveFrom: string;
  effectiveTo: string;
  accrualRate: number;
  accrualPeriod: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  accrualUnit: "DAYS" | "HOURS";
  enableProration: boolean;
  prorationMethod: "DAILY" | "WEEKLY" | "MONTHLY" | "NONE";
  serviceLengthTiers: ServiceLengthTier[];
  allowNegativeBalance: boolean;
  isActive: boolean;
}

export default function LeavePoliciesPage() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [formData, setFormData] = useState<LeavePolicyFormData>({
    name: "",
    description: "",
    eventCategoryId: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    accrualRate: 0,
    accrualPeriod: "MONTHLY",
    accrualUnit: "DAYS",
    enableProration: true,
    prorationMethod: "DAILY",
    serviceLengthTiers: [],
    allowNegativeBalance: false,
    isActive: true,
  });

  useEffect(() => {
    fetchPolicies();
    fetchEventCategories();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await fetch("/api/leave-policies");
      if (response.ok) {
        const data = await response.json();
        setPolicies(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch leave policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventCategories = async () => {
    try {
      const response = await fetch("/api/event-categories");
      if (response.ok) {
        const data = await response.json();
        setEventCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch event categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPolicy
        ? `/api/leave-policies/${editingPolicy.id}`
        : "/api/leave-policies";

      const method = editingPolicy ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          effectiveTo: formData.effectiveTo || null,
          serviceLengthTiers:
            formData.serviceLengthTiers.length > 0
              ? formData.serviceLengthTiers
              : null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Leave policy ${editingPolicy ? "updated" : "created"} successfully`,
        });
        setDialogOpen(false);
        resetForm();
        fetchPolicies();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save leave policy",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (policy: LeavePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || "",
      eventCategoryId: policy.eventCategory.id,
      effectiveFrom: policy.effectiveFrom.split("T")[0],
      effectiveTo: policy.effectiveTo?.split("T")[0] || "",
      accrualRate: policy.accrualRate,
      accrualPeriod: policy.accrualPeriod,
      accrualUnit: policy.accrualUnit,
      enableProration: policy.enableProration,
      prorationMethod: policy.prorationMethod,
      serviceLengthTiers: policy.serviceLengthTiers || [],
      allowNegativeBalance: policy.allowNegativeBalance,
      isActive: policy.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this leave policy?")) return;

    try {
      const response = await fetch(`/api/leave-policies/${policyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Leave policy deleted successfully",
        });
        fetchPolicies();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete leave policy",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingPolicy(null);
    setFormData({
      name: "",
      description: "",
      eventCategoryId: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      accrualRate: 0,
      accrualPeriod: "MONTHLY",
      accrualUnit: "DAYS",
      enableProration: true,
      prorationMethod: "DAILY",
      serviceLengthTiers: [],
      allowNegativeBalance: false,
      isActive: true,
    });
  };

  const addServiceLengthTier = () => {
    setFormData((prev) => ({
      ...prev,
      serviceLengthTiers: [
        ...prev.serviceLengthTiers,
        { minYears: 0, accrualRate: 0 },
      ],
    }));
  };

  const updateServiceLengthTier = (
    index: number,
    field: keyof ServiceLengthTier,
    value: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      serviceLengthTiers: prev.serviceLengthTiers.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier,
      ),
    }));
  };

  const removeServiceLengthTier = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      serviceLengthTiers: prev.serviceLengthTiers.filter((_, i) => i !== index),
    }));
  };

  return (
    <PageShell
      title="Leave Policies"
      description="Manage accrual rates, proration rules, and service-length tiers for leave entitlements"
      breadcrumbs={breadcrumbConfigs.settingsSection('Leave Policies')}
      showHomeIcon={false}
    >
      {loading ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <SectionSkeleton
              showContainer={false}
              rows={1}
              lineClassName="h-10 w-36 rounded-lg"
            />
          </div>
          <SectionSkeleton
            showHeader
            variant="grid"
            gridItems={4}
            gridCols={2}
          />
          <SectionSkeleton showHeader variant="table" rows={5} />
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-6">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPolicy ? "Edit Leave Policy" : "Create Leave Policy"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure accrual rates and rules for leave entitlements. This
                    affects only entitlement calculations - booking rules are
                    managed in Event Rules.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="accrual">Accrual Rules</TabsTrigger>
                  <TabsTrigger value="tiers">Service Tiers</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Policy Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="eventCategory">Leave Type *</Label>
                      <Select
                        value={formData.eventCategoryId}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            eventCategoryId: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Optional description of this policy"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="effectiveFrom">Effective From *</Label>
                      <Input
                        id="effectiveFrom"
                        type="date"
                        value={formData.effectiveFrom}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            effectiveFrom: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="effectiveTo">Effective To</Label>
                      <Input
                        id="effectiveTo"
                        type="date"
                        value={formData.effectiveTo}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            effectiveTo: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isActive}
                      onChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isActive: checked }))
                      }
                    />
                    <Label>Active</Label>
                  </div>
                </TabsContent>

                <TabsContent value="accrual" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="accrualRate">Accrual Rate *</Label>
                      <Input
                        id="accrualRate"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.accrualRate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            accrualRate: parseFloat(e.target.value) || 0,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="accrualUnit">Unit</Label>
                      <Select
                        value={formData.accrualUnit}
                        onValueChange={(value: "DAYS" | "HOURS") =>
                          setFormData((prev) => ({
                            ...prev,
                            accrualUnit: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAYS">Days</SelectItem>
                          <SelectItem value="HOURS">Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="accrualPeriod">Per Period</Label>
                      <Select
                        value={formData.accrualPeriod}
                        onValueChange={(
                          value:
                            | "WEEKLY"
                            | "MONTHLY"
                            | "QUARTERLY"
                            | "ANNUALLY",
                        ) =>
                          setFormData((prev) => ({
                            ...prev,
                            accrualPeriod: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="ANNUALLY">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.enableProration}
                        onChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            enableProration: checked,
                          }))
                        }
                      />
                      <Label>Enable Proration</Label>
                    </div>

                    {formData.enableProration && (
                      <div>
                        <Label htmlFor="prorationMethod">
                          Proration Method
                        </Label>
                        <Select
                          value={formData.prorationMethod}
                          onValueChange={(
                            value: "DAILY" | "WEEKLY" | "MONTHLY" | "NONE",
                          ) =>
                            setFormData((prev) => ({
                              ...prev,
                              prorationMethod: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="NONE">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.allowNegativeBalance}
                        onChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            allowNegativeBalance: checked,
                          }))
                        }
                      />
                      <Label>Allow Negative Balance</Label>
                      <div className="text-sm text-muted-foreground">
                        (Bypasses entitlement checks but Event Rules still
                        apply)
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tiers" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Service Length Tiers
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Define different accrual rates based on years of service
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addServiceLengthTier}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tier
                    </Button>
                  </div>

                  {formData.serviceLengthTiers.map((tier, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-4 gap-4 items-end">
                          <div>
                            <Label>Min Years</Label>
                            <Input
                              type="number"
                              min="0"
                              value={tier.minYears}
                              onChange={(e) =>
                                updateServiceLengthTier(
                                  index,
                                  "minYears",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label>Max Years (Optional)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={tier.maxYears || ""}
                              onChange={(e) =>
                                updateServiceLengthTier(
                                  index,
                                  "maxYears",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label>Accrual Rate</Label>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              value={tier.accrualRate}
                              onChange={(e) =>
                                updateServiceLengthTier(
                                  index,
                                  "accrualRate",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeServiceLengthTier(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {formData.serviceLengthTiers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No service length tiers configured. Base accrual rate will
                      apply to all employees.
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPolicy ? "Update Policy" : "Create Policy"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {policies.length === 0 ? (
          <Card
            variant="gradient"
            className="relative overflow-hidden border border-white/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent backdrop-blur-xl dark:border-slate-800/60 dark:from-primary/20 dark:via-primary/10 dark:to-slate-900/40"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 top-8 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
              <div className="absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-sky-400/25 blur-[100px] dark:bg-sky-500/25" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_60%)] opacity-70" />
            </div>
            <CardContent className="relative flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <div className="absolute inset-0 rounded-[2rem] border border-white/40 bg-white/70 backdrop-blur-xl shadow-depth-3 dark:border-slate-800/60 dark:bg-slate-900/60" />
                <div className="absolute inset-2 rounded-[2rem] bg-[conic-gradient(from_140deg_at_50%_50%,rgba(59,130,246,0.5),rgba(59,130,246,0),rgba(14,165,233,0.4),rgba(99,102,241,0.45),transparent)] opacity-80 blur" />
                <Calendar className="relative z-10 h-14 w-14 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold tracking-tight">No leave policies yet</h3>
                <p className="text-sm text-muted-foreground">
                  Kickstart your leave management by creating a policy tailored to your organisation.
                </p>
              </div>
              <Button
                size="lg"
                glow
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
                className="px-8 animate-[pulse_3s_ease-in-out_infinite]"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create your first leave policy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3"
          >
            {policies.map((policy) => {
              const prorationClasses = policy.enableProration
                ? "border-sky-500/40 bg-sky-400/10 text-sky-600 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300"
                : "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-300";
              const negativeClasses = policy.allowNegativeBalance
                ? "border-amber-500/40 bg-amber-400/15 text-amber-600 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300"
                : "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-300";
              const prorationLabel = policy.prorationMethod
                .toLowerCase()
                .replace(/_/g, " ")
                .replace(/\b\w/g, (char) => char.toUpperCase());

              return (
                <motion.div
                  key={policy.id}
                  variants={cardVariants}
                  whileHover={{ y: -8, scale: 1.01 }}
                  whileFocus={{ y: -6, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 180, damping: 20, mass: 0.8 }}
                  className="group/policy"
                >
                  <Card
                    variant="gradient"
                    hoverable
                    className="relative overflow-hidden border border-white/15 bg-gradient-to-br from-white/70 via-white/25 to-white/10 backdrop-blur-xl transition-transform duration-500 ease-out dark:border-slate-800/60 dark:from-slate-900/80 dark:via-slate-900/40 dark:to-slate-900/20 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_60%)] before:opacity-60 before:transition-opacity before:duration-500 after:pointer-events-none after:absolute after:-bottom-20 after:-right-16 after:h-48 after:w-48 after:rounded-full after:bg-primary/20 after:blur-3xl after:opacity-40 group-hover/policy:before:opacity-80 group-hover/policy:after:opacity-60"
                  >
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/30 via-transparent to-primary/30" />
                    <div className="absolute top-5 right-5 z-20">
                      <div className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-2 py-1 shadow-depth-2 backdrop-blur-xl transition-all duration-300 ease-out translate-y-3 opacity-0 pointer-events-none group-hover/policy:translate-y-0 group-hover/policy:opacity-100 group-hover/policy:pointer-events-auto group-focus-within/policy:translate-y-0 group-focus-within/policy:opacity-100 group-focus-within/policy:pointer-events-auto dark:border-slate-800/50 dark:bg-slate-900/40">
                        <Button
                          variant="ghost"
                          size="icon"
                          pill
                          onClick={() => handleEdit(policy)}
                          className="text-slate-600 transition-transform hover:text-primary focus-visible:text-primary dark:text-slate-200"
                          aria-label={`Edit ${policy.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          pill
                          onClick={() => handleDelete(policy.id)}
                          className="text-destructive transition-transform hover:text-destructive focus-visible:text-destructive"
                          aria-label={`Delete ${policy.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardHeader
                      transparent
                      className="relative z-10 border-none bg-transparent px-6 pb-4 pt-6"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <CardTitle className="text-xl font-semibold tracking-tight">
                            {policy.name}
                          </CardTitle>
                          {!policy.isActive && (
                            <Badge variant="secondary" className="bg-white/80 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>{policy.eventCategory.name}</span>
                          <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline" />
                          <span>
                            {policy.accrualRate} {policy.accrualUnit.toLowerCase()} per {policy.accrualPeriod.toLowerCase()}
                          </span>
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10 px-6 pb-6 pt-0">
                      <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/20 bg-white/60 p-4 shadow-inner dark:border-slate-800/60 dark:bg-slate-900/50">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Effective period</div>
                          <div className="mt-1 font-semibold text-foreground">
                            {new Date(policy.effectiveFrom).toLocaleDateString()} –{" "}
                            {policy.effectiveTo
                              ? new Date(policy.effectiveTo).toLocaleDateString()
                              : "Ongoing"}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/20 bg-white/60 p-4 shadow-inner dark:border-slate-800/60 dark:bg-slate-900/50">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proration</div>
                          <div className="mt-1 font-semibold text-foreground">
                            {policy.enableProration ? prorationLabel : "Disabled"}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/20 bg-white/60 p-4 shadow-inner dark:border-slate-800/60 dark:bg-slate-900/50">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service tiers</div>
                          <div className="mt-1 font-semibold text-foreground">
                            {policy.serviceLengthTiers?.length || 0} configured
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/20 bg-white/60 p-4 shadow-inner dark:border-slate-800/60 dark:bg-slate-900/50">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Negative balance</div>
                          <div className="mt-1 font-semibold text-foreground">
                            {policy.allowNegativeBalance ? "Allowed" : "Not allowed"}
                          </div>
                        </div>
                      </div>
                      {policy.description && (
                        <div className="mt-6 rounded-2xl border border-white/20 bg-white/70 p-4 text-sm text-muted-foreground shadow-inner dark:border-slate-800/60 dark:bg-slate-900/60">
                          {policy.description}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter transparent className="relative z-10 border-none px-6 pb-6 pt-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 backdrop-blur-sm dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <Users className="h-4 w-4" />
                          <div className="flex items-baseline gap-1 text-sm">
                            <MotionNumber value={policy._count.assignments} />
                          </div>
                          <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                            Assignments
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm ${prorationClasses}`}
                        >
                          <Settings className="h-4 w-4" />
                          <div className="flex items-baseline gap-1 text-sm">
                            <MotionNumber value={policy.enableProration ? 1 : 0} />
                          </div>
                          <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                            Proration
                          </span>
                          <span className="hidden text-[11px] font-medium normal-case opacity-80 sm:inline">
                            {policy.enableProration ? prorationLabel : "Off"}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm ${negativeClasses}`}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <div className="flex items-baseline gap-1 text-sm">
                            <MotionNumber value={policy.allowNegativeBalance ? 1 : 0} />
                          </div>
                          <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                            Negative balance
                          </span>
                          <span className="hidden text-[11px] font-medium normal-case opacity-80 sm:inline">
                            {policy.allowNegativeBalance ? "Enabled" : "Locked"}
                          </span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
        </>
      )}
    </PageShell>
  );
}
