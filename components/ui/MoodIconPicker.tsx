"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Smile,
  Frown,
  Meh,
  Laugh,
  Angry,
  Heart,
  HeartCrack,
  ThumbsUp,
  ThumbsDown,
  Star,
  CircleCheck,
  CircleX,
  CircleAlert,
  CircleMinus,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Trophy,
  Medal,
  Sparkles,
  Flame,
  Zap,
  Sun,
  Cloud,
  CloudRain,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Curated mood/rating icons organized by category
const MOOD_ICONS: { category: string; icons: { name: string; icon: LucideIcon; label: string }[] }[] = [
  {
    category: "Faces",
    icons: [
      { name: "Laugh", icon: Laugh, label: "Very Happy" },
      { name: "Smile", icon: Smile, label: "Happy" },
      { name: "Meh", icon: Meh, label: "Neutral" },
      { name: "Frown", icon: Frown, label: "Sad" },
      { name: "Angry", icon: Angry, label: "Angry" },
    ],
  },
  {
    category: "Sentiment",
    icons: [
      { name: "ThumbsUp", icon: ThumbsUp, label: "Positive" },
      { name: "ThumbsDown", icon: ThumbsDown, label: "Negative" },
      { name: "Heart", icon: Heart, label: "Love" },
      { name: "HeartCrack", icon: HeartCrack, label: "Heartbreak" },
    ],
  },
  {
    category: "Status",
    icons: [
      { name: "CircleCheck", icon: CircleCheck, label: "Success" },
      { name: "CircleX", icon: CircleX, label: "Failed" },
      { name: "CircleAlert", icon: CircleAlert, label: "Warning" },
      { name: "CircleMinus", icon: CircleMinus, label: "Neutral" },
    ],
  },
  {
    category: "Trends",
    icons: [
      { name: "TrendingUp", icon: TrendingUp, label: "Improving" },
      { name: "Minus", icon: Minus, label: "Stable" },
      { name: "TrendingDown", icon: TrendingDown, label: "Declining" },
    ],
  },
  {
    category: "Rating",
    icons: [
      { name: "Star", icon: Star, label: "Star" },
      { name: "Trophy", icon: Trophy, label: "Trophy" },
      { name: "Award", icon: Award, label: "Award" },
      { name: "Medal", icon: Medal, label: "Medal" },
    ],
  },
  {
    category: "Energy",
    icons: [
      { name: "Sparkles", icon: Sparkles, label: "Excellent" },
      { name: "Flame", icon: Flame, label: "Hot" },
      { name: "Zap", icon: Zap, label: "Electric" },
      { name: "Sun", icon: Sun, label: "Bright" },
      { name: "Cloud", icon: Cloud, label: "Cloudy" },
      { name: "CloudRain", icon: CloudRain, label: "Rainy" },
    ],
  },
];

// Flat map for quick lookup
const ICON_MAP: Record<string, LucideIcon> = {};
MOOD_ICONS.forEach(cat => {
  cat.icons.forEach(({ name, icon }) => {
    ICON_MAP[name] = icon;
  });
});

export function getIconByName(name: string): LucideIcon | null {
  return ICON_MAP[name] || null;
}

interface MoodIconPickerProps {
  value?: string;
  onChange: (iconName: string | undefined) => void;
  className?: string;
}

export function MoodIconPicker({ value, onChange, className }: MoodIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const SelectedIcon = value ? ICON_MAP[value] : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg border-2 transition-all",
          value
            ? "border-primary bg-primary/5 text-primary"
            : "border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600"
        )}
        title={value ? `Icon: ${value}` : "Add icon"}
      >
        {SelectedIcon ? (
          <SelectedIcon className="h-4 w-4" />
        ) : (
          <span className="text-xs font-medium">+</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 p-2 max-h-72 overflow-y-auto">
          {/* Clear option */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded mb-1"
            >
              Remove icon
            </button>
          )}

          {MOOD_ICONS.map((category) => (
            <div key={category.category} className="mb-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium px-1 mb-1">
                {category.category}
              </p>
              <div className="flex flex-wrap gap-1">
                {category.icons.map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onChange(name);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "p-1.5 rounded transition-all",
                      value === name
                        ? "bg-primary text-white"
                        : "hover:bg-slate-100 text-slate-600"
                    )}
                    title={label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component to render an icon by name
export function MoodIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}
