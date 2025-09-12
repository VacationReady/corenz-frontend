"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Switch } from "@headlessui/react";
import { PlusIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AddCategoryModal from "@/components/AddCategoryModal";
import AddSubcategoryModal from "@/components/AddSubcategoryModal";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/Input";
<<<<<<< HEAD
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
=======
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec

export default function EventManagerPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] =
    useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
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

  useEffect(() => {
    fetchCategories();
  }, [statusFilter]);

  const fetchCategories = async () => {
    try {
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
    }
  };
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

  const handleOpenAddSubcategory = (
    categoryId: string,
    categoryName: string,
  ) => {
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
    setIsAddSubcategoryModalOpen(true);
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
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Event Categories</h2>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <Input
            placeholder="Search categories or subcategories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onValueChange={(v: any) => setStatusFilter(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(v: any) => setTypeFilter(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="TIME_OFF">Time Off</SelectItem>
              <SelectItem value="WORKING_EVENT">Working Event</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={adminOnlyFilter}
            onValueChange={(v: any) => setAdminOnlyFilter(v)}
          >
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
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="border rounded p-3 bg-white shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-gray-500">
                    {category.categoryType ?? ""}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {["requiresApproval", "adminOnly", "isActive"].map((key) => (
                    <div key={key} className="flex items-center space-x-1">
                      <span className="text-sm capitalize">
                        {key === "requiresApproval"
                          ? "Requires Approval"
                          : key === "adminOnly"
                            ? "Admin Only"
                            : "Active"}
                      </span>
                      <Switch
                        checked={!!category[key]}
                        onChange={(val) =>
                          handleToggleCategory(
                            category.id,
                            key as any,
                            Boolean(val),
                          )
                        }
                        disabled={
                          category.systemDefined ||
                          savingKey === `${category.id}:${key}`
                        }
                        className={cn(
                          category[key] ? "bg-green-500" : "bg-gray-300",
                          "relative inline-flex h-5 w-10 items-center rounded-full",
                          category.systemDefined ||
                            savingKey === `${category.id}:${key}`
                            ? "opacity-50 cursor-not-allowed"
                            : "",
                        )}
                        title={
                          category.systemDefined
                            ? "System category, cannot edit"
                            : ""
                        }
                      >
                        <span
                          className={cn(
                            category[key] ? "translate-x-6" : "translate-x-1",
                            "inline-block h-4 w-4 transform rounded-full bg-white transition",
                          )}
                        />
                      </Switch>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleArchiveCategory(category.id)}
                    disabled={category.systemDefined}
                  >
                    Archive
                  </Button>
                  <button onClick={() => toggleExpand(category.id)}>
                    {expanded === category.id ? (
                      <ChevronUpIcon className="w-5 h-5" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {expanded === category.id && category.subcategories && (
                <div className="mt-4 space-y-2">
                  {category.subcategories.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex justify-between items-center border rounded p-2 bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{sub.name}</p>
                        <p className="text-sm text-gray-500">
                          {sub.defaultPaidStatus} |{" "}
                          {sub.isActive ? "Active" : "Archived"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm">Edit</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleArchiveSubcategory(sub.id)}
                        >
                          Archive
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    className="mt-2"
                    onClick={() =>
                      handleOpenAddSubcategory(category.id, category.name)
                    }
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Subcategory
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
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
    </PageShell>
  );
}
