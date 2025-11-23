"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { reportLibrary, type ReportLibraryEntry } from "@/lib/reportLibrary";
import { cn } from "@/lib/utils";

interface TemplateGalleryProps {
  onSelectTemplate: (template: ReportLibraryEntry) => void;
  onStartCustom?: () => void;
  showCustomOptions?: boolean;
}

// Simple Badge component to avoid import issues
const Badge = ({ variant = "default", className, children, ...props }: any) => (
  <div
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
      variant === "default" ? "bg-primary text-primary-foreground" : 
      variant === "secondary" ? "bg-secondary text-secondary-foreground" :
      "border-border bg-background",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export default function TemplateGallery({
  onSelectTemplate,
  onStartCustom,
  showCustomOptions = false,
}: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get unique categories from reportLibrary
  const categories = Array.from(new Set(reportLibrary.map((t: ReportLibraryEntry) => t.category)));

  const filteredTemplates =
    selectedCategory === "all"
      ? reportLibrary
      : reportLibrary.filter((t: ReportLibraryEntry) => t.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center gap-2 pb-2">
        <Badge
          variant={selectedCategory === "all" ? "default" : "outline"}
          className="cursor-pointer hover:bg-primary/90 transition-colors"
          onClick={() => setSelectedCategory("all")}
        >
          All Templates
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/90 transition-colors"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        ))}
      </div>

      {/* Horizontal Scrolling Template Carousel */}
      <div className="relative">
        {/* Gradient fade on edges */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-background to-transparent" />
        
        <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-border/80">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="group relative flex min-w-[280px] flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-lg hover:scale-[1.02]"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-2xl">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {template.name}
                  </h3>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {template.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
            </button>
          ))}

          {/* Custom Report Option */}
          {showCustomOptions && (
            <button
              onClick={() => onStartCustom && onStartCustom()}
              className="group relative flex min-w-[280px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-6 text-center transition-all hover:border-primary hover:bg-accent hover:scale-[1.02]"
            >
              <div className="rounded-full bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Custom Report</h3>
                <p className="mt-1 text-sm text-muted-foreground">Build from scratch</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
