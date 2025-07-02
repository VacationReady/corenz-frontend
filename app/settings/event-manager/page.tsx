"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@headlessui/react";
import { PlusIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EventManagerPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Event Manager</h1>
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Event Categories</h2>
          <Button>
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
                  <p className="text-sm text-gray-500">{category.type}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">Requires Approval</span>
                    <Switch
                      checked={category.requiresApproval}
                      onChange={() => {}}
                      className={cn(
                        category.requiresApproval ? "bg-green-500" : "bg-gray-300",
                        "relative inline-flex h-5 w-10 items-center rounded-full"
                      )}
                    >
                      <span
                        className={cn(
                          category.requiresApproval ? "translate-x-6" : "translate-x-1",
                          "inline-block h-4 w-4 transform rounded-full bg-white transition"
                        )}
                      />
                    </Switch>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">Admin Only</span>
                    <Switch
                      checked={category.adminOnly}
                      onChange={() => {}}
                      className={cn(
                        category.adminOnly ? "bg-green-500" : "bg-gray-300",
                        "relative inline-flex h-5 w-10 items-center rounded-full"
                      )}
                    >
                      <span
                        className={cn(
                          category.adminOnly ? "translate-x-6" : "translate-x-1",
                          "inline-block h-4 w-4 transform rounded-full bg-white transition"
                        )}
                      />
                    </Switch>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm">Active</span>
                    <Switch
                      checked={category.isActive}
                      onChange={() => {}}
                      className={cn(
                        category.isActive ? "bg-green-500" : "bg-gray-300",
                        "relative inline-flex h-5 w-10 items-center rounded-full"
                      )}
                    >
                      <span
                        className={cn(
                          category.isActive ? "translate-x-6" : "translate-x-1",
                          "inline-block h-4 w-4 transform rounded-full bg-white transition"
                        )}
                      />
                    </Switch>
                  </div>
                  {category.name === "Sick Leave" && (
                    <button onClick={() => toggleExpand(category.id)}>
                      {expanded === category.id ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </button>
                  )}
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
                      <Button size="sm">
                        Edit
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="mt-2">
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Subcategory
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
