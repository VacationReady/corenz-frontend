import {
  Sun,
  Umbrella,
  Stethoscope,
  Plane,
  HeartPulse,
  Calendar,
  Clock,
  Briefcase,
  Home,
  User,
  Star,
  AlertCircle,
  Baby,
  GraduationCap,
  Palmtree,
  Thermometer,
  Pill,
  Syringe,
  LucideIcon,
} from "lucide-react";

export const EVENT_CATEGORY_ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  umbrella: Umbrella,
  stethoscope: Stethoscope,
  plane: Plane,
  heartPulse: HeartPulse,
  calendar: Calendar,
  clock: Clock,
  briefcase: Briefcase,
  home: Home,
  user: User,
  star: Star,
  alertCircle: AlertCircle,
  baby: Baby,
  graduationCap: GraduationCap,
  palmtree: Palmtree,
  thermometer: Thermometer,
  pill: Pill,
  syringe: Syringe,
};

export const DEFAULT_ICON_KEY = "calendar";

export function getEventCategoryIcon(iconKey?: string | null): LucideIcon {
  if (iconKey && EVENT_CATEGORY_ICONS[iconKey]) {
    return EVENT_CATEGORY_ICONS[iconKey];
  }
  return EVENT_CATEGORY_ICONS[DEFAULT_ICON_KEY];
}

export const ICON_OPTIONS = Object.keys(EVENT_CATEGORY_ICONS).map((key) => ({
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1").trim(),
  Icon: EVENT_CATEGORY_ICONS[key],
}));

