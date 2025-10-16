"use client";

import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Eye, CheckCircle, RefreshCcw, AlertTriangle } from "lucide-react";
import type { ImportResult } from "../types";

interface ImportResultsCardProps {
  result: ImportResult;
}

const ImportResultsCardComponent = ({ result }: ImportResultsCardProps) => {
  const createdEmployees = result.created ?? [];
  const updatedEmployees = result.updated ?? [];
  const importErrors = result.errors ?? [];

  if (
    createdEmployees.length === 0 &&
    updatedEmployees.length === 0 &&
    importErrors.length === 0
  ) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Import Results
        </CardTitle>
        <CardDescription>
          Detailed results of the CSV import process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdEmployees.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Successfully Created ({createdEmployees.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {createdEmployees.map((employee, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-green-50 rounded border"
                >
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {employee.email}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Created</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {updatedEmployees.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-blue-600" />
              Updated ({updatedEmployees.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {updatedEmployees.map((employee, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-blue-50 rounded border"
                >
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {employee.email}
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Updated</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {importErrors.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Errors ({importErrors.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {importErrors.map((error, index) => (
                <div key={index} className="p-2 bg-red-50 rounded border">
                  <div className="font-medium text-red-800">Row {error.row}</div>
                  <ul className="text-sm text-red-700 mt-1">
                    {error.errors.map((err, errIndex) => (
                      <li key={errIndex} className="list-disc list-inside">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ImportResultsCard = memo(ImportResultsCardComponent);
