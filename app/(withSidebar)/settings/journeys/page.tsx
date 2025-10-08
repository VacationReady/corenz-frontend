"use client";

import { useState, useCallback, useEffect } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  Plus,
  Settings,
  Users,
  TrendingUp,
  Clock,
  Target,
  ChevronDown,
  Workflow,
  Layers,
  Route,
  BarChart3,
  MessageSquare,
  GitBranch,
  Play,
  Pause,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { JourneyModeToggle } from "./components/JourneyModeToggle";
import { JourneyCanvas } from "./components/JourneyCanvas";
import { InsightDock } from "./components/InsightDock";
import { JourneyScopingDialog } from "./components/JourneyScopingDialog";
import { OnboardingTemplatesTab } from "./components/OnboardingTemplatesTab";
import { FloatingAIChat } from "./components/FloatingAIChat";

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
  phases: JourneyPhase[];
  metricBindings: MetricBinding[];
  experiments: ExperimentVariant[];
}

interface JourneyPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  duration?: number;
  phaseType: "SEQUENTIAL" | "PARALLEL" | "CONDITIONAL";
  experienceBlocks: ExperienceBlock[];
}

interface ExperienceBlock {
  id: string;
  name: string;
  description?: string;
  blockType: "TASK" | "FORM" | "COMMUNICATION" | "TRAINING" | "APPROVAL" | "AUTOMATION" | "MILESTONE" | "SURVEY" | "DOCUMENT" | "MEETING";
  order: number;
  estimatedDuration?: number;
  slaHours?: number;
  responsibleRole?: string;
}

interface MetricBinding {
  id: string;
  metricName: string;
  metricType: "COMPLETION_RATE" | "SATISFACTION_SCORE" | "TIME_TO_COMPLETE" | "ENGAGEMENT_SCORE" | "RETENTION_RATE" | "CUSTOM";
  targetValue?: number;
  currentValue?: number;
}

interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  trafficAllocation: number;
  isControl: boolean;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
}

export default function JourneysPage() {
  const [mode, setMode] = useState<"automation" | "journey">("journey");
  const [activeTab, setActiveTab] = useState<"journeys" | "onboarding">("journeys");
  const [selectedJourney, setSelectedJourney] = useState<JourneyTemplate | null>(null);
  const [journeys, setJourneys] = useState<JourneyTemplate[]>([]);
  const [showScopingDialog, setShowScopingDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInsightDock, setShowInsightDock] = useState(true);

  // Check URL parameters for tab selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'onboarding') {
      setActiveTab('onboarding');
    }
  }, []);

  // Load journeys
  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/journeys");
      if (response.ok) {
        const data = await response.json();
        setJourneys(data);
      }
    } catch (error) {
      console.error("Failed to load journeys:", error);
      toast.error("Failed to load journeys");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJourney = useCallback(() => {
    setShowScopingDialog(true);
  }, []);

  const handleJourneyScoped = useCallback(async (scopingData: any) => {
    try {
      const response = await fetch("/api/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scopingData),
      });

      if (response.ok) {
        const newJourney = await response.json();
        setJourneys(prev => [newJourney, ...prev]);
        setSelectedJourney(newJourney);
        toast.success("Journey template created successfully");
      } else {
        throw new Error("Failed to create journey");
      }
    } catch (error) {
      toast.error("Failed to create journey template");
    }
    setShowScopingDialog(false);
  }, []);

  const handleJourneySelect = useCallback((journey: JourneyTemplate) => {
    setSelectedJourney(journey);
  }, []);

  const handleJourneyUpdate = useCallback((updatedJourney: JourneyTemplate) => {
    setJourneys(prev => prev.map(j => j.id === updatedJourney.id ? updatedJourney : j));
    setSelectedJourney(updatedJourney);
  }, []);

  const getJourneyStats = () => {
    const total = journeys.length;
    const published = journeys.filter(j => j.status === "PUBLISHED").length;
    const drafts = journeys.filter(j => j.status === "DRAFT").length;
    const avgDuration = journeys.reduce((acc, j) => acc + (j.duration || 0), 0) / total || 0;

    return { total, published, drafts, avgDuration };
  };

  const stats = getJourneyStats();

  if (mode === "automation") {
    // Redirect to existing automation rules page
    window.location.href = "/settings/automation-rules";
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex-none border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Route className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">
                {activeTab === 'onboarding' ? 'Onboarding Templates' : 'Journey Designer'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "journeys" | "onboarding")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="journeys">Journeys</TabsTrigger>
                  <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                </TabsList>
              </Tabs>
              {activeTab === 'journeys' && <JourneyModeToggle mode={mode} onModeChange={setMode} />}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleCreateJourney}>
              <Plus className="w-4 h-4 mr-2" />
              Design Journey
            </Button>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'onboarding' ? (
          <OnboardingTemplatesTab />
        ) : (
          <>
            {/* Canvas Workspace */}
            <div className="flex-1 flex flex-col">
              {selectedJourney ? (
                <JourneyCanvas
                  journey={selectedJourney}
                  onJourneyUpdate={handleJourneyUpdate}
                  showInsightDock={showInsightDock}
                  onToggleInsightDock={() => setShowInsightDock(!showInsightDock)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <Route className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Welcome to Journey Designer</h3>
                    <p className="text-muted-foreground mb-6">
                      Create end-to-end employee lifecycle programs with AI-powered journey orchestration.
                    </p>
                    <div className="flex flex-col gap-3">
                      <Button onClick={handleCreateJourney} className="w-full">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Design Your First Journey
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Insight Dock */}
            {showInsightDock && selectedJourney && (
              <div className="flex-none w-80 border-l bg-white">
                <InsightDock
                  journey={selectedJourney}
                  onClose={() => setShowInsightDock(false)}
                />
              </div>
            )}
          </>
        )}
      </div>


      {/* Journey Scoping Dialog */}
      <JourneyScopingDialog
        isOpen={showScopingDialog}
        onClose={() => setShowScopingDialog(false)}
        onConfirm={handleJourneyScoped}
      />

      {/* Floating AI Chat Widget */}
      <FloatingAIChat
        journey={selectedJourney}
        onJourneyUpdate={handleJourneyUpdate}
      />
    </div>
  );
}
