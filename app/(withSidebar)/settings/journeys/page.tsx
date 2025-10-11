"use client";

import { useState, useCallback, useEffect } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/Skeleton";
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
  CheckCircle,
  Home,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { JourneyModeToggle } from "./components/JourneyModeToggle";
import { JourneyCanvas } from "./components/JourneyCanvas";
import { InsightDock } from "./components/InsightDock";
import { JourneyScopingDialog } from "./components/JourneyScopingDialog";
import { OnboardingTemplatesTab } from "./components/OnboardingTemplatesTab";
import { FloatingAIChat } from "./components/FloatingAIChat";
import { JourneyOnboardingChecklist } from "./components/JourneyOnboardingChecklist";

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
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showInsightDock, setShowInsightDock] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  // Check URL parameters for tab selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'onboarding') {
      setActiveTab('onboarding');
    }
  }, []);

  // Load journeys and analytics
  useEffect(() => {
    loadJourneys();
    loadAnalytics();
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

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch("/api/journeys/analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setAnalyticsLoading(false);
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

  const hasPublishedJourneys = journeys.some(j => j.status === "PUBLISHED");
  const hasInstances = analytics?.totalInstances > 0;

  return (
    <PageShell
      title="Journey Designer"
      description="Design and manage employee lifecycle programs"
      breadcrumbs={{
        items: [
          { href: "/", label: "Home" },
          { href: "/settings", label: "Settings" },
          { label: "Journeys" },
        ],
      }}
    >
      <div className="space-y-6">
        {/* Onboarding Checklist */}
        {showOnboarding && journeys.length < 5 && (
          <JourneyOnboardingChecklist
            hasJourneys={journeys.length > 0}
            hasPublishedJourneys={hasPublishedJourneys}
            hasInstances={hasInstances}
            onCreateJourney={handleCreateJourney}
            onDismiss={() => setShowOnboarding(false)}
          />
        )}

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Journeys</p>
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{analytics?.totalTemplates || 0}</p>
                  )}
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Route className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{analytics?.publishedTemplates || 0}</p>
                  )}
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Instances</p>
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{analytics?.activeInstances || 0}</p>
                  )}
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Completion</p>
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{analytics?.avgCompletionRate || 0}%</p>
                  )}
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "journeys" | "onboarding")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="journeys">Journeys</TabsTrigger>
                <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateJourney}>
              <Sparkles className="w-4 h-4 mr-2" />
              Design Journey
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="border rounded-lg bg-white">
        {activeTab === 'onboarding' ? (
          <OnboardingTemplatesTab />
        ) : loading ? (
          <div className="p-12">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : (
          <>
            {/* Canvas Workspace */}
            <div className="flex-1 flex flex-col min-h-[600px]">
              {selectedJourney ? (
                <JourneyCanvas
                  journey={selectedJourney}
                  onJourneyUpdate={handleJourneyUpdate}
                  showInsightDock={showInsightDock}
                  onToggleInsightDock={() => setShowInsightDock(!showInsightDock)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-12">
                  <div className="text-center max-w-2xl">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                      <Route className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Design Your First Journey</h3>
                    <p className="text-muted-foreground mb-8 text-lg">
                      Create comprehensive employee lifecycle programs with AI-powered orchestration.
                      From onboarding to offboarding, design experiences that drive engagement and success.
                    </p>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="p-4 border rounded-lg text-left">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                          <Route className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="font-medium mb-1">Visual Builder</h4>
                        <p className="text-xs text-muted-foreground">
                          Drag-and-drop phases and experience blocks
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg text-left">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        <h4 className="font-medium mb-1">AI Guidance</h4>
                        <p className="text-xs text-muted-foreground">
                          Get smart suggestions for journey optimization
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg text-left">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                          <BarChart3 className="w-5 h-5 text-green-600" />
                        </div>
                        <h4 className="font-medium mb-1">Analytics</h4>
                        <p className="text-xs text-muted-foreground">
                          Track completion rates and satisfaction scores
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleCreateJourney} size="lg">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Start Building
                    </Button>
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
    </PageShell>
  );
}
