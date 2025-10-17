"use client";

import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { Download, Info, ListChecks } from "lucide-react";
import type { CSVImportDomainConfig, CSVImportTemplate } from "@/lib/csv-import/types";

interface ImportInstructionsCardProps {
  domain: CSVImportDomainConfig;
  template?: CSVImportTemplate;
  importSequence: Array<{ label: string; value: string }>;
  activeImportType: string;
}

const ImportInstructionsCardComponent = ({
  domain,
  template,
  importSequence,
  activeImportType,
}: ImportInstructionsCardProps) => {
  const keyNotes = template?.keyNotes ?? [];
  const quickStartSequence = importSequence.map(step => step.label).join(" \u2192 ");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Import Instructions
        </CardTitle>
        <CardDescription>
          Follow these steps to import {domain.label.toLowerCase()} data via CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Download className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Quick Start</h4>
              <p className="text-sm text-blue-700 mb-2">
                New to CSV imports? Use the "Download All" button above to get all templates at once with detailed instructions.
              </p>
              <p className="text-xs text-blue-600">
                Includes: {quickStartSequence} (in correct order)
              </p>
            </div>
          </div>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">1</span>
            </div>
            <div>
              <h4 className="font-medium">Download Template</h4>
              <p className="text-sm text-muted-foreground">Get the CSV template with all required fields</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">2</span>
            </div>
            <div>
              <h4 className="font-medium">Fill Data</h4>
              <p className="text-sm text-muted-foreground">
                Add {domain.label.toLowerCase()} information to the CSV file
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">3</span>
            </div>
            <div>
              <h4 className="font-medium">Upload File</h4>
              <p className="text-sm text-muted-foreground">Select and upload your completed CSV file</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">4</span>
            </div>
            <div>
              <h4 className="font-medium">Review & Import</h4>
              <p className="text-sm text-muted-foreground">Review validation results and complete import</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Recommended import order
          </h4>
          <div className="flex flex-wrap gap-2 mt-3">
            {importSequence.map((step, index) => (
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
      </CardContent>
    </Card>
  );
};

export const ImportInstructionsCard = memo(ImportInstructionsCardComponent);
