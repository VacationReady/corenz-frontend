// File: app/settings/event-manager/page.tsx

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Switch } from "@headlessui/react";
import { PlusIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AddCategoryModal from "@/components/AddCategoryModal";
import AddSubcategoryModal from "@/components/AddSubcategoryModal";
import { toast } from "react-hot-toast";

export default function EventManagerPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/event-categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const handleOpenAddSubcategory = (categoryId: string, categoryName: string) => {
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Event Manager</h1>
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Event Categories</h2>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="border rounded p-3 bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-gray-500">{category.categoryType ?? ""}</p>
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
                        checked={category[key]}
                        onChange={() => {}}
                        disabled={category.systemDefined}
                        className={cn(
                          category[key] ? "bg-green-500" : "bg-gray-300",
                          "relative inline-flex h-5 w-10 items-center rounded-full",
                          category.systemDefined ? "opacity-50 cursor-not-allowed" : ""
                        )}
                        title={category.systemDefined ? "System category, cannot edit" : ""}
                      >
                        <span
                          className={cn(
                            category[key] ? "translate-x-6" : "translate-x-1",
                            "inline-block h-4 w-4 transform rounded-full bg-white transition"
                          )}
                        />
                      </Switch>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="destructive"
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
                          {sub.defaultPaidStatus} | {sub.isActive ? "Active" : "Archived"}
                        </p>
                      </div>
                      <Button size="sm">Edit</Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    className="mt-2"
                    onClick={() => handleOpenAddSubcategory(category.id, category.name)}
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
    </div>
  );
}
