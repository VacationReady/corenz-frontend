"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Search,
  Filter,
  Plus,
  Users,
  Clock,
  Target,
  Sparkles,
  Play,
  Pause,
  Archive,
  MoreHorizontal,
  Copy,
  Edit,
  Trash2,
  Star,
  Globe,
  Building,
  GraduationCap,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface JourneyTemplate {
  id: string;
  name: string;
  description?: string;
  persona?: string;
  duration?: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  category?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  phases: any[];
  metricBindings: any[];
  experiments: any[];
}

interface JourneyLibraryPanelProps {
  journeys: JourneyTemplate[];
  selectedJourney: JourneyTemplate | null;
  onJourneySelect: (journey: JourneyTemplate) => void;
  onCreateJourney: () => void;
  loading: boolean;
}

const JOURNEY_CATEGORIES = [
  { id: "onboarding", name: "Onboarding", icon: <UserCheck className="w-4 h-4" />, color: "bg-green-100 text-green-800" },
  { id: "development", name: "Development", icon: <TrendingUp className="w-4 h-4" />, color: "bg-blue-100 text-blue-800" },
  { id: "training", name: "Training", icon: <GraduationCap className="w-4 h-4" />, color: "bg-purple-100 text-purple-800" },
  { id: "offboarding", name: "Offboarding", icon: <Archive className="w-4 h-4" />, color: "bg-gray-100 text-gray-800" },
  { id: "performance", name: "Performance", icon: <Target className="w-4 h-4" />, color: "bg-orange-100 text-orange-800" },
];

const PERSONA_FILTERS = [
  "New Hire",
  "Manager",
  "Senior Engineer",
  "Executive",
  "Remote Worker",
  "Intern",
  "Contractor",
];

export function JourneyLibraryPanel({
  journeys,
  selectedJourney,
  onJourneySelect,
  onCreateJourney,
  loading,
}: JourneyLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPersona, setSelectedPersona] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter journeys based on search and filters
  const filteredJourneys = useMemo(() => {
    let filtered = [...journeys];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(journey =>
        journey.name.toLowerCase().includes(query) ||
        journey.description?.toLowerCase().includes(query) ||
        journey.persona?.toLowerCase().includes(query) ||
        journey.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(journey => journey.category === selectedCategory);
    }

    // Persona filter
    if (selectedPersona !== "all") {
      filtered = filtered.filter(journey => journey.persona === selectedPersona);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(journey => journey.status === statusFilter);
    }

    return filtered;
  }, [journeys, searchQuery, selectedCategory, selectedPersona, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <Play className="w-3 h-3" />;
      case "DRAFT":
        return <Edit className="w-3 h-3" />;
      case "ARCHIVED":
        return <Archive className="w-3 h-3" />;
      default:
        return <Pause className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-100 text-green-800 border-green-200";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const renderJourneyCard = (journey: JourneyTemplate) => {
    const isSelected = selectedJourney?.id === journey.id;
    const category = JOURNEY_CATEGORIES.find(c => c.id === journey.category);

    return (
      <div
        key={journey.id}
        onClick={() => onJourneySelect(journey)}
        className={cn(
          "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
          isSelected
            ? "border-primary bg-primary/5 shadow-md"
            : "border-gray-200 hover:border-gray-300"
        )}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{journey.name}</h3>
              {journey.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {journey.description}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn("ml-2 text-xs", getStatusColor(journey.status))}
            >
              {getStatusIcon(journey.status)}
              <span className="ml-1">{journey.status}</span>
            </Badge>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {category && (
              <div className={cn("flex items-center gap-1 px-2 py-1 rounded-md", category.color)}>
                {category.icon}
                <span>{category.name}</span>
              </div>
            )}
            {journey.persona && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{journey.persona}</span>
              </div>
            )}
            {journey.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{journey.duration}d</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {journey.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {journey.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                  {tag}
                </Badge>
              ))}
              {journey.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  +{journey.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>v{journey.version}</span>
            <span>{formatDistanceToNow(journey.updatedAt, { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Journey Library</h2>
          <Button size="sm" onClick={onCreateJourney}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search journeys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
            <TabsTrigger value="components" className="text-xs">Components</TabsTrigger>
            <TabsTrigger value="signals" className="text-xs">Signals</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {JOURNEY_CATEGORIES.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedPersona} onValueChange={setSelectedPersona}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Persona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Personas</SelectItem>
            {PERSONA_FILTERS.map(persona => (
              <SelectItem key={persona} value={persona}>
                {persona}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} className="h-full">
          <TabsContent value="templates" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))
                ) : filteredJourneys.length > 0 ? (
                  filteredJourneys.map(renderJourneyCard)
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="font-medium mb-2">No journeys found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery || selectedCategory !== "all" || selectedPersona !== "all"
                        ? "Try adjusting your filters"
                        : "Create your first journey template"}
                    </p>
                    <Button size="sm" onClick={onCreateJourney}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Journey
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="components" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="text-center py-8">
                  <Building className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-2">Experience Components</h3>
                  <p className="text-sm text-muted-foreground">
                    Reusable building blocks for your journeys
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="signals" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium mb-2">Engagement Signals</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor journey performance and participant feedback
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
