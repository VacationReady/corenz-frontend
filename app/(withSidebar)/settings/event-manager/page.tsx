"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AddCategoryModal from "@/components/AddCategoryModal";
import AddSubcategoryModal from "@/components/AddSubcategoryModal";
import EditCategoryModal from "@/components/EditCategoryModal";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PageShell } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { IconPicker } from "@/components/IconPicker";
import { getEventCategoryIcon } from "@/lib/event-category-icons";

interface EventCategory {
  id: string;
  name: string;
  categoryType: 'TIME_OFF' | 'WORKING_EVENT';
  requiresApproval: boolean;
  adminOnly: boolean;
  isActive: boolean;
  systemDefined: boolean;
  subcategories?: Array<{ id: string; name: string }>;
  iconKey?: string | null;
  color?: string | null;
  balanceRequired?: boolean;
  defaultBalance?: number | null;
  balanceRefreshMonths?: number | null;
}

export default function EventManagerPage() {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] =
    useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  // Search & filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">(
    "active",
  );
  const [typeFilter, setTypeFilter] = useState<
    "all" | "TIME_OFF" | "WORKING_EVENT"
  >("all");
  const [adminOnlyFilter, setAdminOnlyFilter] = useState<"all" | "yes" | "no">(
    "all",
  );
  // Disable while saving
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      if (statusFilter === "active") {
        const res = await fetch("/api/event-categories", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error("Unexpected API response:", data);
        }
      } else {
        const res = await fetch("/api/event-categories/archived", {
          cache: "no-store",
        });
        const json = await res.json();
        const data = json?.data ?? [];
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error("Unexpected API response:", json);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .filter((c) =>
        typeFilter === "all" ? true : c.categoryType === typeFilter,
      )
      .filter((c) =>
        adminOnlyFilter === "all"
          ? true
          : adminOnlyFilter === "yes"
            ? !!c.adminOnly
            : !c.adminOnly,
      )
      .filter((c) =>
        q
          ? c.name.toLowerCase().includes(q) ||
            (Array.isArray(c.subcategories) &&
              c.subcategories.some((s: any) =>
                s.name?.toLowerCase().includes(q),
              ))
          : true,
      );
  }, [categories, search, typeFilter, adminOnlyFilter]);

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };
  const handleToggleCategory = async (
    categoryId: string,
    key: "requiresApproval" | "adminOnly" | "isActive",
    nextValue: boolean,
  ) => {
    const sk = `${categoryId}:${key}`;
    setSavingKey(sk);
    const prev = categories;
    const optimistic = categories.map((c) =>
      c.id === categoryId ? { ...c, [key]: nextValue } : c,
    );
    setCategories(optimistic);
    try {
      const res = await fetch(`/api/event-categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: nextValue }),
      });
      if (!res.ok) {
        let msg = "Failed to update";
        try {
          msg = (await res.json())?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      const json = await res.json();
      toast.success(json?.message || "Updated");
    } catch (e: any) {
      setCategories(prev);
      toast.error(e?.message || "Failed to update");
    } finally {
      setSavingKey(null);
    }
  };

  const handleUpdateIcon = async (categoryId: string, iconKey: string) => {
    const prev = categories;
    const optimistic = categories.map((c) =>
      c.id === categoryId ? { ...c, iconKey } : c
    );
    setCategories(optimistic);
    try {
      const res = await fetch(`/api/event-categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iconKey }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update icon");
      }
      toast.success("Icon updated");
    } catch (e: any) {
      setCategories(prev);
      toast.error(e.message || "Failed to update icon");
    }
  };

  const handleOpenAddSubcategory = (
    categoryId: string,
    categoryName: string,
  ) => {
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
    setIsAddSubcategoryModalOpen(true);
  };

  const handleOpenEditCategory = (category: EventCategory) => {
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };

  const handleArchiveCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to archive this category?")) return;
    try {
      const res = await fetch(`/api/event-categories/${categoryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Category archived.");
        fetchCategories();
      } else {
        toast.error(data.error || "Failed to archive category.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred.");
    }
  };

  const handleArchiveSubcategory = async (subcategoryId: string) => {
    if (!confirm("Are you sure you want to archive this subcategory?")) return;
    try {
      const res = await fetch(`/api/event-subcategories/${subcategoryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Subcategory archived.");
        fetchCategories();
      } else {
        toast.error(data.error || "Failed to archive subcategory.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred.");
    }
  };

  return (
    <PageShell
      title="Event Manager"
      breadcrumbs={breadcrumbConfigs.settingsSection("Event Manager")}
      showHomeIcon={false}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Event Categories</CardTitle>
            <Button onClick={() => setIsModalOpen(true)} icon={<PlusIcon className="w-4 h-4" />}>
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
            <Input
              placeholder="Search categories or subcategories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="TIME_OFF">Time Off</SelectItem>
                <SelectItem value="WORKING_EVENT">Working Event</SelectItem>
              </SelectContent>
            </Select>
            <Select value={adminOnlyFilter} onValueChange={(v: any) => setAdminOnlyFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Admin Only" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Admin Only: All</SelectItem>
                <SelectItem value="yes">Admin Only: Yes</SelectItem>
                <SelectItem value="no">Admin Only: No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            )}
            {!isLoading && filteredCategories.length === 0 && (
              <EmptyState
                title="No matching categories"
                description="Try adjusting the search or filters."
                variant="minimal"
              />
            )}
            {!isLoading && filteredCategories.map((category) => (
              <div key={category.id} className="glass-card rounded-2xl p-4 shadow-depth-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    {/* Color indicator */}
                    <div 
                      className="w-3 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: category.color || '#3b82f6' }}
                      title={`Color: ${category.color || '#3b82f6'}`}
                    />
                    <div className="w-12">
                      <IconPicker
                        value={category.iconKey}
                        onChange={(key) => handleUpdateIcon(category.id, key)}
                        disabled={false}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.categoryType === 'TIME_OFF' ? 'Time Off' : category.categoryType === 'WORKING_EVENT' ? 'Working Event' : ''}
                        {category.systemDefined && (
                          <span className="ml-2 text-xs opacity-70">• System</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(["requiresApproval", "adminOnly", "isActive"] as const).map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-sm whitespace-nowrap">
                          {key === "requiresApproval"
                            ? "Requires Approval"
                            : key === "adminOnly"
                            ? "Admin Only"
                            : "Active"}
                        </span>
                        <div title={category.systemDefined ? "System category, cannot edit" : undefined}>
                          <Switch
                            checked={!!category[key]}
                            onChange={(val) =>
                              handleToggleCategory(
                                category.id,
                                key,
                                Boolean(val),
                              )
                            }
                            disabled={
                              category.systemDefined ||
                              savingKey === `${category.id}:${key}`
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEditCategory(category)}
                      icon={<PencilIcon className="w-4 h-4" />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchiveCategory(category.id)}
                      disabled={category.systemDefined}
                    >
                      Archive
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleExpand(category.id)}>
                      {expanded === category.id ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {expanded === category.id && category.subcategories && (
                  <div className="mt-4 space-y-2">
                    {category.subcategories.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="flex justify-between items-center glass-subtle rounded-xl p-3"
                      >
                        <InlineSubcategoryEditor
                          sub={sub}
                          isSickness={category.name.toLowerCase().includes("sick")}
                          onArchived={() => handleArchiveSubcategory(sub.id)}
                        />
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      className="mt-1"
                      onClick={() =>
                        handleOpenAddSubcategory(category.id, category.name)
                      }
                      icon={<PlusIcon className="w-4 h-4" />}
                    >
                      {category.name.toLowerCase().includes("sick")
                        ? "Add Sick Reason"
                        : "Add Subcategory"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCategories}
      />

      {/* Add Subcategory Modal */}
      <AddSubcategoryModal
        isOpen={isAddSubcategoryModalOpen}
        onClose={() => setIsAddSubcategoryModalOpen(false)}
        onSuccess={fetchCategories}
        parentCategoryId={selectedCategoryId}
        parentCategoryName={selectedCategoryName}
      />

      {/* Edit Category Modal */}
      <EditCategoryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={fetchCategories}
        category={editingCategory}
      />
    </PageShell>
  );
}

function InlineSubcategoryEditor({
  sub,
  isSickness,
  onArchived,
}: {
  sub: any;
  isSickness: boolean;
  onArchived: () => void;
}) {
  const [name, setName] = useState<string>(sub.name);
  const [paid, setPaid] = useState<"PAID" | "UNPAID">(sub.defaultPaidStatus);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  useEffect(() => {
    setHasChanges(
      name !== sub.name || (!isSickness && paid !== sub.defaultPaidStatus),
    );
  }, [name, paid, sub.name, sub.defaultPaidStatus]);

  const save = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/event-subcategories/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSickness ? { name } : { name, defaultPaidStatus: paid },
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isSickness ? "Sick reason" : "Subcategory name"}
        />
        {!isSickness && (
          <select
            value={paid}
            onChange={(e) => setPaid(e.target.value as "PAID" | "UNPAID")}
            className="glass-subtle rounded-xl px-3 py-2 text-sm"
          >
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" variant="secondary" disabled={!hasChanges} loading={isSaving} onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onArchived}>Archive</Button>
      </div>
    </div>
  );
}
