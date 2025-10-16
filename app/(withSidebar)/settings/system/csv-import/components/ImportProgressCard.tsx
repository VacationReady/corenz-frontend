"use client";

import { memo, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";

interface ImportProgressCardProps {
  statusIcon: ReactNode;
  statusColor: string;
  message: string;
  progress: number;
  summaryLabel?: string;
  children?: ReactNode;
}

const ImportProgressCardComponent = ({
  statusIcon,
  statusColor,
  message,
  progress,
  summaryLabel,
  children,
}: ImportProgressCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {statusIcon}
          Import Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaryLabel && (
          <div className="text-sm text-muted-foreground">{summaryLabel}</div>
        )}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={statusColor}>{message}</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
        {children}
      </CardContent>
    </Card>
  );
};

export const ImportProgressCard = memo(ImportProgressCardComponent);
