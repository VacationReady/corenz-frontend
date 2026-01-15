"use client";

import { useState, useEffect, useMemo, type ChangeEvent } from "react";
import { Search, Workflow, Users, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

interface JourneyTemplate {
  id: string;
  name: string;
  description: string | null;
  persona: string | null;
  duration: number | null;
  category: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdBy: string;
  companyId: string;
  Creator?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  _count?: {
    instances: number;
  };
}

interface JourneyTemplatePickerProps {
  value: string;
  onChange: (journeyTemplateId: string) => void;
  tenantId?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function JourneyTemplatePicker({
  value,
  onChange,
  tenantId,
  disabled = false,
  placeholder = "Select a journey template...",
}: JourneyTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [journeys, setJourneys] = useState<JourneyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch journey templates
  useEffect(() => {
    if (!open) return;

    const fetchJourneys = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (tenantId) {
          // Note: The API already filters by companyId from session
          // This is just for client-side display/validation
        }

        const response = await fetch(`/api/journeys?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch journey templates");
        }

        const data = await response.json();
        setJourneys(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching journeys:", err);
        setError(err instanceof Error ? err.message : "Failed to load journey templates");
        setJourneys([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJourneys();
  }, [open, tenantId]);

  // Filter journeys based on search query
  const filteredJourneys = useMemo(() => {
    if (!searchQuery.trim()) {
      return journeys;
    }

    const query = searchQuery.toLowerCase();
    return journeys.filter((journey) => {
      return (
        journey.name.toLowerCase().includes(query) ||
        journey.description?.toLowerCase().includes(query) ||
        journey.persona?.toLowerCase().includes(query) ||
        journey.category?.toLowerCase().includes(query) ||
        journey.Creator?.name?.toLowerCase().includes(query)
      );
    });
  }, [journeys, searchQuery]);

  // Get selected journey details
  const selectedJourney = useMemo(() => {
    return journeys.find((j) => j.id === value);
  }, [journeys, value]);

  const handleSelect = (journeyId: string) => {
    onChange(journeyId);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = () => {
    onChange("");
    setSearchQuery("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={selectedJourney ? selectedJourney.name : value || ""}
            placeholder={placeholder}
            onClick={() => !disabled && setOpen(true)}
            readOnly
            disabled={disabled}
            className="cursor-pointer"
          />
        </div>
        {value && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            aria-label="Clear selection"
          >
            Clear
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-label="Browse journey templates"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {value && selectedJourney && (
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {selectedJourney.status}
            </Badge>
            {selectedJourney.persona && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {selectedJourney.persona}
              </span>
            )}
            {selectedJourney.duration && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {selectedJourney.duration} days
              </span>
            )}
          </div>
          {selectedJourney.Creator && (
            <div className="text-gray-500">
              Owner: {selectedJourney.Creator.name?.trim() ? (
                <>
                  {selectedJourney.Creator.name.trim()}
                  {selectedJourney.Creator.email && (
                    <span className="text-gray-400 ml-1">({selectedJourney.Creator.email})</span>
                  )}
                </>
              ) : (
                selectedJourney.Creator.email || 'Unknown'
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Journey Template</DialogTitle>
            <DialogDescription>
              Choose an automation journey template. Only templates from your tenant are shown.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search by name, persona, category, or owner..."
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Journey List */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              ) : filteredJourneys.length === 0 ? (
                <div className="p-8 text-center">
                  <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">
                    {searchQuery
                      ? "No journey templates match your search"
                      : "No journey templates available"}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Create journey templates in the Journey Designer first
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredJourneys.map((journey) => (
                    <button
                      key={journey.id}
                      type="button"
                      onClick={() => handleSelect(journey.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        value === journey.id ? "bg-blue-50 hover:bg-blue-100" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{journey.name}</h3>
                            {value === journey.id && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>

                          {journey.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {journey.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge
                              variant={
                                journey.status === "PUBLISHED"
                                  ? "default"
                                  : journey.status === "DRAFT"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {journey.status}
                            </Badge>

                            {journey.category && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Workflow className="w-3 h-3" />
                                {journey.category}
                              </span>
                            )}

                            {journey.persona && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {journey.persona}
                              </span>
                            )}

                            {journey.duration && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {journey.duration} days
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            {journey.Creator && (
                              <span>
                                Owner: {journey.Creator.name?.trim() ? (
                                  <>
                                    {journey.Creator.name.trim()}
                                    {journey.Creator.email && (
                                      <span className="text-gray-400 ml-1">({journey.Creator.email})</span>
                                    )}
                                  </>
                                ) : (
                                  journey.Creator.email || 'Unknown'
                                )}
                              </span>
                            )}
                            {journey._count && journey._count.instances > 0 && (
                              <span className="ml-3">
                                • {journey._count.instances} active instance
                                {journey._count.instances !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Validation Warning */}
            {!loading && filteredJourneys.length > 0 && (
              <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <strong>Note:</strong> Only journey templates from your tenant are shown. Cross-tenant
                leakage is prevented by server-side validation.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
