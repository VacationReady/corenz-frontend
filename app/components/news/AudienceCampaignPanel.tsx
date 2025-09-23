"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import NewsChip from "../ui/NewsChip";
import {
  Users,
  Building,
  MapPin,
  Briefcase,
  Target,
  Sparkles,
  Clock,
  Calendar,
  Bell,
  Mail,
  MessageCircle,
  Zap,
  ChevronRight,
  Info,
  Check,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

type AudienceFilter = {
  departments?: string[];
  roles?: string[];
  locations?: string[];
  type?: "all" | "custom";
};

interface AudienceCampaignPanelProps {
  value: AudienceFilter;
  onChange: (audience: AudienceFilter) => void;
  refreshKey: number;
  showScheduling?: boolean;
  showNotifications?: boolean;
  estimatedReach?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Smart presets for quick audience selection
const audiencePresets = [
  {
    id: "everyone",
    name: "Everyone",
    emoji: "🌍",
    description: "Reach your entire organization",
    filter: { type: "all" as const },
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "leadership",
    name: "Leadership",
    emoji: "👔",
    description: "C-suite and department heads",
    filter: { roles: ["CEO", "CTO", "CFO", "Director", "VP"] },
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "remote",
    name: "Remote Teams",
    emoji: "🏠",
    description: "All remote employees",
    filter: { locations: ["Remote", "Work from Home"] },
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "engineering",
    name: "Engineering",
    emoji: "💻",
    description: "Dev teams and technical staff",
    filter: { departments: ["Engineering", "IT", "DevOps"] },
    color: "from-orange-500 to-red-500",
  },
  {
    id: "sales-marketing",
    name: "Sales & Marketing",
    emoji: "📈",
    description: "Customer-facing teams",
    filter: { departments: ["Sales", "Marketing", "Customer Success"] },
    color: "from-yellow-500 to-amber-500",
  },
];

// Time-based suggestions
const getTimeSuggestion = () => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  if (day === 1 && hour < 10) {
    return { text: "📅 Monday morning - Great time for weekly updates!", type: "success" };
  }
  if (day === 5 && hour > 14) {
    return { text: "🎉 Friday afternoon - Consider scheduling for Monday", type: "warning" };
  }
  if (hour < 9 || hour > 17) {
    return { text: "🌙 Outside work hours - Schedule for tomorrow?", type: "info" };
  }
  return { text: "✨ Good timing for maximum engagement!", type: "success" };
};

export default function AudienceCampaignPanel({
  value,
  onChange,
  refreshKey,
  showScheduling = true,
  showNotifications = true,
  estimatedReach = 0,
}: AudienceCampaignPanelProps) {
  const { data, error, isLoading } = useSWR(
    ["/api/audience", refreshKey],
    ([url]) => fetcher(url),
    {
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      dedupingInterval: 0,
    }
  );

  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSlack, setSendSlack] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("presets");

  useEffect(() => {
    if (data) {
      setDepartments(
        data.departments?.map((d: { id: string; name: string }) => d.name) || []
      );
      setRoles(
        data.jobRoles?.map((r: { id: string; name: string }) => r.name) || []
      );
      setLocations(
        data.locations?.map((l: { id: string; name: string }) => l.name) || []
      );
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load audience options");
    }
  }, [error]);

  // Initialize with "all" if nothing selected
  useEffect(() => {
    if (
      !value.type &&
      (!value.departments || value.departments.length === 0) &&
      (!value.roles || value.roles.length === 0) &&
      (!value.locations || value.locations.length === 0)
    ) {
      onChange({ type: "all" });
      setSelectedPreset("everyone");
    }
  }, []);

  const toggleValue = (field: keyof AudienceFilter, option: string) => {
    const current = Array.isArray(value[field])
      ? (value[field] as string[])
      : [];
    const newValues = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];

    onChange({ ...value, [field]: newValues, type: undefined });
    setSelectedPreset(null);
  };

  const isChecked = (field: keyof AudienceFilter, option: string) => {
    return value[field]?.includes(option);
  };

  const applyPreset = (preset: typeof audiencePresets[0]) => {
    onChange(preset.filter);
    setSelectedPreset(preset.id);
    toast.success(`Applied "${preset.name}" preset`);
  };

  const calculateEstimatedReach = () => {
    if (value.type === "all") return "Everyone in your organization";
    
    let count = 0;
    if (value.departments?.length) count += value.departments.length * 50;
    if (value.roles?.length) count += value.roles.length * 20;
    if (value.locations?.length) count += value.locations.length * 100;
    
    if (count === 0) return "Select audience to see reach";
    return `~${count} people`;
  };

  const timeSuggestion = getTimeSuggestion();

  if (isLoading) {
    return (
      <div className="p-8 bg-card/50 backdrop-blur-sm rounded-2xl border border-border">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading campaign options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-editorial-purple/10 to-editorial-blue/10 rounded-2xl p-6 border border-editorial-purple/20"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-editorial-purple" />
              Campaign Targeting
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose who should see this news and how they&apos;ll be notified
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Estimated reach</p>
            <p className="text-2xl font-bold text-foreground">
              {calculateEstimatedReach()}
            </p>
          </div>
        </div>

        {/* Engagement Tip */}
        <div
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            timeSuggestion.type === "success" && "bg-green-500/10 text-green-700 dark:text-green-300",
            timeSuggestion.type === "warning" && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
            timeSuggestion.type === "info" && "bg-blue-500/10 text-blue-700 dark:text-blue-300"
          )}
        >
          <Info className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{timeSuggestion.text}</span>
        </div>
      </motion.div>

      {/* Smart Presets */}
      <div className="space-y-3">
        <button
          onClick={() => setExpandedSection(expandedSection === "presets" ? null : "presets")}
          className="w-full flex items-center justify-between p-4 bg-card rounded-xl hover:bg-muted/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-editorial-purple" />
            <span className="font-semibold">Smart Presets</span>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              Quick Select
            </span>
          </div>
          <ChevronRight
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform",
              expandedSection === "presets" && "rotate-90"
            )}
          />
        </button>

        <AnimatePresence>
          {expandedSection === "presets" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden"
            >
              {audiencePresets.map((preset) => (
                <motion.button
                  key={preset.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all",
                    "hover:shadow-lg hover:border-primary/50",
                    selectedPreset === preset.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card/50"
                  )}
                >
                  {selectedPreset === preset.id && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3",
                      preset.color
                    )}
                  >
                    <span className="text-xl">{preset.emoji}</span>
                  </div>
                  <h4 className="font-semibold text-foreground">{preset.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Audience Builder */}
      <div className="space-y-3">
        <button
          onClick={() => setExpandedSection(expandedSection === "custom" ? null : "custom")}
          className="w-full flex items-center justify-between p-4 bg-card rounded-xl hover:bg-muted/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-editorial-blue" />
            <span className="font-semibold">Custom Audience</span>
            {(value.departments?.length || value.roles?.length || value.locations?.length) ? (
              <span className="text-xs px-2 py-1 bg-editorial-blue/10 text-editorial-blue rounded-full">
                {(value.departments?.length || 0) + 
                 (value.roles?.length || 0) + 
                 (value.locations?.length || 0)} selected
              </span>
            ) : null}
          </div>
          <ChevronRight
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform",
              expandedSection === "custom" && "rotate-90"
            )}
          />
        </button>

        <AnimatePresence>
          {expandedSection === "custom" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 p-4 bg-muted/30 rounded-xl overflow-hidden"
            >
              {/* Departments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <label className="font-medium text-sm">Departments</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => (
                    <NewsChip
                      key={dept}
                      onClick={() => toggleValue("departments", dept)}
                      selected={isChecked("departments", dept)}
                      variant={isChecked("departments", dept) ? "primary" : "outline"}
                      size="sm"
                      animated
                    >
                      {dept}
                    </NewsChip>
                  ))}
                  {departments.length === 0 && (
                    <span className="text-xs text-muted-foreground">No departments available</span>
                  )}
                </div>
              </div>

              {/* Roles */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <label className="font-medium text-sm">Job Roles</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <NewsChip
                      key={role}
                      onClick={() => toggleValue("roles", role)}
                      selected={isChecked("roles", role)}
                      variant={isChecked("roles", role) ? "primary" : "outline"}
                      size="sm"
                      animated
                    >
                      {role}
                    </NewsChip>
                  ))}
                  {roles.length === 0 && (
                    <span className="text-xs text-muted-foreground">No roles available</span>
                  )}
                </div>
              </div>

              {/* Locations */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <label className="font-medium text-sm">Locations</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc) => (
                    <NewsChip
                      key={loc}
                      onClick={() => toggleValue("locations", loc)}
                      selected={isChecked("locations", loc)}
                      variant={isChecked("locations", loc) ? "primary" : "outline"}
                      size="sm"
                      animated
                    >
                      {loc}
                    </NewsChip>
                  ))}
                  {locations.length === 0 && (
                    <span className="text-xs text-muted-foreground">No locations available</span>
                  )}
                </div>
              </div>

              {/* Clear Selection */}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => {
                    onChange({ type: "all" });
                    setSelectedPreset("everyone");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all selections
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scheduling Options */}
      {showScheduling && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandedSection(expandedSection === "schedule" ? null : "schedule")}
            className="w-full flex items-center justify-between p-4 bg-card rounded-xl hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-editorial-teal" />
              <span className="font-semibold">Scheduling</span>
              {scheduledDate && (
                <span className="text-xs px-2 py-1 bg-editorial-teal/10 text-editorial-teal rounded-full">
                  Scheduled
                </span>
              )}
            </div>
            <ChevronRight
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                expandedSection === "schedule" && "rotate-90"
              )}
            />
          </button>

          <AnimatePresence>
            {expandedSection === "schedule" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 bg-muted/30 rounded-xl space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Clock className="inline w-4 h-4 mr-1" />
                      Publish Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-blue-700 dark:text-blue-300">
                    Posts scheduled during work hours get 40% more engagement
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Notification Channels */}
      {showNotifications && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandedSection(expandedSection === "notify" ? null : "notify")}
            className="w-full flex items-center justify-between p-4 bg-card rounded-xl hover:bg-muted/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-editorial-orange" />
              <span className="font-semibold">Notifications</span>
              <div className="flex gap-1">
                {sendEmail && (
                  <span className="text-xs px-2 py-1 bg-editorial-orange/10 text-editorial-orange rounded-full">
                    Email
                  </span>
                )}
                {sendSlack && (
                  <span className="text-xs px-2 py-1 bg-editorial-orange/10 text-editorial-orange rounded-full">
                    Slack
                  </span>
                )}
              </div>
            </div>
            <ChevronRight
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                expandedSection === "notify" && "rotate-90"
              )}
            />
          </button>

          <AnimatePresence>
            {expandedSection === "notify" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 bg-muted/30 rounded-xl space-y-3 overflow-hidden"
              >
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Email Notification</p>
                    <p className="text-xs text-muted-foreground">Send to all email addresses</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={sendSlack}
                    onChange={(e) => setSendSlack(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Slack Notification</p>
                    <p className="text-xs text-muted-foreground">Post to #general channel</p>
                  </div>
                </label>

                <div className="pt-3 border-t border-border">
                  <button className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Plus className="w-4 h-4" />
                    Add custom notification channel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Campaign Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20"
      >
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Campaign Ready!</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Your news will reach <span className="font-semibold text-foreground">{calculateEstimatedReach()}</span>
          {scheduledDate && ` on ${new Date(scheduledDate).toLocaleDateString()}`}
          {sendEmail && " via email"}
          {sendEmail && sendSlack && " and"}
          {sendSlack && " Slack"}.
        </p>
      </motion.div>
    </div>
  );
}
