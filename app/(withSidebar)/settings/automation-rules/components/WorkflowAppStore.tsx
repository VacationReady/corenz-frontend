"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ArrowRight,
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white shadow-lg flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium">Loading workflows...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-900">{availableCount} Ready-to-Use Automation Workflows</span>
        </motion.div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-violet-900 to-purple-900 bg-clip-text text-transparent">
          HR Automation Marketplace
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          No-code workflows that save hours of manual work. Install instantly or customise to fit your needs.
        </p>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-8 pt-4"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
            <span className="text-sm font-medium text-slate-700">{installedCount} Active</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm">
            <Download className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-700">{availableCount} Available</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-medium text-slate-700">{popularCount} Popular</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="max-w-xl mx-auto"
      >
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
          <Input
            placeholder="Search workflows by name, category, or keyword..."
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
            className="pl-12 h-14 text-base bg-white border-2 border-slate-200/60 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 shadow-lg shadow-slate-100 rounded-2xl transition-all"
          />
        </div>
      </motion.div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-xs mx-auto"
        >
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-12 bg-white border-2 border-slate-200/60 focus:border-violet-400 rounded-xl">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      {/* Popular Workflows */}
      <AnimatePresence>
        {!searchQuery && popularTemplates.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
                <Star className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Most Popular</h2>
            </div>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {popularTemplates.map((template) => (
                <motion.div key={template.id} variants={itemVariants}>
                  <WorkflowCard
                    template={template}
                    onPreview={() => onPreviewWorkflow(template.id)}
                    onInstall={() => onInstallWorkflow(template.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Custom CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Card 
          className="border-2 border-dashed border-violet-300 bg-gradient-to-br from-violet-50/80 via-white to-purple-50/80 hover:border-violet-400 hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
          onClick={onCreateCustom}
        >
          <CardContent className="p-8 text-center relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-200/20 to-purple-300/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-200/20 to-indigo-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <motion.div 
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/40 group-hover:scale-110 transition-transform"
                whileHover={{ rotate: 90 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Plus className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Create Custom Workflow</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Build your own automation from scratch with our powerful visual workflow builder
              </p>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/30 h-12 px-8"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Building
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((category, categoryIndex) => {
          const categoryTemplates = getTemplatesByCategory(category.id);
          if (categoryTemplates.length === 0) return null;

          const isExpanded = expandedCategories[category.id];
          const colorMap: Record<string, { gradient: string; border: string; text: string; bg: string }> = {
            blue: { gradient: "from-blue-500 to-indigo-500", border: "border-blue-200", text: "text-blue-900", bg: "from-blue-50 to-indigo-50" },
            green: { gradient: "from-emerald-500 to-green-500", border: "border-emerald-200", text: "text-emerald-900", bg: "from-emerald-50 to-green-50" },
            purple: { gradient: "from-violet-500 to-purple-500", border: "border-violet-200", text: "text-violet-900", bg: "from-violet-50 to-purple-50" },
            amber: { gradient: "from-amber-500 to-orange-500", border: "border-amber-200", text: "text-amber-900", bg: "from-amber-50 to-orange-50" },
            red: { gradient: "from-rose-500 to-red-500", border: "border-rose-200", text: "text-rose-900", bg: "from-rose-50 to-red-50" },
            pink: { gradient: "from-pink-500 to-rose-500", border: "border-pink-200", text: "text-pink-900", bg: "from-pink-50 to-rose-50" },
            orange: { gradient: "from-orange-500 to-amber-500", border: "border-orange-200", text: "text-orange-900", bg: "from-orange-50 to-amber-50" },
            emerald: { gradient: "from-emerald-500 to-teal-500", border: "border-emerald-200", text: "text-emerald-900", bg: "from-emerald-50 to-teal-50" },
          };
          const colors = colorMap[category.color as string] || colorMap.blue;

          return (
            <motion.div 
              key={category.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + categoryIndex * 0.05 }}
              className="space-y-4"
            >
              {/* Category Header */}
              <motion.button
                onClick={() => toggleCategory(category.id)}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className={cn(
                  "w-full flex items-center justify-between p-5 rounded-2xl border-2 bg-gradient-to-r transition-all duration-200",
                  colors.bg,
                  colors.border,
                  colors.text,
                  isExpanded ? "shadow-lg" : "shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-br text-white shadow-lg",
                    colors.gradient
                  )}>
                    {getIconComponent(category.icon) || <Zap className="w-6 h-6" />}
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold">{category.name}</h2>
                    <p className="text-sm opacity-80">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-white/80 backdrop-blur-sm text-slate-700 border-0 px-3 py-1 shadow-sm">
                    {categoryTemplates.length} workflows
                  </Badge>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </div>
              </motion.button>

              {/* Category Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4"
                    >
                      {categoryTemplates.map((template) => (
                        <motion.div key={template.id} variants={itemVariants}>
                          <WorkflowCard
                            template={template}
                            onPreview={() => onPreviewWorkflow(template.id)}
                            onInstall={() => onInstallWorkflow(template.id)}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      <AnimatePresence>
        {filteredTemplates.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No workflows found</h3>
            <p className="text-slate-500">Try a different search term or browse all categories</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to map icon names/emojis to modern Lucide icons
function getIconComponent(icon: React.ReactNode) {
  if (typeof icon !== 'string') return icon;
  
  const iconMap: Record<string, React.ReactNode> = {
    "🎯": <Target className="w-6 h-6" />,
    "🤝": <Handshake className="w-6 h-6" />,
    "🚀": <Rocket className="w-6 h-6" />,
    "👋": <Hand className="w-6 h-6" />,
    "👔": <UserCog className="w-6 h-6" />,
    "👤": <UserCheck className="w-6 h-6" />,
    "👥": <Users className="w-6 h-6" />,
    "📊": <BarChart3 className="w-6 h-6" />,
    "📈": <TrendingUp className="w-6 h-6" />,
    "🎓": <GraduationCap className="w-6 h-6" />,
    "🏆": <Award className="w-6 h-6" />,
    "💬": <MessageSquare className="w-6 h-6" />,
    "⭐": <Star className="w-6 h-6" />,
    "✈️": <Plane className="w-6 h-6" />,
    "🏖️": <Palmtree className="w-6 h-6" />,
    "🏡": <Home className="w-6 h-6" />,
    "📅": <Calendar className="w-6 h-6" />,
    "⏰": <Clock className="w-6 h-6" />,
    "🎊": <PartyPopper className="w-6 h-6" />,
    "📋": <ClipboardCheck className="w-6 h-6" />,
    "📄": <FileText className="w-6 h-6" />,
    "📑": <FileSignature className="w-6 h-6" />,
    "📝": <ScrollText className="w-6 h-6" />,
    "📖": <BookOpen className="w-6 h-6" />,
    "🔒": <Lock className="w-6 h-6" />,
    "🔍": <Compass className="w-6 h-6" />,
    "⚖️": <Scale className="w-6 h-6" />,
    "✅": <CheckCircle2 className="w-6 h-6" />,
    "💻": <Laptop className="w-6 h-6" />,
    "📧": <Mail className="w-6 h-6" />,
    "🧠": <Brain className="w-6 h-6" />,
    "🎤": <Mic className="w-6 h-6" />,
    "💵": <Receipt className="w-6 h-6" />,
    "🎉": <PartyPopper className="w-6 h-6" />,
    "🎂": <Cake className="w-6 h-6" />,
    "🎁": <Gift className="w-6 h-6" />,
    "👶": <Baby className="w-6 h-6" />,
    "❤️": <Heart className="w-6 h-6" />,
    "🚨": <Siren className="w-6 h-6" />,
    "🦺": <HardHat className="w-6 h-6" />,
    "💚": <HeartHandshake className="w-6 h-6" />,
    "🏥": <HeartPulse className="w-6 h-6" />,
    "💪": <Activity className="w-6 h-6" />,
    "🛡️": <Shield className="w-6 h-6" />,
    "🏦": <Landmark className="w-6 h-6" />,
    "💰": <DollarSign className="w-6 h-6" />,
    "💼": <Briefcase className="w-6 h-6" />,
    "🔔": <Bell className="w-6 h-6" />,
    "📚": <BookOpen className="w-6 h-6" />,
    "⚡": <Zap className="w-6 h-6" />,
  };

  return iconMap[icon] || <Network className="w-6 h-6" />;
}

interface WorkflowCardProps {
  template: WorkflowTemplate;
  onPreview: () => void;
  onInstall: () => void;
}

function WorkflowCard({ template, onPreview, onInstall }: WorkflowCardProps) {
  const [isInstalling, setIsInstalling] = useState(false);

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className={cn(
          "group overflow-hidden transition-all duration-300 border-2 h-full",
          "bg-white/80 backdrop-blur-sm hover:shadow-2xl",
          template.isInstalled 
            ? "border-emerald-200 hover:border-emerald-300" 
            : "border-slate-200/60 hover:border-violet-300"
        )}
      >
        {/* Gradient accent */}
        <div className={cn(
          "h-1.5 w-full",
          template.isInstalled 
            ? "bg-gradient-to-r from-emerald-500 to-green-500"
            : "bg-gradient-to-r from-violet-500 to-purple-500"
        )} />
        
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-lg",
                template.isInstalled
                  ? "bg-gradient-to-br from-emerald-500 to-green-500 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-violet-500 to-purple-500 shadow-violet-500/30"
              )}>
                <span className="text-white">
                  {getIconComponent(template.icon) || <Zap className="w-6 h-6" />}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 leading-tight mb-1 group-hover:text-violet-600 transition-colors">
                  {template.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </div>
            </div>
            {template.isPremium && (
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 flex-shrink-0 shadow-sm">
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
                className="text-[10px] px-2 py-0.5 bg-slate-100/80 text-slate-600 border-0 font-medium"
              >
                {tag}
              </Badge>
            ))}
            {template.tags && template.tags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-100/80 text-slate-600 border-0">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>

          {/* Benefits */}
          {template.benefits && template.benefits.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              {template.benefits.slice(0, 2).map((benefit: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{benefit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Time estimate */}
          {template.estimatedTime && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
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
                  className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                  onClick={onPreview}
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  View
                </Button>
                <Badge className="px-3 py-2 bg-emerald-100 text-emerald-700 border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Installed
                </Badge>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl hover:bg-slate-50"
                  onClick={onPreview}
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl shadow-lg shadow-violet-500/25"
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
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1.5" />
                  )}
                  {isInstalling ? "Adding..." : "Add"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
