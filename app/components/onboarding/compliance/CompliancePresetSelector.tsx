'use client';

/**
 * NZ Compliance Preset Selector Component
 * 
 * Allows users to choose from pre-configured compliance templates
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileText, CheckCircle, AlertTriangle, Building, ExternalLink } from 'lucide-react';
import { NZ_COMPLIANCE_PRESETS, type CompliancePreset } from '@/lib/compliance/nz-compliance-presets';
import { getPresetComplianceRequirements } from '@/lib/compliance/nz-compliance-presets';

interface CompliancePresetSelectorProps {
  onSelectPreset: (preset: CompliancePreset) => void;
  selectedPresetId?: string;
  region?: string;
  industry?: string;
}

export function CompliancePresetSelector({
  onSelectPreset,
  selectedPresetId,
  region = 'NZ',
  industry
}: CompliancePresetSelectorProps) {
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);

  const presets = NZ_COMPLIANCE_PRESETS.filter(preset => {
    if (preset.region !== region) return false;
    if (industry && preset.industry && preset.industry !== industry) return false;
    return true;
  });

  if (presets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Compliance Presets Available</CardTitle>
          <CardDescription>
            No pre-configured templates are available for your region. You can create a custom template instead.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Choose a Compliance Preset</h3>
        <p className="text-sm text-muted-foreground">
          Start with a pre-configured template that meets NZ employment law requirements
        </p>
      </div>

      {presets.map((preset) => {
        const isSelected = selectedPresetId === preset.id;
        const isExpanded = expandedPresetId === preset.id;
        const requirements = getPresetComplianceRequirements(preset.id);
        const mandatoryCount = requirements.filter(r => r.severity === 'mandatory').length;

        return (
          <Card
            key={preset.id}
            className={`transition-all cursor-pointer hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{preset.name}</CardTitle>
                    {isSelected && <CheckCircle className="h-5 w-5 text-green-600" />}
                  </div>
                  <CardDescription>{preset.description}</CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {mandatoryCount} Mandatory Requirements
                </Badge>
                <Badge variant="outline">
                  {preset.steps.length} Steps
                </Badge>
                <Badge variant="outline">
                  ~{preset.estimatedCompletionDays} days
                </Badge>
                {preset.industry && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {preset.industry}
                  </Badge>
                )}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Included Steps:</h4>
                    <div className="space-y-2">
                      {preset.steps.slice(0, 5).map((step, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded"
                        >
                          <span className="font-medium text-muted-foreground min-w-6">
                            {step.order}.
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{step.title}</span>
                              {step.isMandatory && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            {step.contextualTip && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {step.contextualTip}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {preset.steps.length > 5 && (
                        <p className="text-sm text-muted-foreground">
                          + {preset.steps.length - 5} more steps...
                        </p>
                      )}
                    </div>
                  </div>

                  {mandatoryCount > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            Compliance Information
                          </p>
                          <p className="text-blue-700 dark:text-blue-300 mt-1">
                            This template includes {mandatoryCount} mandatory requirements based on NZ
                            employment law. These steps cannot be removed without logging an override.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <a
                      href="https://www.employment.govt.nz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                    >
                      Learn more about NZ employment law
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    <Button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        onSelectPreset(preset);
                      }}
                      variant={isSelected ? 'outline' : 'default'}
                    >
                      {isSelected ? 'Selected' : 'Use This Template'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
