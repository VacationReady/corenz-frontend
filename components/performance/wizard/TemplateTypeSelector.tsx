"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  MessageSquare,
  UserCheck,
  Calendar,
  Award,
  Target,
  GitBranch,
  RefreshCw,
  Layers,
  Settings,
} from "lucide-react";
import { TemplateType, TEMPLATE_TYPE_INFO } from "@/types/performance-templates";

const ICON_MAP: Record<string, any> = {
  MessageSquare,
  UserCheck,
  Calendar,
  Award,
  Target,
  GitBranch,
  RefreshCw,
  Layers,
  Settings,
};

interface TemplateTypeSelectorProps {
  selectedType?: TemplateType;
  onSelect: (type: TemplateType) => void;
}

const FEATURED_TYPES: TemplateType[] = ["ONE_TO_ONE", "REVIEW_CYCLE", "THREE_SIXTY"];
const OTHER_TYPES: TemplateType[] = [
  "ANNUAL_REVIEW",
  "QUARTERLY_REVIEW",
  "MID_YEAR_REVIEW",
  "PROBATION_REVIEW",
  "PROJECT_RETROSPECTIVE",
  "CUSTOM",
];

export function TemplateTypeSelector({ selectedType, onSelect }: TemplateTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Choose Template Type</CardTitle>
          <CardDescription>
            Select the type of performance template you want to create. Each type comes with recommended settings and best practices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Featured Templates */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Most Popular</h3>
              <Badge variant="secondary" className="text-xs">Recommended</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {FEATURED_TYPES.map((type) => {
                const info = TEMPLATE_TYPE_INFO[type];
                const Icon = ICON_MAP[info.icon];
                const isSelected = selectedType === type;

                return (
                  <button
                    key={type}
                    onClick={() => onSelect(type)}
                    className={`relative p-6 text-left rounded-lg border-2 transition-all hover:border-primary hover:shadow-md ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
                          <MessageSquare className="h-3 w-3" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                            isSelected ? "bg-primary/10" : "bg-gray-100"
                          }`}
                        >
                          <Icon
                            className={`h-6 w-6 ${
                              isSelected ? "text-primary" : "text-gray-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-base mb-1">{info.label}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {info.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">When to use:</span> {info.whenToUse}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other Templates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Other Templates</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {OTHER_TYPES.map((type) => {
                const info = TEMPLATE_TYPE_INFO[type];
                const Icon = ICON_MAP[info.icon];
                const isSelected = selectedType === type;

                return (
                  <button
                    key={type}
                    onClick={() => onSelect(type)}
                    className={`p-4 text-left rounded-lg border transition-all hover:border-primary hover:shadow-sm ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
                          isSelected ? "bg-primary/10" : "bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isSelected ? "text-primary" : "text-gray-600"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1">{info.label}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Template Info */}
      {selectedType && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Selected: {TEMPLATE_TYPE_INFO[selectedType].label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {TEMPLATE_TYPE_INFO[selectedType].whenToUse}
                </p>
              </div>
              
              {TEMPLATE_TYPE_INFO[selectedType].defaultReviewers && (
                <div>
                  <p className="text-xs font-medium mb-2">Default reviewers for this type:</p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_TYPE_INFO[selectedType].defaultReviewers?.map((reviewer) => (
                      <Badge key={reviewer} variant="secondary" className="text-xs">
                        {reviewer.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
