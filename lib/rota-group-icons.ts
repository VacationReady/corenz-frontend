import {
  Factory,
  Warehouse,
  Store,
  Building2,
  Hospital,
  Package,
  Truck,
  HardHat,
  Wrench,
  Settings,
  Users,
  UserCheck,
  ClipboardList,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  Coffee,
  Utensils,
  ShoppingCart,
  Boxes,
  Container,
  Forklift,
  Hammer,
  Cog,
  Target,
  Shield,
  HeartPulse,
  Stethoscope,
  GraduationCap,
  Phone,
  Headphones,
  Monitor,
  Server,
  Plane,
  Car,
  Bus,
  Ship,
  LucideIcon,
} from "lucide-react";

export const ROTA_GROUP_ICONS: Record<string, LucideIcon> = {
  factory: Factory,
  warehouse: Warehouse,
  store: Store,
  building: Building2,
  hospital: Hospital,
  package: Package,
  truck: Truck,
  hardHat: HardHat,
  wrench: Wrench,
  settings: Settings,
  users: Users,
  userCheck: UserCheck,
  clipboard: ClipboardList,
  calendar: Calendar,
  clock: Clock,
  mapPin: MapPin,
  briefcase: Briefcase,
  coffee: Coffee,
  utensils: Utensils,
  shoppingCart: ShoppingCart,
  boxes: Boxes,
  container: Container,
  forklift: Forklift,
  hammer: Hammer,
  cog: Cog,
  target: Target,
  shield: Shield,
  heartPulse: HeartPulse,
  stethoscope: Stethoscope,
  graduationCap: GraduationCap,
  phone: Phone,
  headphones: Headphones,
  monitor: Monitor,
  server: Server,
  plane: Plane,
  car: Car,
  bus: Bus,
  ship: Ship,
};

export const DEFAULT_ROTA_GROUP_ICON_KEY = "warehouse";

export function getRotaGroupIcon(iconKey?: string | null): LucideIcon {
  if (iconKey && ROTA_GROUP_ICONS[iconKey]) {
    return ROTA_GROUP_ICONS[iconKey];
  }
  return ROTA_GROUP_ICONS[DEFAULT_ROTA_GROUP_ICON_KEY];
}

export const ROTA_GROUP_ICON_OPTIONS = Object.keys(ROTA_GROUP_ICONS).map((key) => ({
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1").trim(),
  Icon: ROTA_GROUP_ICONS[key],
}));

// Extended color palette for rota groups - similar to event-manager
export const ROTA_GROUP_COLORS = [
  // Blues
  { value: "#3B82F6", label: "Blue" },
  { value: "#2563EB", label: "Blue Dark" },
  { value: "#1D4ED8", label: "Blue Darker" },
  { value: "#0EA5E9", label: "Sky" },
  { value: "#06B6D4", label: "Cyan" },
  // Greens
  { value: "#10B981", label: "Emerald" },
  { value: "#059669", label: "Emerald Dark" },
  { value: "#22C55E", label: "Green" },
  { value: "#16A34A", label: "Green Dark" },
  { value: "#14B8A6", label: "Teal" },
  // Purples
  { value: "#6366F1", label: "Indigo" },
  { value: "#4F46E5", label: "Indigo Dark" },
  { value: "#8B5CF6", label: "Violet" },
  { value: "#7C3AED", label: "Violet Dark" },
  { value: "#A855F7", label: "Purple" },
  // Warm colors
  { value: "#F59E0B", label: "Amber" },
  { value: "#D97706", label: "Amber Dark" },
  { value: "#F97316", label: "Orange" },
  { value: "#EA580C", label: "Orange Dark" },
  { value: "#EF4444", label: "Red" },
  // Pinks
  { value: "#EC4899", label: "Pink" },
  { value: "#DB2777", label: "Pink Dark" },
  { value: "#F43F5E", label: "Rose" },
  { value: "#E11D48", label: "Rose Dark" },
  // Neutrals
  { value: "#64748B", label: "Slate" },
  { value: "#475569", label: "Slate Dark" },
  { value: "#71717A", label: "Zinc" },
  { value: "#52525B", label: "Zinc Dark" },
];
