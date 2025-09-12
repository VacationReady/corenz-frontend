// File: app/settings/event-manager/archived/page.tsx

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { PageShell } from "@/components/ui/PageShell";

export default function ArchivedEventManagerPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const breadcrumbs = {
    items: [
      { label: "Settings", href: "/settings" },
      { label: "Event Manager", href: "/settings/event-manager" },
      { label: "Archived", isCurrentPage: true },
    ],
  };

  useEffect(() => {
    fetchArchivedCategories();
  }, []);

  const fetchArchivedCategories = async () => {
    try {
      const res = await fetch("/api/event-categories/archived");
      const data = await res.json();
      console.log("Fetched archived categories:", data);
      if (data.success) {
        setCategories(data.data);
      } else {
        toast.error(data.error || "Failed to fetch archived categories.");
      }
    } catch (error) {
      console.error("Error fetching archived categories:", error);
      toast.error("An error occurred while fetching archived categories.");
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const handleReactivateCategory = async (categoryId: string) => {
    if (!confirm("Reactivate this category?")) return;
    try {
      const res = await fetch(`/api/event-categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await res.json();
      console.log("Reactivate category response:", data);
      if (data.success) {
        toast.success(data.message || "Category reactivated.");
        fetchArchivedCategories();
      } else {
        toast.error(data.error || "Failed to reactivate category.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while reactivating category.");
    }
  };

  const handleReactivateSubcategory = async (subcategoryId: string) => {
    if (!confirm("Reactivate this subcategory?")) return;
    try {
      const res = await fetch(`/api/event-subcategories/${subcategoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await res.json();
      console.log("Reactivate subcategory response:", data);
      if (data.success) {
        toast.success(data.message || "Subcategory reactivated.");
        fetchArchivedCategories();
      } else {
        toast.error(data.error || "Failed to reactivate subcategory.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while reactivating subcategory.");
    }
  };

  return (
    <PageShell title="Archived Event Categories" breadcrumbs={breadcrumbs} showHomeIcon={false}>
      <Card className="p-4">
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500">No archived categories found.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="border rounded p-3 bg-white shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-gray-500">{category.categoryType ?? ""}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" onClick={() => handleReactivateCategory(category.id)}>
                      Reactivate
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
                            {sub.defaultPaidStatus} | Archived
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleReactivateSubcategory(sub.id)}
                        >
                          Reactivate
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
