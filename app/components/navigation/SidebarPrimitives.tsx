"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronRight, LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Sidebar container with glass morphism
interface SidebarContainerProps {
  children: React.ReactNode;
  collapsed?: boolean;
  variant?: "desktop" | "mobile";
  className?: string;
}

export function SidebarContainer({
  children,
  collapsed = false,
  variant = "desktop",
  className,
}: SidebarContainerProps) {
  const baseClasses = clsx(
    "flex flex-col h-full transition-premium",
    variant === "mobile" ? "w-full" : collapsed ? "w-20" : "w-72",
    className
  );

  const containerClasses = clsx(
    "glass-strong rounded-3xl shadow-depth-2 flex flex-col h-full overflow-hidden",
    variant === "mobile" && "rounded-none h-screen"
  );

  return (
    <div className={baseClasses}>
      <div className={containerClasses}>
        {children}
      </div>
    </div>
  );
}

// Sidebar header with branding
interface SidebarHeaderProps {
  logo?: React.ReactNode;
  title?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  variant?: "desktop" | "mobile";
}

export function SidebarHeader({
  logo,
  title,
  collapsed = false,
  onToggle,
  onClose,
  variant = "desktop",
}: SidebarHeaderProps) {
  return (
    <div className={clsx(
      "glass-subtle border-b border-glass flex items-center justify-between",
      variant === "mobile" ? "px-6 py-6" : collapsed ? "px-4 py-6" : "px-6 py-6"
    )}>
      <div className={clsx(
        "flex items-center gap-3 transition-all duration-300",
        collapsed && "justify-center"
      )}>
        {logo && (
          <div className="flex-shrink-0 w-10 h-10">
            {logo}
          </div>
        )}
        {!collapsed && title && (
          <h1 className="font-semibold text-xl text-foreground truncate">
            {title}
          </h1>
        )}
      </div>
      
      {variant === "desktop" && onToggle && (
        <button
          onClick={onToggle}
          className="glass-subtle p-2 rounded-xl hover-glass transition-glass"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight className={clsx(
            "w-5 h-5 transition-transform",
            !collapsed && "rotate-180"
          )} />
        </button>
      )}
      
      {variant === "mobile" && onClose && (
        <button
          onClick={onClose}
          className="glass-subtle p-2 rounded-xl hover-glass transition-glass"
          aria-label="Close navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Navigation section
interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsed?: boolean;
}

export function SidebarSection({
  title,
  children,
  collapsed = false,
}: SidebarSectionProps) {
  return (
    <div className="py-4">
      {title && !collapsed && (
        <h3 className="px-6 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <nav className="space-y-1 px-3">
        {children}
      </nav>
    </div>
  );
}

// Navigation item
interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: string | number;
  collapsed?: boolean;
  onClick?: () => void;
  exact?: boolean;
}

export function SidebarItem({
  href,
  icon: Icon,
  label,
  badge,
  collapsed = false,
  onClick,
  exact = false,
}: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname?.startsWith(href);

  const content = (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "group flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-glass",
        isActive
          ? "glass-strong text-primary shadow-depth-1"
          : "text-foreground hover:glass-subtle hover:text-foreground",
        collapsed && "justify-center"
      )}
    >
      <Icon className={clsx(
        "flex-shrink-0 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        collapsed ? "w-6 h-6" : "w-5 h-5"
      )} />
      
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && (
            <span className={clsx(
              "glass-subtle px-2.5 py-0.5 text-sm rounded-full",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="glass-ultra">
            <p>{label}</p>
            {badge !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">({badge})</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// Action button (logout, settings, etc.)
interface SidebarActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  collapsed?: boolean;
  variant?: "default" | "danger";
}

export function SidebarAction({
  icon: Icon,
  label,
  onClick,
  collapsed = false,
  variant = "default",
}: SidebarActionProps) {
  const variantClasses = {
    default: "text-foreground hover:glass-subtle",
    danger: "text-destructive hover:bg-destructive/10",
  }[variant];

  const button = (
    <button
      onClick={onClick}
      className={clsx(
        "group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-glass",
        variantClasses,
        collapsed && "justify-center"
      )}
    >
      <Icon className={clsx(
        "flex-shrink-0",
        collapsed ? "w-6 h-6" : "w-5 h-5"
      )} />
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="glass-ultra">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

// User profile section
interface SidebarProfileProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  collapsed?: boolean;
}

export function SidebarProfile({
  user,
  collapsed = false,
}: SidebarProfileProps) {
  return (
    <div className={clsx(
      "glass-subtle border-t border-glass p-4",
      collapsed && "flex justify-center"
    )}>
      <div className={clsx(
        "flex items-center gap-3",
        collapsed && "justify-center"
      )}>
        <div className="flex-shrink-0">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-8 h-8 rounded-full glass-subtle"
            />
          ) : (
            <div className="w-8 h-8 rounded-full glass-strong flex items-center justify-center text-xs font-semibold">
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
          )}
        </div>
        
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-foreground truncate">
              {user.name || user.email || "User"}
            </p>
            {user.role && (
              <p className="text-sm text-muted-foreground capitalize">
                {user.role.toLowerCase()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Footer section for version or copyright
interface SidebarFooterProps {
  children: React.ReactNode;
  collapsed?: boolean;
}

export function SidebarFooter({
  children,
  collapsed = false,
}: SidebarFooterProps) {
  return (
    <div className={clsx(
      "mt-auto glass-subtle border-t border-glass p-4",
      collapsed && "text-center"
    )}>
      {children}
    </div>
  );
}
