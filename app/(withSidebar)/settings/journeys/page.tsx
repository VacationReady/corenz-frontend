"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { Progress } from "@/components/ui/progress";
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
  Rocket,
  Zap,
  Trophy,
  Star,
  ArrowRight,
  RefreshCcw,
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

        {/* Analytics Dashboard - Beautiful Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Journeys</p>
                    {analyticsLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <motion.p 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-bold text-indigo-700 dark:text-indigo-300"
                      >
                        {analytics?.totalTemplates || 0}
                      </motion.p>
                    )}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Route className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Published</p>
                    {analyticsLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <motion.p 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-bold text-emerald-700 dark:text-emerald-300"
                      >
                        {analytics?.publishedTemplates || 0}
                      </motion.p>
                    )}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Active Instances</p>
                    {analyticsLoading ? (
                      <Skeleton className="h-9 w-16 mt-1" />
                    ) : (
                      <motion.p 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-bold text-blue-700 dark:text-blue-300"
                      >
                        {analytics?.activeInstances || 0}
                      </motion.p>
                    )}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Avg Completion</p>
                    {analyticsLoading ? (
                      <Skeleton className="h-9 w-20 mt-1" />
                    ) : (
                      <motion.p 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-bold text-amber-700 dark:text-amber-300"
                      >
                        {analytics?.avgCompletionRate || 0}%
                      </motion.p>
                    )}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Header with Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "journeys" | "onboarding")}>
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger 
                  value="journeys"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all"
                >
                  <Route className="w-4 h-4 mr-2" />
                  Journeys
                </TabsTrigger>
                <TabsTrigger 
                  value="onboarding"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Onboarding
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleCreateJourney}
              className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
            >
              <Sparkles className="w-4 h-4" />
              Design Journey
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="border rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
        >
        <AnimatePresence mode="wait">
          {activeTab === 'onboarding' ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <OnboardingTemplatesTab />
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12"
            >
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="journeys"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
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
                      <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 mb-8"
                      >
                        <Route className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                      </motion.div>
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Design Your First Journey</h3>
                      <p className="text-muted-foreground mb-10 text-lg">
                        Create comprehensive employee lifecycle programs with AI-powered orchestration.
                        From onboarding to offboarding, design experiences that drive engagement and success.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                        <motion.div 
                          whileHover={{ scale: 1.02, y: -2 }}
                          className="p-5 border rounded-2xl text-left bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                            <Layers className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Visual Builder</h4>
                          <p className="text-sm text-muted-foreground">
                            Drag-and-drop phases and experience blocks
                          </p>
                        </motion.div>
                        <motion.div 
                          whileHover={{ scale: 1.02, y: -2 }}
                          className="p-5 border rounded-2xl text-left bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">AI Guidance</h4>
                          <p className="text-sm text-muted-foreground">
                            Get smart suggestions for journey optimization
                          </p>
                        </motion.div>
                        <motion.div 
                          whileHover={{ scale: 1.02, y: -2 }}
                          className="p-5 border rounded-2xl text-left bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                            <BarChart3 className="w-6 h-6 text-white" />
                          </div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Analytics</h4>
                          <p className="text-sm text-muted-foreground">
                            Track completion rates and satisfaction scores
                          </p>
                        </motion.div>
                      </div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={handleCreateJourney} 
                          size="lg"
                          className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl shadow-indigo-500/30 px-8 py-6 text-lg"
                        >
                          <Sparkles className="w-5 h-5" />
                          Start Building
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                )}
              </div>

              {/* Insight Dock */}
              {showInsightDock && selectedJourney && (
                <div className="flex-none w-80 border-l bg-white dark:bg-slate-900">
                  <InsightDock
                    journey={selectedJourney}
                    onClose={() => setShowInsightDock(false)}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
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
