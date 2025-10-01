"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Plus,
  Star,
  Clock,
  CheckCircle2,
  Eye,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowAppStoreProps {
  onPreviewWorkflow: (templateId: string) => void;
  onInstallWorkflow: (templateId: string) => void;
  onCreateCustom: () => void;
}

export function WorkflowAppStore({
  onPreviewWorkflow,
  onInstallWorkflow,
  onCreateCustom,
}: WorkflowAppStoreProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/automation-rules/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        setCategories(data.categories || []);
        
        // Expand first category by default
        if (data.categories?.[0]) {
          setExpandedCategories({ [data.categories[0].id]: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || t.category?.id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getTemplatesByCategory = (categoryId: string) => {
    return filteredTemplates.filter(t => t.category?.id === categoryId);
  };

  const popularTemplates = filteredTemplates.filter(t => t.isPopular).slice(0, 6);
  const installedCount = templates.filter(t => t.isInstalled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Loading workflow store...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">60 Ready-to-Use Automation Workflows</span>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          HR Automation App Store
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          No-code workflows that save hours of manual work. Install instantly or customize to fit your needs.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">{installedCount} Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">{templates.length} Available</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">{popularTemplates.length} Popular</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search workflows by name, category, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base bg-white border-2 focus:border-blue-400 shadow-sm"
          />
        </div>
      </div>

      {/* Popular Workflows */}
      {!searchQuery && popularTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-2xl font-bold">Most Popular</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTemplates.map((template) => (
              <WorkflowCard
                key={template.id}
                template={template}
                onPreview={() => onPreviewWorkflow(template.id)}
                onInstall={() => onInstallWorkflow(template.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Custom CTA */}
      <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 via-white to-purple-50 hover:border-blue-400 transition-all cursor-pointer group"
        onClick={onCreateCustom}
      >
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">Create Custom Workflow</h3>
          <p className="text-muted-foreground mb-4">
            Build your own automation from scratch with our visual workflow builder
          </p>
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Sparkles className="w-4 h-4 mr-2" />
            Start Building
          </Button>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryTemplates = getTemplatesByCategory(category.id);
          if (categoryTemplates.length === 0) return null;

          const isExpanded = expandedCategories[category.id];
          const colorMap: Record<string, string> = {
            blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
            green: "from-green-50 to-green-100 border-green-200 text-green-900",
            purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-900",
            amber: "from-amber-50 to-amber-100 border-amber-200 text-amber-900",
            red: "from-red-50 to-red-100 border-red-200 text-red-900",
            pink: "from-pink-50 to-pink-100 border-pink-200 text-pink-900",
            orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-900",
            emerald: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900",
          };
          const colorClasses = colorMap[category.color as string] || "from-gray-50 to-gray-100 border-gray-200 text-gray-900";

          return (
            <div key={category.id} className="space-y-3">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 bg-gradient-to-r transition-all hover:shadow-md",
                  colorClasses,
                  isExpanded && "shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div className="text-left">
                    <h2 className="text-xl font-bold">{category.name}</h2>
                    <p className="text-sm opacity-80">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-white/80 px-3">
                    {categoryTemplates.length} workflows
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Category Content */}
              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                  {categoryTemplates.map((template) => (
                    <WorkflowCard
                      key={template.id}
                      template={template}
                      onPreview={() => onPreviewWorkflow(template.id)}
                      onInstall={() => onInstallWorkflow(template.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No workflows found</h3>
          <p className="text-muted-foreground">Try a different search term</p>
        </div>
      )}
    </div>
  );
}

function WorkflowCard({
  template,
  onPreview,
  onInstall,
}: {
  template: any;
  onPreview: () => void;
  onInstall: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className={cn(
        "group hover:shadow-xl transition-all duration-300 border-2 overflow-hidden",
        template.isInstalled 
          ? "border-green-200 bg-gradient-to-br from-green-50/50 to-white" 
          : "border-gray-200 hover:border-blue-300 bg-white"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
              {template.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                {template.name}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            </div>
          </div>
          {template.isPremium && (
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 flex-shrink-0">
              ✨ Premium
            </Badge>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {template.tags?.slice(0, 3).map((tag: string) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 border-0"
            >
              {tag}
            </Badge>
          ))}
          {template.tags?.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 border-0">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Benefits */}
        {template.benefits && isHovered && (
          <div className="space-y-1 pt-2 border-t">
            {template.benefits.slice(0, 2).map((benefit: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        )}

        {/* Meta Info */}
        {template.estimatedTime && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Saves ~{template.estimatedTime}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {template.isInstalled ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                onClick={onPreview}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Badge className="px-3 py-2 bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Installed
              </Badge>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onPreview}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={onInstall}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

