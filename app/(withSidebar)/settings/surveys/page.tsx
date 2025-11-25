"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Plus, FileText, Settings, Trash2, MoreVertical, Sparkles, Star, Send, TrendingUp, Palette, Compass, Search } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { DEFAULT_SURVEY_TEMPLATES, ensureDefaultSurveyTemplates, SurveyTemplateDefinition } from "@/lib/survey-templates";
import { cn } from "@/lib/utils";

interface Survey {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  isActive?: boolean;
  createdAt: string;
}

// Helper to render Lucide icons based on template icon name
function TemplateIcon({ icon, className }: { icon: SurveyTemplateDefinition["icon"]; className?: string }) {
  const iconMap = {
    "trending-up": TrendingUp,
    "palette": Palette,
    "compass": Compass,
  };
  const IconComponent = iconMap[icon];
  return <IconComponent className={className} />;
}

// Get accent colors for icon backgrounds
function getIconGradient(icon: SurveyTemplateDefinition["icon"]) {
  const gradientMap = {
    "trending-up": "from-blue-500 to-indigo-600",
    "palette": "from-pink-500 to-rose-600",
    "compass": "from-emerald-500 to-teal-600",
  };
  return gradientMap[icon];
}

export default function SurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [ensuringTemplates, setEnsuringTemplates] = useState(false);

  useEffect(() => {
    const loadSurveys = async () => {
      setLoading(true);
      try {
        setEnsuringTemplates(true);
        const data = await ensureDefaultSurveyTemplates();
        setSurveys(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load surveys", error);
        toast.error("Failed to load surveys");
      } finally {
        setEnsuringTemplates(false);
        setLoading(false);
      }
    };

    loadSurveys();
  }, []);

  const templatesWithInstances = useMemo(() => {
    const bySlug = new Map((surveys || []).map((survey) => [survey.slug, survey]));
    return DEFAULT_SURVEY_TEMPLATES.map((template) => ({
      definition: template,
      instance: bySlug.get(template.slug),
    }));
  }, [surveys]);

  const totalDrafts = useMemo(
    () => surveys.filter((survey) => !survey.isActive).length,
    [surveys],
  );

  const filteredSurveys = surveys.filter(
    (s) =>
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(query.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) return;

    try {
      const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Survey deleted");
        setSurveys((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error("Failed to delete survey");
      }
    } catch {
      toast.error("Failed to delete survey");
    }
  };

  return (
    <PageShell
      title="Surveys"
      description="Create and manage one-time surveys for distribution through action items"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={breadcrumbConfigs.settingsSection("Surveys")}
      action={
        <Button asChild variant="primary">
          <Link href="/settings/surveys/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Survey
          </Link>
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Hero Section - Dark gradient background with excellent contrast */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.2),_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(236,72,153,0.15),_transparent_50%)]" />
          <div className="relative z-10 grid gap-8 p-8 lg:grid-cols-[1.3fr,1fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-200">
                <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> Premium Survey Workspace
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white lg:text-3xl tracking-tight">
                  Launch curated surveys in seconds
                </h2>
                <p className="mt-3 text-base text-slate-300 leading-relaxed max-w-lg">
                  Save hours of setup with ready-to-use, HR-approved templates that are fully editable for your culture and brand.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {templatesWithInstances.map(({ definition }) => (
                  <span
                    key={definition.slug}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/15 transition-colors"
                  >
                    <TemplateIcon icon={definition.icon} className="h-3.5 w-3.5" />
                    <span className="font-medium">{definition.name.split(" ")[0]}</span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/10 font-semibold">
                  <Link href="/surveys/send">
                    <Send className="mr-2 h-4 w-4" />
                    Send a survey now
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-medium">
                  <Link href="/settings/surveys/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Build from scratch
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Current Library</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{surveys.length}</span>
                  <span className="text-sm font-medium text-slate-400">templates</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Ready to send</span>
                  <Badge variant="outline" className="border-emerald-400/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
                    {surveys.length - totalDrafts} active • {totalDrafts} drafts
                  </Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Highlights</p>
                <ul className="mt-3 space-y-2.5">
                  <li className="flex items-start gap-3 text-sm text-slate-200">
                    <Star className="mt-0.5 h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>3 premium templates ready to personalise and send</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-200">
                    <Star className="mt-0.5 h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>Emotion-driven pulse surveys with expressive responses</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-200">
                    <Star className="mt-0.5 h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span>Seamlessly integrate templates with automations</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Template Cards - Using Lucide icons instead of emojis */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Premium Templates</h3>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {templatesWithInstances.map(({ definition, instance }) => (
              <Card 
                key={definition.slug} 
                className="relative overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 group"
              >
                {/* Gradient accent bar */}
                <div
                  className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", definition.accentGradient)}
                  aria-hidden
                />
                <CardHeader className="space-y-4 pb-4 pt-6">
                  <div className="flex items-start gap-4">
                    {/* Modern icon container with gradient */}
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                      getIconGradient(definition.icon),
                      "group-hover:scale-110 transition-transform duration-300"
                    )}>
                      <TemplateIcon icon={definition.icon} className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-slate-900">{definition.name}</CardTitle>
                      <CardDescription className="text-sm text-slate-600 mt-1 line-clamp-2">{definition.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {definition.highlights.map((highlight) => (
                      <Badge 
                        key={highlight} 
                        variant="outline" 
                        className="bg-slate-50 text-[11px] text-slate-600 border-slate-200 font-medium"
                      >
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Editable template</span>
                    {instance ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Live in library
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">Generating…</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="primary"
                      className="flex-1 font-semibold"
                      disabled={!instance || ensuringTemplates || loading}
                    >
                      <Link href={`/surveys/send?template=${definition.slug}`}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Use Template
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 font-medium"
                      disabled={!instance || ensuringTemplates || loading}
                    >
                      <Link href={instance ? `/settings/surveys/${instance.id}/edit` : "#"}>
                        <Settings className="mr-2 h-4 w-4" />
                        Refine
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Search and Survey List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">All Surveys</h3>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search surveys..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-white border-slate-200"
              />
            </div>
            <Badge variant="outline" className="text-xs text-slate-600 border-slate-200 font-medium px-3 py-1.5">
              {filteredSurveys.length} {filteredSurveys.length === 1 ? "survey" : "surveys"}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-flex items-center gap-3 text-slate-500">
              <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span className="font-medium">Loading surveys...</span>
            </div>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <Card className="bg-slate-50 border-dashed border-2 border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {query ? "No surveys found" : "No surveys yet"}
              </h3>
              <p className="mb-6 max-w-md text-sm text-slate-600 leading-relaxed">
                {query
                  ? "Try adjusting your search terms to find what you're looking for."
                  : "Get started by customising one of our premium templates above or build your own survey from scratch."}
              </p>
              {!query && (
                <Button asChild variant="primary" className="font-semibold">
                  <Link href="/settings/surveys/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Survey
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSurveys.map((survey) => (
              <Card key={survey.id} className="group bg-white border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-slate-900 truncate">{survey.name}</CardTitle>
                      {survey.description && (
                        <CardDescription className="mt-1.5 text-sm text-slate-600 line-clamp-2">
                          {survey.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu align="right">
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => router.push(`/settings/surveys/${survey.id}/edit`)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(survey.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center justify-between text-xs">
                    <Badge 
                      variant={survey.isActive ? "default" : "outline"}
                      className={cn(
                        "font-semibold",
                        survey.isActive 
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}
                    >
                      {survey.isActive ? "Active" : "Draft"}
                    </Badge>
                    <span className="text-slate-500 font-medium">
                      {new Date(survey.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full font-medium">
                    <Link href={`/settings/surveys/${survey.id}/edit`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Survey
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
