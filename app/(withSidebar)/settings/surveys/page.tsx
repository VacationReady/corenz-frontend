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
import { Plus, FileText, Settings, Trash2, MoreVertical, Sparkles, Star, Send } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { DEFAULT_SURVEY_TEMPLATES, ensureDefaultSurveyTemplates } from "@/lib/survey-templates";

interface Survey {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  isActive?: boolean;
  createdAt: string;
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
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_55%)]" />
          <CardContent className="relative z-10 grid gap-6 p-6 lg:grid-cols-[1.2fr,1fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white">
                <Sparkles className="h-3 w-3" /> Premium survey workspace
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white lg:text-2xl">
                  Launch curated surveys in seconds
                </h2>
                <p className="mt-2 text-sm text-slate-200 lg:text-base">
                  Save hours of setup with ready-to-use, HR-approved templates that are fully editable for your culture.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                {templatesWithInstances.map(({ definition }) => (
                  <span
                    key={definition.slug}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1"
                  >
                    <span className="text-base">{definition.emoji}</span>
                    {definition.name}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-white/90">
                  <Link href="/surveys/send">
                    <Send className="mr-2 h-4 w-4" />
                    Send a survey now
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10">
                  <Link href="/settings/surveys/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Build from scratch
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-4 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-slate-200">Current library</p>
                <div className="mt-2 flex items-baseline gap-2 text-3xl font-semibold">
                  {surveys.length}
                  <span className="text-sm font-medium text-slate-300">templates</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-200/80">
                  <span>Ready to send</span>
                  <Badge variant="outline" className="border-white/20 bg-white/10 text-xs text-white">
                    {surveys.length - totalDrafts} active • {totalDrafts} drafts
                  </Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-slate-200">Highlights</p>
                <ul className="mt-2 space-y-2 text-slate-100">
                  <li className="flex items-start gap-2">
                    <Star className="mt-0.5 h-4 w-4 text-amber-300" />
                    3 premium templates ready to personalise and send
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="mt-0.5 h-4 w-4 text-amber-300" />
                    Emotion-driven pulse surveys with expressive responses
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="mt-0.5 h-4 w-4 text-amber-300" />
                    Seamlessly integrate templates with automations
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templatesWithInstances.map(({ definition, instance }) => (
            <Card key={definition.slug} className="relative overflow-hidden border border-slate-200/60 shadow-sm transition hover:shadow-lg">
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${definition.accentGradient}`}
                aria-hidden
              />
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{definition.emoji}</span>
                  <div>
                    <CardTitle className="text-base">{definition.name}</CardTitle>
                    <CardDescription className="text-xs">{definition.description}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {definition.highlights.map((highlight) => (
                    <Badge key={highlight} variant="outline" className="bg-slate-50 text-[11px]">
                      {highlight}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Editable template</span>
                  {instance ? (
                    <span className="text-emerald-600">Live in library</span>
                  ) : (
                    <span className="text-amber-600">Generating…</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    asChild
                    variant="primary"
                    className="flex-1"
                    disabled={!instance || ensuringTemplates || loading}
                  >
                    <Link href={`/surveys/send?template=${definition.slug}`}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Use template
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1"
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

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Input
              type="search"
              placeholder="Search surveys..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredSurveys.length} {filteredSurveys.length === 1 ? "survey" : "surveys"}
          </Badge>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            Loading surveys...
          </div>
        ) : filteredSurveys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {query ? "No surveys found" : "No surveys yet"}
              </h3>
              <p className="mb-6 max-w-md text-sm text-gray-500">
                {query
                  ? "Try adjusting your search terms"
                  : "Get started by customising one of our premium templates or building your own from scratch."}
              </p>
              {!query && (
                <Button asChild variant="primary">
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
              <Card key={survey.id} className="group transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{survey.name}</CardTitle>
                      {survey.description && (
                        <CardDescription className="mt-1 text-xs line-clamp-2">
                          {survey.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu align="right">
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
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
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant={survey.isActive ? "default" : "outline"}>
                      {survey.isActive ? "Active" : "Draft"}
                    </Badge>
                    <span className="text-gray-500">
                      {new Date(survey.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
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

