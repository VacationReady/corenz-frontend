"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, Eye, FileText, X, ChevronRight } from "lucide-react";
import { reportLibrary, type ReportLibraryEntry } from "@/lib/reportLibrary";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TemplateGalleryProps {
  onSelectTemplate: (template: ReportLibraryEntry | null) => void;
  onStartCustom?: () => void;
  showCustomOptions?: boolean;
}

export function TemplateGallery({
  onSelectTemplate,
  onStartCustom,
  showCustomOptions = false,
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [detailsModalTemplate, setDetailsModalTemplate] = useState<ReportLibraryEntry | null>(null);

  // Get unique categories from template library
  const templateCategories = useMemo(() => {
    const categories = new Set(reportLibrary.map((t) => t.category));
    return Array.from(categories).sort();
  }, []);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return reportLibrary.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Check if a field contains PII (simplified heuristic)
  const containsPII = (fields: string[]) => {
    const piiKeywords = ['email', 'phone', 'address', 'irdNumber', 'bankAccountNumber', 'licenceNumber'];
    return fields.some(field =>
      piiKeywords.some(keyword => field.toLowerCase().includes(keyword.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search report templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-glass bg-background py-2.5 pl-10 pr-4 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary",
              selectedCategory === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-glass bg-background hover:border-primary/40"
            )}
          >
            All Categories
          </button>
          {templateCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary",
                selectedCategory === category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-glass bg-background hover:border-primary/40"
              )}
            >
              {category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Template Gallery */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-glass bg-muted/30 py-12">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <h4 className="mb-1 text-sm font-semibold text-foreground">No templates found</h4>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search or category filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Blank Template Card */}
          {showCustomOptions && (
            <div
              className="group cursor-pointer rounded-2xl border border-glass bg-gradient-to-br from-background to-muted/30 p-5 transition hover:border-primary/40 hover:shadow-glass focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={onStartCustom}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onStartCustom?.();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="Create blank custom report"
            >
              <div className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <span className="text-2xl">⚡</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <h5 className="text-sm font-semibold text-foreground">Blank Template</h5>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Start from scratch with your own field selection
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-semibold text-primary">Custom</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Template Cards */}
          {filteredTemplates.map((template) => {
            const hasPII = containsPII(template.defaultFields);
            const isRecommended = ['annual-leave-balances', 'department-roster', 'new-starters'].includes(template.id);

            return (
              <div
                key={template.id}
                className="group relative cursor-pointer rounded-2xl border border-glass bg-gradient-to-br from-background to-muted/30 p-5 transition hover:border-primary/40 hover:shadow-glass focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => onSelectTemplate(template)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTemplate(template);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Use ${template.name} template`}
              >
                <div className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <span className="text-2xl">{template.icon}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsModalTemplate(template);
                      }}
                      className="rounded-lg p-1.5 opacity-0 transition hover:bg-muted/80 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label={`View details for ${template.name}`}
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <h5 className="text-sm font-semibold leading-tight text-foreground">
                      {template.name}
                    </h5>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {template.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {template.category.replace(/-/g, ' ')}
                    </Badge>
                    {isRecommended && (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
                        ⭐ Recommended
                      </Badge>
                    )}
                    {hasPII && (
                      <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]">
                        🔒 PII
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-glass pt-2.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold text-foreground">{template.defaultFields.length}</span> fields
                    </span>
                    {template.suggestedFilters && template.suggestedFilters.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Filter className="h-3 w-3" />
                        {template.suggestedFilters.length} filter{template.suggestedFilters.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Details Modal */}
      {detailsModalTemplate && (
        <TemplateDetailsModal
          template={detailsModalTemplate}
          onClose={() => setDetailsModalTemplate(null)}
          onUseTemplate={() => {
            onSelectTemplate(detailsModalTemplate);
            setDetailsModalTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Template Details Modal Component
function TemplateDetailsModal({
  template,
  onClose,
  onUseTemplate,
}: {
  template: ReportLibraryEntry;
  onClose: () => void;
  onUseTemplate: () => void;
}) {
  const containsPII = (fields: string[]) => {
    const piiKeywords = ['email', 'phone', 'address', 'irdNumber', 'bankAccountNumber', 'licenceNumber'];
    return fields.some(field =>
      piiKeywords.some(keyword => field.toLowerCase().includes(keyword.toLowerCase()))
    );
  };

  const hasPII = containsPII(template.defaultFields);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-glass bg-background shadow-glass"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-glass bg-background/95 backdrop-blur-sm px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <span className="text-2xl">{template.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-6">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {template.category.replace(/-/g, ' ')}
            </Badge>
            {hasPII && (
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs">
                🔒 Contains PII
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {template.engine}
            </Badge>
          </div>

          {/* Fields */}
          {template.defaultFields.length > 0 && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4" />
                Included Fields ({template.defaultFields.length})
              </h4>
              <div className="rounded-xl border border-glass bg-muted/30 p-4">
                <div className="flex flex-wrap gap-2">
                  {template.defaultFields.map((field, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center rounded-lg bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm"
                    >
                      {field.split('.').pop()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {template.suggestedFilters && template.suggestedFilters.length > 0 && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="h-4 w-4" />
                Pre-configured Filters ({template.suggestedFilters.length})
              </h4>
              <div className="space-y-2">
                {template.suggestedFilters.map((filter, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-glass bg-muted/30 px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium text-foreground">{filter.field}</span>
                    <span className="mx-2 text-muted-foreground">{filter.operator}</span>
                    <span className="text-muted-foreground">
                      {typeof filter.value === 'object'
                        ? JSON.stringify(filter.value)
                        : String(filter.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Sort */}
          {template.defaultSort && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="h-4 w-4" />
                Default Sorting
              </h4>
              <div className="rounded-xl border border-glass bg-muted/30 px-4 py-2.5 text-sm">
                <span className="font-medium text-foreground">{template.defaultSort.field}</span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="text-muted-foreground capitalize">{template.defaultSort.direction}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-glass bg-background/95 backdrop-blur-sm px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onUseTemplate} className="flex items-center gap-2">
            Use This Template
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
