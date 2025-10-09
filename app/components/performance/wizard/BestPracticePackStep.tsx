"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Check, Package, Sparkles, Info } from "lucide-react";
import { TemplateType, TemplateSection, TemplateQuestion } from "@/types/performance-templates";

interface BestPracticePackStepProps {
  templateType: TemplateType;
  selectedPackIds: string[];
  onSelect: (packIds: string[], sections: {
    title: string;
    description?: string;
    order: number;
    isRequired: boolean;
    questions: Omit<TemplateQuestion, "id" | "sectionId">[];
  }[]) => void;
}

// Mock best practice packs - in production, these would come from API
const BEST_PRACTICE_PACKS = {
  ONE_TO_ONE: [
    {
      id: "121-career-dev",
      name: "Career Development",
      description: "Questions focused on growth, learning, and career aspirations",
      sections: [
        {
          title: "Career Goals",
          description: "Discuss career aspirations and development",
          order: 0,
          isRequired: false,
          questions: [
            {
              question: "What are your career goals for the next 6-12 months?",
              type: "TEXTAREA" as const,
              order: 0,
              isRequired: true,
            },
            {
              question: "What skills would you like to develop?",
              type: "TEXTAREA" as const,
              order: 1,
              isRequired: true,
            },
          ],
        },
      ],
      tags: ["Career", "Development"],
    },
    {
      id: "121-wellbeing",
      name: "Wellbeing Check-in",
      description: "Focus on work-life balance and overall happiness",
      sections: [
        {
          title: "Wellbeing",
          description: "Check in on overall wellbeing",
          order: 0,
          isRequired: false,
          questions: [
            {
              question: "How are you feeling about your workload?",
              type: "RATING" as const,
              order: 0,
              isRequired: true,
              options: { min: 1, max: 5, labels: { 1: "Overwhelmed", 5: "Comfortable" } },
            },
          ],
        },
      ],
      tags: ["Wellbeing", "Work-Life Balance"],
    },
  ],
  THREE_SIXTY: [
    {
      id: "360-leadership",
      name: "Leadership Skills",
      description: "Comprehensive leadership assessment questions",
      sections: [
        {
          title: "Leadership Effectiveness",
          description: "Evaluate leadership capabilities",
          order: 0,
          isRequired: true,
          questions: [
            {
              question: "How effectively does this person communicate vision and goals?",
              type: "RATING" as const,
              order: 0,
              isRequired: true,
              options: { min: 1, max: 5 },
            },
            {
              question: "Provide examples of effective leadership you've observed",
              type: "TEXTAREA" as const,
              order: 1,
              isRequired: false,
            },
          ],
        },
      ],
      tags: ["Leadership", "Management"],
    },
    {
      id: "360-communication",
      name: "Communication Skills",
      description: "Assessment of communication effectiveness",
      sections: [
        {
          title: "Communication",
          description: "Evaluate communication skills",
          order: 0,
          isRequired: true,
          questions: [
            {
              question: "How would you rate their clarity in communication?",
              type: "RATING" as const,
              order: 0,
              isRequired: true,
              options: { min: 1, max: 5 },
            },
          ],
        },
      ],
      tags: ["Communication", "Collaboration"],
    },
  ],
  REVIEW_CYCLE: [
    {
      id: "cycle-goals",
      name: "Goal Setting",
      description: "Structure for setting and tracking performance goals",
      sections: [
        {
          title: "Performance Goals",
          description: "Define measurable objectives",
          order: 0,
          isRequired: true,
          questions: [
            {
              question: "List your top 3-5 goals for this review period",
              type: "TEXTAREA" as const,
              order: 0,
              isRequired: true,
            },
            {
              question: "How will you measure success for each goal?",
              type: "TEXTAREA" as const,
              order: 1,
              isRequired: true,
            },
          ],
        },
      ],
      tags: ["Goals", "OKRs"],
    },
    {
      id: "cycle-performance",
      name: "Performance Assessment",
      description: "Standard performance evaluation criteria",
      sections: [
        {
          title: "Performance Evaluation",
          description: "Assess overall performance",
          order: 0,
          isRequired: true,
          questions: [
            {
              question: "Overall performance rating",
              type: "RATING" as const,
              order: 0,
              isRequired: true,
              options: { min: 1, max: 5, labels: { 1: "Needs Improvement", 5: "Exceptional" } },
            },
            {
              question: "Key accomplishments this period",
              type: "TEXTAREA" as const,
              order: 1,
              isRequired: true,
            },
          ],
        },
      ],
      tags: ["Performance", "Evaluation"],
    },
  ],
};

export function BestPracticePackStep({
  templateType,
  selectedPackIds,
  onSelect,
}: BestPracticePackStepProps) {
  const packs = BEST_PRACTICE_PACKS[templateType as keyof typeof BEST_PRACTICE_PACKS] || [];

  const togglePack = (packId: string) => {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;

    const isSelected = selectedPackIds.includes(packId);
    
    if (isSelected) {
      // Remove pack
      onSelect(
        selectedPackIds.filter((id) => id !== packId),
        []
      );
    } else {
      // Add pack
      onSelect([...selectedPackIds, packId], pack.sections);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Best Practice Packs</CardTitle>
          <CardDescription>
            Import curated questions and sections to get started faster. You can edit or remove them in the next step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900">
                  <strong>Optional step:</strong> Skip this to build your template from scratch, or select packs to import pre-built content curated by HR experts.
                </p>
              </div>
            </div>
          </div>

          {/* Packs Grid */}
          {packs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No best practice packs available for this template type yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You can build your template from scratch in the next step.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {packs.map((pack) => {
                const isSelected = selectedPackIds.includes(pack.id);
                const totalQuestions = pack.sections.reduce(
                  (sum, section) => sum + section.questions.length,
                  0
                );

                return (
                  <button
                    key={pack.id}
                    onClick={() => togglePack(pack.id)}
                    className={`relative p-6 text-left rounded-lg border-2 transition-all hover:shadow-md ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 pr-8">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <h4 className="font-semibold">{pack.name}</h4>
                      </div>

                      <p className="text-sm text-muted-foreground">{pack.description}</p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {pack.sections.length} section{pack.sections.length !== 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span>
                          {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {pack.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Preview Sections */}
                      <div className="pt-3 border-t space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Includes:</p>
                        {pack.sections.map((section, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            • {section.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Skip Option */}
          {packs.length > 0 && selectedPackIds.length === 0 && (
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Or skip this step to build your template from scratch
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Summary */}
      {selectedPackIds.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Selected Packs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedPackIds.map((packId) => {
                const pack = packs.find((p) => p.id === packId);
                if (!pack) return null;

                const totalQuestions = pack.sections.reduce(
                  (sum, section) => sum + section.questions.length,
                  0
                );

                return (
                  <div key={packId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-medium">{pack.name}</span>
                      <span className="text-muted-foreground">
                        ({pack.sections.length} sections, {totalQuestions} questions)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePack(packId)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              These sections will be added to your template in the next step, where you can edit or remove them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
