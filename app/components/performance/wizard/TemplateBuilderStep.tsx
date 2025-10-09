"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  List,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TemplateType, TemplateSection, QuestionType } from "@/types/performance-templates";

interface TemplateBuilderStepProps {
  templateType: TemplateType;
  name: string;
  description: string;
  sections: Omit<TemplateSection, "id" | "templateId">[];
  onChange: (data: {
    name?: string;
    description?: string;
    sections?: Omit<TemplateSection, "id" | "templateId">[];
  }) => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "TEXT", label: "Short Text" },
  { value: "TEXTAREA", label: "Long Text" },
  { value: "RATING", label: "Rating Scale" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "YES_NO", label: "Yes/No" },
  { value: "DATE", label: "Date" },
  { value: "NUMBER", label: "Number" },
];

export function TemplateBuilderStep({
  templateType,
  name,
  description,
  sections,
  onChange,
}: TemplateBuilderStepProps) {
  const [expandedSections, setExpandedSections] = useState<number[]>([0]);

  const toggleSection = (index: number) => {
    setExpandedSections((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const addSection = () => {
    const newSection = {
      title: `Section ${sections.length + 1}`,
      description: "",
      order: sections.length,
      isRequired: false,
      questions: [],
    };
    onChange({ sections: [...sections, newSection] });
    setExpandedSections([...expandedSections, sections.length]);
  };

  const removeSection = (index: number) => {
    const newSections = sections.filter((_, i) => i !== index);
    onChange({ sections: newSections });
    setExpandedSections(expandedSections.filter((i) => i !== index));
  };

  const updateSection = (
    index: number,
    updates: Partial<Omit<TemplateSection, "id" | "templateId">>
  ) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    onChange({ sections: newSections });
  };

  const addQuestion = (sectionIndex: number) => {
    const newSections = [...sections];
    const newQuestion = {
      question: "",
      description: "",
      type: "TEXT" as QuestionType,
      order: newSections[sectionIndex].questions.length,
      isRequired: false,
    };
    newSections[sectionIndex].questions.push(newQuestion);
    onChange({ sections: newSections });
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions = newSections[sectionIndex].questions.filter(
      (_, i) => i !== questionIndex
    );
    onChange({ sections: newSections });
  };

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    updates: any
  ) => {
    const newSections = [...sections];
    newSections[sectionIndex].questions[questionIndex] = {
      ...newSections[sectionIndex].questions[questionIndex],
      ...updates,
    };
    onChange({ sections: newSections });
  };

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Give your template a name and description
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium mb-2">
              Template Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g., Engineering 360° Review"
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium mb-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe when and how this template should be used..."
              rows={3}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sections Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Template Sections</CardTitle>
              <CardDescription>
                Organize questions into sections
              </CardDescription>
            </div>
            <Button onClick={addSection} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <List className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No sections added yet
              </p>
              <Button onClick={addSection} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add First Section
              </Button>
            </div>
          ) : (
            sections.map((section, sectionIndex) => {
              const isExpanded = expandedSections.includes(sectionIndex);

              return (
                <Card key={sectionIndex} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      <div className="flex-1">
                        <Input
                          value={section.title}
                          onChange={(e) =>
                            updateSection(sectionIndex, { title: e.target.value })
                          }
                          placeholder="Section title..."
                          className="font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {section.questions.length} question
                          {section.questions.length !== 1 ? "s" : ""}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection(sectionIndex)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(sectionIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2">
                          Section Description
                        </Label>
                        <Textarea
                          value={section.description || ""}
                          onChange={(e) =>
                            updateSection(sectionIndex, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Optional description..."
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`section-required-${sectionIndex}`}
                          checked={section.isRequired}
                          onChange={(e) =>
                            updateSection(sectionIndex, {
                              isRequired: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        <Label
                          htmlFor={`section-required-${sectionIndex}`}
                          className="text-sm"
                        >
                          Required section
                        </Label>
                      </div>

                      {/* Questions */}
                      <div className="pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Questions</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addQuestion(sectionIndex)}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Question
                          </Button>
                        </div>

                        {section.questions.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No questions yet
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {section.questions.map((question, questionIndex) => (
                              <div
                                key={questionIndex}
                                className="p-4 rounded-lg border bg-muted/30 space-y-3"
                              >
                                <div className="flex items-start gap-3">
                                  <GripVertical className="h-4 w-4 text-muted-foreground mt-2" />
                                  <div className="flex-1 space-y-3">
                                    <Input
                                      value={question.question}
                                      onChange={(e) =>
                                        updateQuestion(sectionIndex, questionIndex, {
                                          question: e.target.value,
                                        })
                                      }
                                      placeholder="Enter your question..."
                                    />

                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div>
                                        <Label className="text-xs text-muted-foreground mb-1">
                                          Question Type
                                        </Label>
                                        <select
                                          value={question.type}
                                          onChange={(e) =>
                                            updateQuestion(
                                              sectionIndex,
                                              questionIndex,
                                              { type: e.target.value as QuestionType }
                                            )
                                          }
                                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                          {QUESTION_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                              {type.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="flex items-center gap-2 mt-6">
                                        <input
                                          type="checkbox"
                                          id={`question-required-${sectionIndex}-${questionIndex}`}
                                          checked={question.isRequired}
                                          onChange={(e) =>
                                            updateQuestion(
                                              sectionIndex,
                                              questionIndex,
                                              { isRequired: e.target.checked }
                                            )
                                          }
                                          className="rounded"
                                        />
                                        <Label
                                          htmlFor={`question-required-${sectionIndex}-${questionIndex}`}
                                          className="text-sm"
                                        >
                                          Required
                                        </Label>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeQuestion(sectionIndex, questionIndex)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {sections.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Template Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Sections:</span>
                <span className="font-medium">{sections.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Questions:</span>
                <span className="font-medium">
                  {sections.reduce((sum, s) => sum + s.questions.length, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Required Sections:</span>
                <span className="font-medium">
                  {sections.filter((s) => s.isRequired).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
