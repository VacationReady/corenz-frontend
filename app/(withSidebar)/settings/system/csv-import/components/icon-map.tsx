'use client';

import type { LucideIcon } from "lucide-react";
import {
  Building,
  Users,
  Clock,
  DollarSign,
  Shield,
  GraduationCap,
} from "lucide-react";
import type { CSVImportIconName } from "@/lib/csv-import/types";

const ICON_MAP: Record<CSVImportIconName, LucideIcon> = {
  building: Building,
  users: Users,
  clock: Clock,
  "dollar-sign": DollarSign,
  shield: Shield,
  "graduation-cap": GraduationCap,
};

export const getDomainIconComponent = (name: CSVImportIconName): LucideIcon => {
  return ICON_MAP[name] ?? Users;
};

export const renderDomainIcon = (name: CSVImportIconName, className?: string) => {
  const Icon = getDomainIconComponent(name);
  return <Icon className={className ?? "h-5 w-5"} />;
};
