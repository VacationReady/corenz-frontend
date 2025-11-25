"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  CreditCard,
  Users,
  TrendingUp,
  Clock,
  Cake,
  ChevronRight,
  Shield,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InsightData {
  label: string;
  value: string;
}

interface EmergencyContactData {
  id: string;
  name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface OverviewClientProps {
  employeeId: string;
  employeeName: string;
  email: string;
  phoneNumber: string | null;
  startDate: string;
  isActive: boolean;
  departmentName: string | null;
  managerName: string | null;
  location: string | null;
  bankAccountNumber: string | null;
  irdNumber: string | null;
  kiwiSaverContribution: number | null;
  formattedSalary: string | null;
  formattedHourlyRate: string | null;
  kiwiSaverStatus: string;
  emergencyContacts: EmergencyContactData[];
  insights: InsightData[];
  canSeeBankPayrollOverview: boolean;
  isAdmin: boolean;
  leaveBalanceComponent: React.ReactNode;
  profileAvatar: React.ReactNode;
}

// Modern Quick Info Card
function QuickInfoCard({
  href,
  title,
  icon: Icon,
  iconColor,
  children,
  delay = 0,
}: {
  href: string;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link
        href={href}
        className="group block focus:outline-none"
      >
        <div className={cn(
          "glass-card rounded-2xl overflow-hidden shadow-depth-2 h-full",
          "transition-all duration-300",
          "hover:shadow-depth-3 hover:scale-[1.02]",
          "group-focus-visible:ring-2 group-focus-visible:ring-primary/50"
        )}>
          {/* Header */}
          <div className="relative px-5 py-4 border-b border-white/20 dark:border-white/10">
            <div className={cn(
              "absolute inset-0 opacity-50 pointer-events-none",
              "bg-gradient-to-r",
              iconColor
            )} style={{ opacity: 0.05 }} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl",
                  "bg-gradient-to-br shadow-sm",
                  iconColor
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
          
          {/* Content */}
          <div className="p-5">
            {children}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Info Row Component
function InfoRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

export default function OverviewClient({
  employeeId,
  employeeName,
  email,
  phoneNumber,
  startDate,
  isActive,
  departmentName,
  managerName,
  location,
  bankAccountNumber,
  irdNumber,
  kiwiSaverContribution,
  formattedSalary,
  formattedHourlyRate,
  kiwiSaverStatus,
  emergencyContacts,
  insights,
  canSeeBankPayrollOverview,
  isAdmin,
  leaveBalanceComponent,
  profileAvatar,
}: OverviewClientProps) {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        {profileAvatar}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{employeeName}</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2 mt-1">
            <Mail className="w-4 h-4" />
            {email}
          </p>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {insights.map((insight, index) => (
          <div
            key={insight.label}
            className="glass-subtle rounded-xl p-4 text-center"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{insight.label}</p>
            <p className="text-sm font-semibold text-foreground">{insight.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contact Info */}
        <QuickInfoCard
          href={`/employees/${employeeId}/personal-information`}
          title="Contact Info"
          icon={Mail}
          iconColor="from-violet-500 to-purple-500"
          delay={0.15}
        >
          <div className="space-y-1">
            <InfoRow label="Email" value={email} />
            <InfoRow label="Phone" value={phoneNumber || "Not provided"} />
          </div>
        </QuickInfoCard>

        {/* Employment Details */}
        <QuickInfoCard
          href={`/employees/${employeeId}/employment-details`}
          title="Employment"
          icon={Briefcase}
          iconColor="from-emerald-500 to-teal-500"
          delay={0.2}
        >
          <div className="space-y-1">
            <InfoRow label="Start date" value={startDate} />
            <InfoRow 
              label="Status" 
              value={
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  isActive 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              } 
            />
            <InfoRow label="Department" value={departmentName || "N/A"} />
            <InfoRow label="Manager" value={managerName || "N/A"} />
            <InfoRow label="Location" value={location || "N/A"} />
          </div>
        </QuickInfoCard>

        {/* Bank & Payroll */}
        <QuickInfoCard
          href={`/employees/${employeeId}/bank-payroll`}
          title="Bank & Payroll"
          icon={CreditCard}
          iconColor="from-amber-500 to-orange-500"
          delay={0.25}
        >
          <TooltipProvider>
            {canSeeBankPayrollOverview ? (
              <div className="space-y-1">
                <InfoRow label="Bank account" value={bankAccountNumber || "Not provided"} />
                <InfoRow label="IRD number" value={irdNumber || "Not provided"} />
                <InfoRow 
                  label="KiwiSaver" 
                  value={kiwiSaverContribution !== null ? `${kiwiSaverContribution}%` : "Not provided"} 
                />
                {isAdmin && (
                  <>
                    <InfoRow 
                      label="Salary" 
                      value={formattedSalary ?? "Not provided"} 
                    />
                    <InfoRow 
                      label="Hourly rate" 
                      value={formattedHourlyRate ?? "Not provided"} 
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4">
                <Shield className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Access Restricted</p>
                  <p className="text-xs text-muted-foreground">Contact an administrator</p>
                </div>
              </div>
            )}
          </TooltipProvider>
        </QuickInfoCard>

        {/* Emergency Contacts */}
        <QuickInfoCard
          href={`/employees/${employeeId}/emergency-contacts`}
          title="Emergency Contacts"
          icon={Phone}
          iconColor="from-rose-500 to-pink-500"
          delay={0.3}
        >
          {emergencyContacts.length > 0 ? (
            <div className="space-y-3">
              {emergencyContacts.slice(0, 2).map((contact) => (
                <div key={contact.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {contact.name}
                      {contact.relationship && (
                        <span className="text-muted-foreground font-normal"> • {contact.relationship}</span>
                      )}
                    </p>
                    {contact.phone && (
                      <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                    )}
                  </div>
                </div>
              ))}
              {emergencyContacts.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{emergencyContacts.length - 2} more contacts
                </p>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No contacts recorded</p>
            </div>
          )}
        </QuickInfoCard>

        {/* Leave Balances - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="md:col-span-2"
        >
          <div className="glass-card rounded-2xl overflow-hidden shadow-depth-2">
            <div className="relative px-5 py-4 border-b border-white/20 dark:border-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 pointer-events-none" />
              <div className="relative flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">Leave Balances</h3>
              </div>
            </div>
            <div className="p-5">
              {leaveBalanceComponent}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

