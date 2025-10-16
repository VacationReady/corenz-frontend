"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ListChecks, FileText } from "lucide-react";
import type { CSVImportDomainConfig } from "@/lib/csv-import/types";
import { renderDomainIcon } from "./icon-map";

interface TemplateGuidanceProps {
  config: CSVImportDomainConfig;
  importOrder: Array<{ label: string; value: string }>;
  activeImportType: string;
}

const TemplateGuidanceComponent = ({ config, importOrder, activeImportType }: TemplateGuidanceProps) => {
  const template =
    config.templates.find(candidate => candidate.id === config.defaultTemplateId) ?? config.templates[0];

  if (!template) {
    return null;
  }

  const keyNotes = template.keyNotes ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {renderDomainIcon(config.icon)}
          {config.label} Guidance
        </CardTitle>
        <CardDescription>
          Follow these steps to import {config.label.toLowerCase()} data via CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keyNotes.length > 0 && (
          <Alert className="border-primary/20 bg-primary/5">
            <AlertTitle>Implementation notes</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {keyNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="border rounded-lg p-4">
          <h4 className="font-medium flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Recommended import order
          </h4>
          <div className="flex flex-wrap gap-2 mt-3">
            {importOrder.map((step, index) => (
              <Badge
                key={step.value}
                variant={step.value === activeImportType ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <span className="text-xs font-semibold">{index + 1}</span>
                {step.label}
              </Badge>
            ))}
          </div>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Template Field Blueprint
            </CardTitle>
            <CardDescription>
              Complete list of fields that can be imported for {config.label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {template.fieldGroups.map(group => (
                <div key={group.title} className="border rounded-lg p-4 bg-muted/40 space-y-3">
                  <div>
                    <h5 className="font-medium">{group.title}</h5>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {group.fields.map(field => (
                      <li key={field.key} className="rounded-md border bg-background/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{field.label}</span>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide ${
                              field.required ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {field.required ? "Required" : "Optional"}
                          </span>
                        </div>
                        {field.note && (
                          <p className="text-xs text-muted-foreground mt-1">{field.note}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export const TemplateGuidance = memo(TemplateGuidanceComponent);
