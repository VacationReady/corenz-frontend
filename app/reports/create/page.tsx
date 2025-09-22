"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ReportsPage() {
  const REQUIRED_FIELDS = ["User.firstName", "User.lastName"];
  const [selectedFields, setSelectedFields] = useState<string[]>(REQUIRED_FIELDS);
  const [fieldGroups, setFieldGroups] = useState<
    Record<string, { label: string; value: string }[]>
  >({});

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await fetch("/api/fields");
        const data = await res.json();
        setFieldGroups(data);
      } catch (error) {
        console.error("Error fetching fields:", error);
      }
    };

    fetchFields();
  }, []);

  const handleFieldToggle = (field: string) => {
    if (REQUIRED_FIELDS.includes(field)) return; // cannot unselect required
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  };

  const handleNext = () => {
    if (selectedFields.length === 0) return;
    const params = new URLSearchParams();
    params.set("fields", selectedFields.join(","));
    window.location.href = `/reports/preview?${params.toString()}`;
  };

  const renderFieldGroup = (
    id: string,
    title: string,
    fields: { label: string; value: string }[],
  ) => (
    <AccordionItem value={id} key={id}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2">
          {fields.map((field) => (
            <label key={field.value} className="flex items-center gap-2">
              <Checkbox
                id={field.value}
                checked={selectedFields.includes(field.value)}
                onCheckedChange={() => handleFieldToggle(field.value)}
                disabled={REQUIRED_FIELDS.includes(field.value)}
              />
              <span>
                {field.label}
                {REQUIRED_FIELDS.includes(field.value) ? " (Required)" : ""}
              </span>
            </label>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Build a Custom Report</h1>
      <p className="mb-4">
        Select the fields you would like to include in your report:
      </p>

      {Object.keys(fieldGroups).length === 0 ? (
        <p>Loading fields...</p>
      ) : (
        <Accordion type="multiple" className="w-full space-y-2">
          {Object.entries(fieldGroups).map(([model, fields]) =>
            renderFieldGroup(
              model,
              `${model.charAt(0).toUpperCase() + model.slice(1)} Fields`,
              fields,
            ),
          )}
        </Accordion>
      )}

      <Button
        onClick={handleNext}
        disabled={selectedFields.length === 0}
        className="mt-4"
      >
        Next: Preview Report
      </Button>
    </main>
  );
}
