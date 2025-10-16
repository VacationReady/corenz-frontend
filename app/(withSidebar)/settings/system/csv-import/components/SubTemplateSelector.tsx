"use client";

import { memo } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { CSVImportSubTemplate } from "@/lib/csv-import/types";

interface SubTemplateSelectorProps {
  subTemplates: CSVImportSubTemplate[];
  selectedSubTemplates: string[];
  defaultSelectedSubTemplates: string[];
  onSelectionChange: (nextSelected: string[]) => void;
}

const SubTemplateSelectorComponent = ({
  subTemplates,
  selectedSubTemplates,
  defaultSelectedSubTemplates,
  onSelectionChange,
}: SubTemplateSelectorProps) => {
  const handleToggle = (id: string, checked: CheckedState) => {
    const shouldSelect = checked === true;
    if (shouldSelect) {
      if (selectedSubTemplates.includes(id)) {
        return;
      }
      onSelectionChange([...selectedSubTemplates, id]);
      return;
    }

    if (!selectedSubTemplates.includes(id)) {
      return;
    }

    onSelectionChange(selectedSubTemplates.filter(subTemplateId => subTemplateId !== id));
  };

  const handleSelectAll = () => {
    onSelectionChange(subTemplates.map(subTemplate => subTemplate.id));
  };

  const handleResetDefaults = () => {
    if (defaultSelectedSubTemplates.length > 0) {
      onSelectionChange(defaultSelectedSubTemplates);
      return;
    }

    onSelectionChange(subTemplates.map(subTemplate => subTemplate.id));
  };

  const hasSelection = selectedSubTemplates.length > 0;
  const summaryLabels = subTemplates
    .filter(subTemplate => selectedSubTemplates.includes(subTemplate.id))
    .map(subTemplate => subTemplate.label);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Template scope
        </CardTitle>
        <CardDescription>
          Choose which sections of the template you want to download and import.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {summaryLabels.length === 0 ? (
            <Badge variant="outline">No sections selected</Badge>
          ) : (
            summaryLabels.map(label => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {subTemplates.map(subTemplate => {
            const isChecked = selectedSubTemplates.includes(subTemplate.id);
            return (
              <label
                key={subTemplate.id}
                htmlFor={`sub-template-${subTemplate.id}`}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:border-primary ${
                  isChecked ? "border-primary bg-primary/5" : "border-muted"
                }`}
              >
                <Checkbox
                  id={`sub-template-${subTemplate.id}`}
                  checked={isChecked}
                  onCheckedChange={checked => handleToggle(subTemplate.id, checked)}
                />
                <div className="space-y-1">
                  <p className="font-medium">{subTemplate.label}</p>
                  <p className="text-sm text-muted-foreground">{subTemplate.description}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleSelectAll}>
            Select all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleResetDefaults}
            disabled={!hasSelection && defaultSelectedSubTemplates.length === 0}
          >
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const SubTemplateSelector = memo(SubTemplateSelectorComponent);
