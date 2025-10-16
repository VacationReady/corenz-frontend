"use client";

import { memo, type ChangeEvent, type RefObject } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, AlertTriangle, RefreshCcw } from "lucide-react";
import type { CSVImportDomainConfig } from "@/lib/csv-import/types";
import type { ImportType } from "../types";

interface FileUploadCardProps {
  domain: CSVImportDomainConfig;
  selectedImportType: ImportType;
  selectedFile: File | null;
  validationErrors: string[];
  allowUpdates: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAllowUpdatesChange: (checked: boolean) => void;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onResetUpload: () => void;
  disableActions: boolean;
}

const FileUploadCardComponent = ({
  domain,
  selectedImportType,
  selectedFile,
  validationErrors,
  allowUpdates,
  fileInputRef,
  onAllowUpdatesChange,
  onFileSelect,
  onImport,
  onResetUpload,
  disableActions,
}: FileUploadCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload CSV File
        </CardTitle>
        <CardDescription>
          Select a CSV file containing {domain.label.toLowerCase()} data to import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="csv-file">CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={onFileSelect}
            ref={fileInputRef}
            disabled={disableActions}
          />
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {selectedImportType === "employees" && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 space-y-3">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Existing employee updates</h4>
              <p className="text-xs text-muted-foreground">
                Enable this option to merge new personal, employment, and payroll details for people who already exist in PeopleCore.
              </p>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="allow-updates" className="text-sm font-medium">
                  Allow updates for existing employees
                </Label>
                <p className="text-xs text-muted-foreground">
                  Matching emails will be updated while new rows are created as usual.
                </p>
              </div>
              <Switch
                id="allow-updates"
                checked={allowUpdates}
                onCheckedChange={checked => onAllowUpdatesChange(Boolean(checked))}
                disabled={disableActions}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={onImport}
            disabled={disableActions || !selectedFile || validationErrors.length > 0}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import {domain.label}
          </Button>

          <Button type="button" variant="outline" disabled={!selectedFile} onClick={onResetUpload}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const FileUploadCard = memo(FileUploadCardComponent);
