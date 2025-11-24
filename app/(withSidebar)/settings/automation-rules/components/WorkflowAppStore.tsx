"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Plus,
  Star,
  Clock,
  CheckCircle2,
  Eye,
  Download,
  Target,
  Handshake,
  FileCheck,
  Calendar,
  UserCheck,
  Bell,
  ClipboardCheck,
  Briefcase,
  Users,
  TrendingUp,
  Award,
  BookOpen,
  MessageSquare,
  Gift,
  Heart,
  Activity,
  Shield,
  DollarSign,
  Loader2,
  Scale,
  FileText,
  Hand,
  Umbrella,
  DoorOpen,
  PartyPopper,
  LucideIcon,
  Plane,
  Home,
  Laptop,
  Mail,
  Mic,
  Brain,
  Cake,
  Baby,
  AlertTriangle,
  HardHat,
  Landmark,
  UserCog,
  UserPlus,
  FileSignature,
  Lock,
  Compass,
  GraduationCap,
  Rocket,
  BarChart3,
  BadgeCheck,
  ScrollText,
  HeartPulse,
  Wallet,
  Gauge,
  PieChart,
  Theater,
  Palmtree,
  Siren,
  HeartHandshake,
  Zap,
  Receipt,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowCategory {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  tags?: string[];
  benefits?: string[];
  estimatedTime?: string;
  isInstalled?: boolean;
  isPopular?: boolean;
  isPremium?: boolean;
  category?: WorkflowCategory;
}

interface TemplatesResponse {
  templates?: WorkflowTemplate[];
  categories?: WorkflowCategory[];
  totalCount?: number;
  installedCount?: number;
}

interface WorkflowAppStoreProps {
  onPreviewWorkflow: (templateId: string) => void;
  onInstallWorkflow: (templateId: string) => void;
  onCreateCustom: () => void;
}

export function WorkflowAppStore({
  onPreviewWorkflow,
  onInstallWorkflow,
  onCreateCustom,
}: WorkflowAppStoreProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [totalCount, setTotalCount] = useState<number>(0);
  const [installedCount, setInstalledCount] = useState<number>(0);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/automation-rules/templates");
      if (res.ok) {
        const data = (await res.json()) as TemplatesResponse;
        const apiTemplates = data.templates ?? [];
        setTemplates(apiTemplates);
        setCategories(data.categories ?? []);
        setTotalCount(typeof data.totalCount === "number" ? data.totalCount : apiTemplates.length);
        const computedInstalled = apiTemplates.filter((t) => t.isInstalled).length;
        setInstalledCount(
          typeof data.installedCount === "number" ? data.installedCount : computedInstalled,
        );
        
        // Expand first category by default
        if (data.categories?.[0]) {
          setExpandedCategories({ [data.categories[0].id]: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || template.category?.id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getTemplatesByCategory = (categoryId: string) => {
    return filteredTemplates.filter((template) => template.category?.id === categoryId);
  };

  const popularTemplates = filteredTemplates.filter(t => t.isPopular).slice(0, 6);
  const popularCount = templates.filter(t => t.isPopular).length;
  const availableCount = totalCount || templates.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Loading workflow store...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">{availableCount} Ready-to-Use Automation Workflows</span>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          HR Automation App Store
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          No-code workflows that save hours of manual work. Install instantly or customise to fit your needs.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">{installedCount} Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">{availableCount} Available</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">{popularCount} Popular</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search workflows by name, category, or keyword..."
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
            className="pl-10 h-12 text-base bg-white border-2 focus:border-blue-400 shadow-sm"
          />
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="max-w-xs mx-auto -mt-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-12 bg-white border-2 focus:border-blue-400">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Popular Workflows */}
      {!searchQuery && popularTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-2xl font-bold">Most Popular</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTemplates.map((template) => (
              <WorkflowCard
                key={template.id}
                template={template}
                onPreview={() => onPreviewWorkflow(template.id)}
                onInstall={() => onInstallWorkflow(template.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Custom CTA */}
      <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 via-white to-purple-50 hover:border-blue-400 transition-all cursor-pointer group"
        onClick={onCreateCustom}
      >
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">Create Custom Workflow</h3>
          <p className="text-muted-foreground mb-4">
            Build your own automation from scratch with our visual workflow builder
          </p>
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Sparkles className="w-4 h-4 mr-2" />
            Start Building
          </Button>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryTemplates = getTemplatesByCategory(category.id);
          if (categoryTemplates.length === 0) return null;

          const isExpanded = expandedCategories[category.id];
          const colorMap: Record<string, string> = {
            blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
            green: "from-green-50 to-green-100 border-green-200 text-green-900",
            purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-900",
            amber: "from-amber-50 to-amber-100 border-amber-200 text-amber-900",
            red: "from-red-50 to-red-100 border-red-200 text-red-900",
            pink: "from-pink-50 to-pink-100 border-pink-200 text-pink-900",
            orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-900",
            emerald: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900",
          };
          const colorClasses = colorMap[category.color as string] || "from-gray-50 to-gray-100 border-gray-200 text-gray-900";

          return (
            <div key={category.id} className="space-y-3">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 bg-gradient-to-r transition-all hover:shadow-md",
                  colorClasses,
                  isExpanded && "shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div className="text-left">
                    <h2 className="text-xl font-bold">{category.name}</h2>
                    <p className="text-sm opacity-80">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-white/80 px-3">
                    {categoryTemplates.length} workflows
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Category Content */}
              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                  {categoryTemplates.map((template) => (
                    <WorkflowCard
                      key={template.id}
                      template={template}
                      onPreview={() => onPreviewWorkflow(template.id)}
                      onInstall={() => onInstallWorkflow(template.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No workflows found</h3>
          <p className="text-muted-foreground">Try a different search term</p>
        </div>
      )}
    </div>
  );
}

// Helper function to map icon names/emojis to modern Lucide icons with variety
function getIconComponent(icon: React.ReactNode) {
  // If it's already a React node, return it
  if (typeof icon !== 'string') {
    return icon;
  }
  
  // Map icon names (from config files) to Lucide components with specific colors
  const iconNameMap: Record<string, { Icon: LucideIcon; color: string }> = {
    Scale: { Icon: Scale, color: "text-amber-600" },
    FileText: { Icon: FileText, color: "text-slate-600" },
    Hand: { Icon: Hand, color: "text-orange-500" },
    Umbrella: { Icon: Umbrella, color: "text-cyan-600" },
    Calendar: { Icon: Calendar, color: "text-green-600" },
    Star: { Icon: Star, color: "text-yellow-500" },
    Clock: { Icon: Clock, color: "text-purple-600" },
    DoorOpen: { Icon: DoorOpen, color: "text-rose-500" },
    PartyPopper: { Icon: PartyPopper, color: "text-pink-500" },
    Target: { Icon: Target, color: "text-blue-600" },
    Handshake: { Icon: Handshake, color: "text-violet-600" },
    ClipboardCheck: { Icon: ClipboardCheck, color: "text-amber-600" },
    CheckCircle2: { Icon: CheckCircle2, color: "text-emerald-600" },
    UserCheck: { Icon: UserCheck, color: "text-blue-600" },
    Bell: { Icon: Bell, color: "text-orange-500" },
    FileCheck: { Icon: FileCheck, color: "text-teal-600" },
    Briefcase: { Icon: Briefcase, color: "text-indigo-600" },
    Users: { Icon: Users, color: "text-purple-600" },
    TrendingUp: { Icon: TrendingUp, color: "text-green-600" },
    Award: { Icon: Award, color: "text-amber-500" },
    BookOpen: { Icon: BookOpen, color: "text-blue-500" },
    MessageSquare: { Icon: MessageSquare, color: "text-purple-500" },
    Gift: { Icon: Gift, color: "text-pink-500" },
    Heart: { Icon: Heart, color: "text-red-500" },
    Activity: { Icon: Activity, color: "text-orange-600" },
    Shield: { Icon: Shield, color: "text-blue-600" },
    DollarSign: { Icon: DollarSign, color: "text-emerald-600" },
  };
  
  // If it's an icon name, render the component
  if (iconNameMap[icon]) {
    const { Icon, color } = iconNameMap[icon];
    return <Icon className={`w-6 h-6 ${color}`} />;
  }
  
  // Comprehensive emoji mapping with unique icons and colors for variety
  const emojiMap: Record<string, React.ReactNode> = {
    // Onboarding & HR
    "🎯": <Target className="w-6 h-6 text-blue-600" />,
    "🤝": <Handshake className="w-6 h-6 text-violet-600" />,
    "🚀": <Rocket className="w-6 h-6 text-indigo-600" />,
    "👋": <Hand className="w-6 h-6 text-orange-500" />,
    "👔": <UserCog className="w-6 h-6 text-slate-600" />,
    "👨‍💼": <UserPlus className="w-6 h-6 text-blue-700" />,
    "👤": <UserCheck className="w-6 h-6 text-sky-600" />,
    "👥": <Users className="w-6 h-6 text-purple-600" />,
    
    // Performance & Development
    "📊": <BarChart3 className="w-6 h-6 text-cyan-600" />,
    "📈": <TrendingUp className="w-6 h-6 text-emerald-600" />,
    "🎓": <GraduationCap className="w-6 h-6 text-indigo-500" />,
    "🏆": <Award className="w-6 h-6 text-amber-500" />,
    "💬": <MessageSquare className="w-6 h-6 text-purple-500" />,
    "⭐": <Star className="w-6 h-6 text-yellow-500" />,
    
    // Leave & Time
    "✈️": <Plane className="w-6 h-6 text-sky-500" />,
    "🏖️": <Palmtree className="w-6 h-6 text-teal-500" />,
    "🏡": <Home className="w-6 h-6 text-green-600" />,
    "🏠": <Home className="w-6 h-6 text-amber-600" />,
    "📅": <Calendar className="w-6 h-6 text-green-600" />,
    "⏰": <Clock className="w-6 h-6 text-purple-600" />,
    "🎊": <PartyPopper className="w-6 h-6 text-pink-500" />,
    
    // Documents & Compliance
    "📋": <ClipboardCheck className="w-6 h-6 text-amber-600" />,
    "📄": <FileText className="w-6 h-6 text-slate-600" />,
    "📑": <FileSignature className="w-6 h-6 text-indigo-600" />,
    "📝": <ScrollText className="w-6 h-6 text-blue-600" />,
    "📖": <BookOpen className="w-6 h-6 text-teal-600" />,
    "🔒": <Lock className="w-6 h-6 text-slate-700" />,
    "🔍": <Compass className="w-6 h-6 text-cyan-600" />,
    "🛂": <BadgeCheck className="w-6 h-6 text-rose-600" />,
    "⚖️": <Scale className="w-6 h-6 text-amber-600" />,
    "✅": <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
    
    // IT & Equipment
    "💻": <Laptop className="w-6 h-6 text-slate-600" />,
    "📧": <Mail className="w-6 h-6 text-blue-500" />,
    "🎭": <Theater className="w-6 h-6 text-purple-500" />,
    
    // Offboarding
    "🧠": <Brain className="w-6 h-6 text-pink-600" />,
    "🎤": <Mic className="w-6 h-6 text-violet-600" />,
    "💵": <Receipt className="w-6 h-6 text-green-600" />,
    
    // Engagement & Culture
    "🎉": <PartyPopper className="w-6 h-6 text-pink-500" />,
    "🎂": <Cake className="w-6 h-6 text-rose-500" />,
    "🎁": <Gift className="w-6 h-6 text-pink-500" />,
    "👶": <Baby className="w-6 h-6 text-blue-400" />,
    "❤️": <Heart className="w-6 h-6 text-red-500" />,
    
    // Health & Safety
    "🚨": <Siren className="w-6 h-6 text-red-600" />,
    "🦺": <HardHat className="w-6 h-6 text-orange-500" />,
    "💚": <HeartHandshake className="w-6 h-6 text-emerald-500" />,
    "🏥": <HeartPulse className="w-6 h-6 text-red-500" />,
    "💪": <Activity className="w-6 h-6 text-orange-600" />,
    "🛡️": <Shield className="w-6 h-6 text-blue-600" />,
    
    // Payroll & Benefits
    "🏦": <Landmark className="w-6 h-6 text-blue-700" />,
    "💰": <DollarSign className="w-6 h-6 text-emerald-600" />,
    "💼": <Briefcase className="w-6 h-6 text-indigo-600" />,
    "🔔": <Bell className="w-6 h-6 text-orange-500" />,
    
    // Misc
    "📚": <BookOpen className="w-6 h-6 text-blue-500" />,
    "⚡": <Zap className="w-6 h-6 text-yellow-500" />,
  };

  return emojiMap[icon] || <Network className="w-6 h-6 text-slate-500" />;
}

interface WorkflowCardProps {
  template: WorkflowTemplate;
  onPreview: () => void;
  onInstall: () => void;
}

function WorkflowCard({ template, onPreview, onInstall }: WorkflowCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  return (
    <Card
      className={cn(
        "group hover:shadow-xl transition-all duration-300 border-2 overflow-hidden",
        template.isInstalled 
          ? "border-green-200 bg-gradient-to-br from-green-50/50 to-white" 
          : "border-gray-200 hover:border-blue-300 bg-white"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              {getIconComponent(template.icon)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                {template.name}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            </div>
          </div>
          {template.isPremium && (
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 flex-shrink-0">
              ✨ Premium
            </Badge>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {template.tags?.slice(0, 3).map((tag: string) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 border-0"
            >
              {tag}
            </Badge>
          ))}
          {template.tags && template.tags.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 border-0">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Benefits - Always visible */}
        {template.benefits && template.benefits.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            {template.benefits.slice(0, 2).map((benefit: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{benefit}</span>
              </div>
            ))}
          </div>
        )}

        {/* Meta Info */}
        {template.estimatedTime && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Saves ~{template.estimatedTime}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {template.isInstalled ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                onClick={onPreview}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Badge className="px-3 py-2 bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Installed
              </Badge>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onPreview}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={async () => {
                  setIsInstalling(true);
                  try {
                    await onInstall();
                  } finally {
                    setIsInstalling(false);
                  }
                }}
                disabled={isInstalling}
              >
                {isInstalling ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {isInstalling ? "Adding..." : "Add"}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

