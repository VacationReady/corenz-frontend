"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TemplateQuestion, 
  ReviewerRole,
  QuestionType,
} from "@/types/performance-templates";
import {
  checkQuestionPermission,
  QuestionVisibility,
} from "@/lib/performance-permissions";
import { 
  Eye, 
  Lock, 
  Info,
  EyeOff,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReviewQuestionRendererProps {
  question: TemplateQuestion;
  value?: any;
  onChange?: (value: any) => void;
  userRole: ReviewerRole;
  isEmployee?: boolean;
  showPermissionIndicator?: boolean;
}

export function ReviewQuestionRenderer({
  question,
  value,
  onChange,
  userRole,
  isEmployee = false,
  showPermissionIndicator = true,
}: ReviewQuestionRendererProps) {
  const permissionCheck = checkQuestionPermission(question, userRole, isEmployee);

  // Don't render hidden questions
  if (permissionCheck.visibility === "hidden") {
    return null;
  }

  const isReadOnly = permissionCheck.visibility === "readonly";
  const isRequired = question.isRequired && !isReadOnly;

  const renderQuestionInput = () => {
    switch (question.type) {
      case "TEXT":
        return (
          <Input
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "No answer provided" : "Enter your answer..."}
            className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "No answer provided" : "Enter your answer..."}
            rows={4}
            className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}
          />
        );

      case "RATING":
        const maxRating = question.options?.max || 5;
        const minRating = question.options?.min || 1;
        return (
          <div className="flex items-center gap-2">
            {Array.from({ length: maxRating - minRating + 1 }, (_, i) => {
              const rating = minRating + i;
              const isSelected = value === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => !isReadOnly && onChange?.(rating)}
                  disabled={isReadOnly}
                  className={`w-10 h-10 rounded-full border-2 font-medium transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-gray-300 hover:border-primary"
                  } ${isReadOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {rating}
                </button>
              );
            })}
          </div>
        );

      case "MULTIPLE_CHOICE":
        const options = question.options?.choices || [];
        return (
          <div className="space-y-2">
            {options.map((option: string, index: number) => (
              <label
                key={index}
                className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                  value === option ? "border-primary bg-primary/5" : "border-gray-200"
                } ${isReadOnly ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => !isReadOnly && onChange?.(e.target.value)}
                  disabled={isReadOnly}
                  className="rounded-full"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case "YES_NO":
        return (
          <div className="flex items-center gap-3">
            <label
              className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                value === true ? "border-primary bg-primary/5" : "border-gray-200"
              } ${isReadOnly ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === true}
                onChange={() => !isReadOnly && onChange?.(true)}
                disabled={isReadOnly}
                className="rounded-full"
              />
              <span className="text-sm font-medium">Yes</span>
            </label>
            <label
              className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${
                value === false ? "border-primary bg-primary/5" : "border-gray-200"
              } ${isReadOnly ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === false}
                onChange={() => !isReadOnly && onChange?.(false)}
                disabled={isReadOnly}
                className="rounded-full"
              />
              <span className="text-sm font-medium">No</span>
            </label>
          </div>
        );

      case "DATE":
        return (
          <Input
            type="date"
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={isReadOnly}
            className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={isReadOnly}
            placeholder={isReadOnly ? "No answer provided" : "Enter a number..."}
            className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              {question.question}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            {/* Permission Indicator */}
            {showPermissionIndicator && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {isReadOnly ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Eye className="h-3 w-3" />
                        Read-only
                      </Badge>
                    ) : question.hideFromEmployee && !isEmployee ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <EyeOff className="h-3 w-3" />
                        Hidden from employee
                      </Badge>
                    ) : null}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{permissionCheck.reason}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {question.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {question.description}
            </p>
          )}
        </div>
      </div>

      {/* Question Input */}
      {renderQuestionInput()}

      {/* Read-only Notice */}
      {isReadOnly && value && (
        <Alert className="bg-muted/50 border-muted">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This question was answered by another reviewer. You can view but not edit the response.
          </AlertDescription>
        </Alert>
      )}

      {/* No Answer Notice for Read-only */}
      {isReadOnly && !value && (
        <p className="text-xs text-muted-foreground italic">
          This question has not been answered yet.
        </p>
      )}
    </div>
  );
}

/**
 * Batch renderer for multiple questions in a section
 */
interface ReviewSectionRendererProps {
  questions: TemplateQuestion[];
  values?: Record<string, any>;
  onChange?: (questionId: string, value: any) => void;
  userRole: ReviewerRole;
  isEmployee?: boolean;
  showPermissionIndicators?: boolean;
}

export function ReviewSectionRenderer({
  questions,
  values = {},
  onChange,
  userRole,
  isEmployee = false,
  showPermissionIndicators = true,
}: ReviewSectionRendererProps) {
  // Filter out hidden questions
  const visibleQuestions = questions.filter((q) => {
    const check = checkQuestionPermission(q, userRole, isEmployee);
    return check.visibility !== "hidden";
  });

  if (visibleQuestions.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          No questions are visible for your role in this section.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {visibleQuestions.map((question) => (
        <ReviewQuestionRenderer
          key={question.id}
          question={question}
          value={values[question.id]}
          onChange={(value) => onChange?.(question.id, value)}
          userRole={userRole}
          isEmployee={isEmployee}
          showPermissionIndicator={showPermissionIndicators}
        />
      ))}
    </div>
  );
}

