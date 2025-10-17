"use client";

import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import type { CSVImportDomainConfig, CSVImportIconName, CSVImportTemplate } from "@/lib/csv-import/types";
import type { CSVImportDomainId } from "@/lib/csv-import/domains";
import { renderDomainIcon } from "./icon-map";

interface ImportTypeOption {
  value: CSVImportDomainId;
  label: string;
  icon: CSVImportIconName;
}

interface ImportTypeSelectorProps {
  options: ImportTypeOption[];
  value: CSVImportDomainId;
  onChange: (value: CSVImportDomainId) => void;
  selectedConfig: CSVImportDomainConfig;
  selectedTemplate?: CSVImportTemplate;
}

const ImportTypeSelectorComponent = ({
  options,
  value,
  onChange,
  selectedConfig,
  selectedTemplate,
}: ImportTypeSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {renderDomainIcon(selectedConfig.icon, "h-5 w-5")}
          Select Import Type
        </CardTitle>
        <CardDescription>Choose the type of data you want to import</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="import-type">Import Type</Label>
          <Select value={value} onValueChange={(nextValue: CSVImportDomainId) => onChange(nextValue)}>
            <SelectTrigger id="import-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {renderDomainIcon(option.icon, "h-4 w-4")}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            {renderDomainIcon(selectedConfig.icon, "h-10 w-10 text-primary")}
            <div className="flex-1 space-y-2">
              <div>
                <h4 className="font-medium">{selectedConfig.label}</h4>
                <p className="text-sm text-muted-foreground">{selectedConfig.description}</p>
                {selectedTemplate?.description && (
                  <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  <strong>Dependencies:</strong> {selectedConfig.dependencies ?? "None"}
                </span>
                {selectedTemplate?.templateFile && (
                  <span>
                    <strong>Template file:</strong> {selectedTemplate.templateFile}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ImportTypeSelector = memo(ImportTypeSelectorComponent);
