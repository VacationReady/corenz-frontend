"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  return (
    <PageShell
      title="Leave Policies"
      description="Manage accrual rates, proration rules, and service-length tiers for leave entitlements"
      breadcrumbs={breadcrumbConfigs.settingsSection('Leave Policies')}
      showHomeIcon={false}
    >
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

      <div className="grid gap-6">
        {policies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Leave Policies</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first leave policy to start managing accrual rates
                and entitlement rules.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Leave Policy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {policies.map((policy) => (
              <Card key={policy.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {policy.name}
                        {!policy.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {policy.eventCategory.name} • {policy.accrualRate}{" "}
                        {policy.accrualUnit.toLowerCase()} per{" "}
                        {policy.accrualPeriod.toLowerCase()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      {policy._count.assignments} assignments
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(policy)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(policy.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Effective Period</div>
                      <div className="text-muted-foreground">
                        {new Date(policy.effectiveFrom).toLocaleDateString()} -{" "}
                        {policy.effectiveTo
                          ? new Date(policy.effectiveTo).toLocaleDateString()
                          : "Ongoing"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Proration</div>
                      <div className="text-muted-foreground">
                        {policy.enableProration
                          ? policy.prorationMethod
                          : "Disabled"}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Service Tiers</div>
                      <div className="text-muted-foreground">
                        {policy.serviceLengthTiers?.length || 0} configured
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Negative Balance</div>
                      <div
                        className={`text-sm ${policy.allowNegativeBalance ? "text-orange-600" : "text-muted-foreground"}`}
                      >
                        {policy.allowNegativeBalance
                          ? "Allowed"
                          : "Not allowed"}
                      </div>
                    </div>
                  </div>
                  {policy.description && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        {policy.description}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
